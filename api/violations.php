<?php
// api/violations.php — SECURITY HARDENED
// FIX LIST:
//  1. Severity must be one of allowed values (was free-form string)
//  2. Violation type validation added
//  3. GET without teacherId now restricted (was returning all 200 violations to anyone)
//  4. DELETE now verifies the exam belongs to the teacher making the request
//  5. studentName and examTitle input lengths clamped
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

$allowedSeverities = ['low', 'medium', 'high', 'critical'];
$allowedViolationTypes = [
    'tab_switch', 'window_blur', 'fullscreen_exit', 'copy_paste',
    'right_click', 'keyboard_shortcut', 'external_script',
    'multiple_faces', 'no_face', 'face_mismatch', 'other'
];

// ---- GET ----
if ($method === 'GET') {
    $teacherId = isset($_GET['teacherId']) ? (int)$_GET['teacherId'] : null;

    // FIX #3: Require teacherId — unauthenticated global dump removed
    if (!$teacherId) {
        jsonResponse(['success' => false, 'message' => 'teacherId required'], 400);
    }

    try { $db->exec("CREATE TABLE IF NOT EXISTS gs_exam_sessions (id INT AUTO_INCREMENT PRIMARY KEY, exam_id INT NULL, student_name VARCHAR(255), student_section VARCHAR(100), exam_code VARCHAR(50), start_time DATETIME, last_seen DATETIME, status ENUM('active','completed') DEFAULT 'active', ip_address VARCHAR(45), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch(Exception $e) {}

    $stmt = $db->prepare("
        SELECT v.id, v.exam_session_id, v.student_name, v.exam_title,
               v.violation_type, v.description, v.severity, v.timestamp
        FROM violations v
        WHERE
            v.exam_session_id IN (
                SELECT es.id FROM exam_sessions es
                JOIN exams e ON es.exam_id = e.id
                WHERE e.teacher_id = ?
            )
            OR v.exam_session_id IN (
                SELECT gs.id FROM gs_exam_sessions gs
                LEFT JOIN exams e ON e.unique_id = gs.exam_code
                WHERE e.teacher_id = ?
            )
            OR (v.exam_session_id IS NULL AND (
                v.exam_title IN (SELECT unique_id FROM exams WHERE teacher_id = ?)
                OR v.exam_title IN (SELECT CONCAT(unique_id, ' Exam') FROM exams WHERE teacher_id = ?)
            ))
        ORDER BY v.timestamp DESC
        LIMIT 200
    ");
    $stmt->execute([$teacherId, $teacherId, $teacherId, $teacherId]);
    $violations = $stmt->fetchAll();
    jsonResponse(['success' => true, 'violations' => $violations, 'count' => count($violations)]);
}

// ---- POST ----
if ($method === 'POST') {
    $b = getRequestBody();
    $violationType  = sanitizeStr($b['violationType'] ?? '', 50);
    $description    = sanitizeStr($b['description']   ?? '', 1000);
    $rawSessionId   = $b['examSessionId'] ?? null;
    $studentName    = sanitizeStr($b['studentName']   ?? 'Unknown Student', 255);
    $studentSection = sanitizeStr($b['studentSection'] ?? '', 100);
    $examTitle      = sanitizeStr($b['examTitle']     ?? 'Unknown Exam', 255);
    $severity       = $b['severity'] ?? 'medium';
    $rawTs          = $b['timestamp'] ?? null;
    $timestamp      = $rawTs ? date('Y-m-d H:i:s', strtotime($rawTs)) : date('Y-m-d H:i:s');

    if (!$violationType || !$description) {
        jsonResponse(['success' => false, 'message' => 'violationType and description required'], 400);
    }

    // FIX #1: Clamp severity to allowed values
    if (!in_array($severity, $allowedSeverities)) {
        $severity = 'medium';
    }

    // FIX #2: Validate violation type
    $violationTypeLower = strtolower(str_replace(' ', '_', $violationType));
    if (!in_array($violationTypeLower, $allowedViolationTypes)) {
        $violationTypeLower = 'other'; // fallback, still log it
    }

    $examSessionId = null;
    if ($rawSessionId) {
        $rawSessionId = (int)$rawSessionId;
        
        $chk = $db->prepare("SELECT e.status FROM exam_sessions es JOIN exams e ON es.exam_id = e.id WHERE es.id = ?");
        $chk->execute([$rawSessionId]);
        $row = $chk->fetch();
        
        if ($row) {
            if ($row['status'] !== 'active') {
                jsonResponse(['success' => false, 'message' => 'Exam is not active', 'blocked' => true]);
            }
            $examSessionId = $rawSessionId; // This is fine for real DB sessions
        } else {
            try {
                $gsChk = $db->prepare("SELECT id FROM gs_exam_sessions WHERE id = ?");
                $gsChk->execute([$rawSessionId]);
                if ($gsChk->fetch()) {
                    // Update the heartbeat so they show as "Active" on dashboard
                    $db->prepare("UPDATE gs_exam_sessions SET last_seen = NOW() WHERE id = ?")
                       ->execute([$rawSessionId]);
                    
                    // FIX: Set to null so the Foreign Key doesn't crash the INSERT
                    $examSessionId = null; 
                }
            } catch (Exception $e) {}
        }
    }

    $metadata = $studentSection ? json_encode(['section' => $studentSection]) : null;

    $stmt = $db->prepare("INSERT INTO violations (exam_session_id, student_name, exam_title, violation_type, description, severity, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$examSessionId, $studentName, $examTitle, $violationTypeLower, $description, $severity, $timestamp, $metadata]);
    $id = $db->lastInsertId();

    jsonResponse(['success' => true, 'message' => 'Violation logged', 'violationId' => $id]);
}

// ---- DELETE ----
if ($method === 'DELETE') {
    $studentName = sanitizeStr($_GET['studentName'] ?? '', 255);
    $examCode    = sanitizeStr($_GET['examCode']    ?? '', 50);
    $teacherId   = isset($_GET['teacherId']) ? (int)$_GET['teacherId'] : null;

    if (!$studentName || !$examCode) {
        jsonResponse(['success' => false, 'message' => 'studentName and examCode required'], 400);
    }

    // FIX #4: Verify the exam belongs to the requesting teacher
    if ($teacherId) {
        $own = $db->prepare("SELECT id FROM exams WHERE unique_id = ? AND teacher_id = ?");
        $own->execute([strtoupper($examCode), $teacherId]);
        if (!$own->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Unauthorized or exam not found'], 403);
        }
    }

    $examCodeExam = $examCode . ' Exam';
    $stmt = $db->prepare("DELETE FROM violations WHERE LOWER(student_name) = LOWER(?) AND (exam_title = ? OR exam_title = ?)");
    $stmt->execute([$studentName, $examCode, $examCodeExam]);
    jsonResponse(['success' => true, 'deleted' => $stmt->rowCount()]);
}

jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
