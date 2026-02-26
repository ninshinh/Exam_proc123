<?php
/**
 * api/exam_sessions.php — FULL FIX v3
 * FIX: Legacy fallback now pulls ALL students from gs_exam_sessions,
 *      not just ones with violations — so every student who entered is counted.
 * All timestamps returned in UTC+8
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── Ensure GAS sessions table exists ──────────────────────────────────────────
$db->exec("CREATE TABLE IF NOT EXISTS gs_exam_sessions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    exam_id     INT NULL,
    student_name VARCHAR(255) NOT NULL,
    student_section VARCHAR(100) DEFAULT '',
    exam_code   VARCHAR(50) NOT NULL,
    start_time  DATETIME NOT NULL,
    last_seen   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status      ENUM('active','completed') DEFAULT 'active',
    ip_address  VARCHAR(45) DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_gs_code (exam_code),
    KEY idx_gs_student (student_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// ── Helper: convert UTC datetime string → Asia/Manila ────────────────────────
// Simplify this in exam_sessions.php
function toUtc8(?string $dt): ?string {
    return $dt; // Just return the time because it's already in PHT (+08:00)
}

// ---- GET ----
if ($method === 'GET') {
    $teacherId = $_GET['teacherId'] ?? null;
    if (!$teacherId) jsonResponse(['success' => false, 'message' => 'teacherId required'], 400);

    // ── 1. Real DB sessions ───────────────────────────────────────────────────
    $stmt = $db->prepare("
        SELECT es.id, es.exam_id, e.title as exam_title, e.unique_id as exam_unique_id,
               e.duration_minutes, e.status as exam_status,
               s.name as student_name, s.student_id, es.start_time, es.end_time, es.status,
               es.ip_address, 0 as is_google_sheets,
               (SELECT COUNT(*) FROM violations WHERE exam_session_id = es.id) as violation_count
        FROM exam_sessions es
        JOIN exams e ON es.exam_id = e.id
        JOIN students s ON es.student_id = s.id
        WHERE e.teacher_id = ?
          AND (e.status = 'active' OR e.status = 'completed' OR e.status = 'reopened')
        ORDER BY es.status ASC, es.start_time DESC
    ");
    $stmt->execute([$teacherId]);
    $realSessions = $stmt->fetchAll();

    // ── 2. GAS sessions (gs_exam_sessions table) ──────────────────────────────
    // These are students who entered via the Google Sheets / login flow.
    // Include ALL of them — even those with zero violations.
    $stmt2 = $db->prepare("
        SELECT gs.id, gs.exam_id, e.title as exam_title, e.unique_id as exam_unique_id,
               e.duration_minutes, e.status as exam_status,
               gs.student_name, gs.student_section as student_id,
               gs.start_time, gs.last_seen as end_time, gs.status, gs.ip_address,
               1 as is_google_sheets,
               (SELECT COUNT(*) FROM violations v
                WHERE v.exam_session_id = gs.id
                   OR (v.exam_session_id IS NULL
                       AND LOWER(v.student_name) = LOWER(gs.student_name)
                       AND (v.exam_title = gs.exam_code
                            OR v.exam_title = CONCAT(gs.exam_code, ' Exam')
                            OR UPPER(v.exam_title) = gs.exam_code))
               ) as violation_count
        FROM gs_exam_sessions gs
        LEFT JOIN exams e ON UPPER(e.unique_id) = UPPER(gs.exam_code)
        WHERE e.teacher_id = ?
        ORDER BY gs.status ASC, gs.start_time DESC
    ");
    $stmt2->execute([$teacherId]);
    $gsSessions = $stmt2->fetchAll();

    // ── 3. Legacy fallback ────────────────────────────────────────────────────
    // Catches students who have violations logged but NO gs_exam_sessions record
    // (e.g. recorded before gs_exam_sessions table existed).
    // FIX: Only use this as a fallback for genuinely missing students —
    //      do NOT use violations as the primary source (that excludes clean students).
    $stmt3 = $db->prepare("
        SELECT
            CONCAT('GS_', MD5(CONCAT(v.student_name, '_', v.exam_title))) as id,
            NULL as exam_id,
            e.unique_id as exam_unique_id,
            e.title as exam_title,
            60 as duration_minutes,
            e.status as exam_status,
            v.student_name,
            '' as student_id,
            MIN(v.timestamp) as start_time,
            MAX(v.timestamp) as end_time,
            'completed' as status,
            NULL as ip_address,
            1 as is_google_sheets,
            COUNT(*) as violation_count
        FROM violations v
        JOIN exams e ON (
            e.unique_id = v.exam_title
            OR CONCAT(e.unique_id, ' Exam') = v.exam_title
            OR e.unique_id = UPPER(v.exam_title)
        )
        WHERE v.exam_session_id IS NULL
          AND e.teacher_id = ?
          AND (e.status = 'active' OR e.status = 'completed' OR e.status = 'reopened')
          -- Only include if NOT already present in gs_exam_sessions
          AND NOT EXISTS (
            SELECT 1 FROM gs_exam_sessions gs
            WHERE LOWER(gs.student_name) = LOWER(v.student_name)
              AND gs.exam_code = e.unique_id
          )
        GROUP BY v.student_name, v.exam_title, e.unique_id, e.title, e.status
        ORDER BY MIN(v.timestamp) DESC
    ");
    $stmt3->execute([$teacherId]);
    $legacyGS = $stmt3->fetchAll();

    // ── Merge all sources ─────────────────────────────────────────────────────
    $all = array_merge($realSessions, $gsSessions, $legacyGS);

    // Convert timestamps to UTC+8 for display
    foreach ($all as &$s) {
        $s['start_time_utc8'] = toUtc8($s['start_time'] ?? null);
        $s['end_time_utc8']   = !empty($s['end_time']) ? toUtc8($s['end_time']) : null;
    }
    unset($s);

    // Sort: active first, then by start_time descending
    // Sort: newest start_time first regardless of status
    usort($all, function($a, $b) {
        $tA = !empty($a['start_time']) ? strtotime($a['start_time']) : 0;
        $tB = !empty($b['start_time']) ? strtotime($b['start_time']) : 0;
        return $tB - $tA; // newest first
    });

    jsonResponse(['success' => true, 'sessions' => $all, 'count' => count($all)]);
}

// ---- POST ----
if ($method === 'POST') {
    $b      = getRequestBody();
    $action = $b['action'] ?? '';

    // GAS exam session END
    if ($action === 'gs_end') {
        $gsSessionId = (int)($b['gsSessionId'] ?? 0);
        if ($gsSessionId) {
            try {
                $db->prepare("UPDATE gs_exam_sessions SET status = 'completed', last_seen = NOW() WHERE id = ?")
                   ->execute([$gsSessionId]);
            } catch (Exception $e) {}
        }
        jsonResponse(['success' => true]);
    }

    // Mark real DB session as completed (called on exam submission to prevent retake)
    if ($action === 'complete_session') {
        $sessionId    = isset($b['sessionId'])    ? (int)$b['sessionId'] : null;
        $sessionToken = $b['sessionToken'] ?? null;
        if ($sessionId) {
            $db->prepare("UPDATE exam_sessions SET status = 'completed', end_time = CURRENT_TIMESTAMP WHERE id = ?")
               ->execute([$sessionId]);
        } elseif ($sessionToken) {
            $db->prepare("UPDATE exam_sessions SET status = 'completed', end_time = CURRENT_TIMESTAMP WHERE session_token = ?")
               ->execute([$sessionToken]);
        }
        jsonResponse(['success' => true]);
    }

    // GAS exam session registration / keepalive
    if ($action === 'gs_start') {
        $studentName    = trim($b['studentName']    ?? '');
        $studentSection = trim($b['studentSection'] ?? '');
        $examCode       = strtoupper(trim($b['examCode'] ?? ''));
        $startTime      = $b['startTime'] ?? null;

        if (!$studentName || !$examCode) {
            jsonResponse(['success' => false, 'message' => 'studentName and examCode required'], 400);
        }

        $startMysql = $startTime ? date('Y-m-d H:i:s', strtotime($startTime)) : date('Y-m-d H:i:s');
        $ip         = $_SERVER['REMOTE_ADDR'] ?? null;

        $examRow = $db->prepare("SELECT id, status FROM exams WHERE unique_id = ?");
        $examRow->execute([$examCode]);
        $exam   = $examRow->fetch();
        $examId = $exam ? $exam['id'] : null;

        if (!$exam || !in_array($exam['status'], ['active', 'reopened'])) {
            jsonResponse(['success' => false, 'message' => 'Exam is not currently active', 'blocked' => true]);
        }

        // Check for existing active session within 8 hours (keepalive)
        $existing = $db->prepare(
            "SELECT id FROM gs_exam_sessions
             WHERE LOWER(student_name) = LOWER(?) AND exam_code = ?
               AND start_time > DATE_SUB(NOW(), INTERVAL 8 HOUR)
               AND status = 'active'"
        );
        $existing->execute([$studentName, $examCode]);
        $row = $existing->fetch();

        if ($row) {
            $db->prepare("UPDATE gs_exam_sessions SET last_seen = NOW() WHERE id = ?")
               ->execute([$row['id']]);
            jsonResponse(['success' => true, 'gsSessionId' => $row['id'], 'action' => 'updated']);
        } else {
            $ins = $db->prepare(
                "INSERT INTO gs_exam_sessions
                    (exam_id, student_name, student_section, exam_code, start_time, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?)"
            );
            $ins->execute([$examId, $studentName, $studentSection, $examCode, $startMysql, $ip]);
            $gsId = $db->lastInsertId();
            jsonResponse(['success' => true, 'gsSessionId' => $gsId, 'action' => 'created']);
        }
    }

    // Real DB session creation
    $examId       = $b['examId']       ?? null;
    $studentId    = $b['studentId']    ?? null;
    $sessionToken = $b['sessionToken'] ?? null;

    if (!$examId || !$studentId) {
        jsonResponse(['success' => false, 'message' => 'examId and studentId required'], 400);
    }

    $chk = $db->prepare("SELECT status FROM exams WHERE id = ?");
    $chk->execute([$examId]);
    $examRow = $chk->fetch();
    if (!$examRow || !in_array($examRow['status'], ['active', 'reopened'])) {
        jsonResponse(['success' => false, 'message' => 'Exam is not currently active'], 403);
    }

    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

    $stmt = $db->prepare(
        "INSERT INTO exam_sessions (exam_id, student_id, session_token, ip_address, user_agent, status)
         VALUES (?, ?, ?, ?, ?, 'active')"
    );
    $stmt->execute([$examId, $studentId, $sessionToken, $ip, $ua]);
    $id = $db->lastInsertId();

    jsonResponse(['success' => true, 'message' => 'Session created', 'sessionId' => $id]);
}

// ---- DELETE ----
if ($method === 'DELETE') {
    $studentName = $_GET['studentName'] ?? null;
    $examCode    = strtoupper(trim($_GET['examCode'] ?? ''));
    if (!$studentName || !$examCode) {
        jsonResponse(['success' => false, 'message' => 'studentName and examCode required'], 400);
    }
    try {
        $db->prepare("DELETE FROM gs_exam_sessions WHERE LOWER(student_name) = LOWER(?) AND exam_code = ?")
           ->execute([$studentName, $examCode]);
    } catch (Exception $e) {}
    jsonResponse(['success' => true]);
}

jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);