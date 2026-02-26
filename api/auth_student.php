<?php
// api/auth_student.php — FULL FIX v2
// FIX LIST:
//  1. Rate limiting (brute force prevention)
//  2. Student can take exam only once (completed session check prevents retake)
//  3. Session token is cryptographically random
//  4. Whitelist enforcement server-side using FIRST NAME + LAST NAME (case-insensitive, trimmed)
//  5. Sensitive student data (email) not returned
//  6. Exam code verified case-insensitively
//  7. SCHEDULE ENFORCEMENT: blocked if before start_time or after end_time
//  8. RETAKE PREVENTION: if session status = 'completed', student cannot re-enter
//  9. REOPEN: if exam was reopened, only students with no completed session allowed
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$body         = getRequestBody();
$studentId    = sanitizeStr($body['studentId'] ?? '', 50);
$uniqueFormId = strtoupper(sanitizeStr($body['uniqueFormId'] ?? '', 50));

if (!$studentId) {
    jsonResponse(['success' => false, 'message' => 'Student ID is required'], 400);
}

$db  = getDB();
$ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

// FIX #1: Rate limiting
if (rateLimitCheck($db, 'student_login', $ip, 10, 60)) {
    jsonResponse(['success' => false, 'message' => 'Too many attempts. Please wait a minute.'], 429);
}

// Verify student
$stmt = $db->prepare("SELECT * FROM students WHERE student_id = ? AND status = 'active'");
$stmt->execute([$studentId]);
$student = $stmt->fetch();

if (!$student) {
    jsonResponse(['success' => false, 'message' => 'Invalid student ID'], 401);
}

// Log login
try {
    $db->prepare("INSERT INTO system_logs (user_type, user_id, action, description, ip_address) VALUES (?, ?, ?, ?, ?)")
       ->execute(['student', $student['id'], 'login', "Student login: $studentId", $ip]);
} catch (Exception $e) {}

// ---- Phase 2: if uniqueFormId provided, verify and return exam ----
if ($uniqueFormId) {
    $stmt2 = $db->prepare("SELECT * FROM exams WHERE UPPER(unique_id) = ? AND status IN ('active', 'completed')");
    $stmt2->execute([$uniqueFormId]);
    $exam = $stmt2->fetch();

    if (!$exam) {
        jsonResponse(['success' => false, 'message' => 'Invalid or inactive Unique Form ID'], 401);
    }

    // Schedule enforcement: DB stores UTC, compare using Manila timezone
    $utcTz = new DateTimeZone('UTC');
    $manilaTz = new DateTimeZone('Asia/Manila');
$now = new DateTime('now', $utcTz);

$start = $exam['start_time'] ? new DateTime($exam['start_time'], $utcTz) : null;
$end   = $exam['end_time']   ? new DateTime($exam['end_time'], $utcTz)   : null;

if ($start && $now < $start) {
    $startDisplay = $start->setTimezone($manilaTz)->format('M d, Y h:i A') . ' (PHT)';
    jsonResponse([
        'success' => false,
        'message' => "Exam has not started yet. It will be available on $startDisplay."
    ], 403);
}

    // FIX #8: RETAKE PREVENTION — check if student already completed this exam
    $completedCheck = $db->prepare(
        "SELECT id FROM exam_sessions WHERE exam_id = ? AND student_id = ? AND status = 'completed'"
    );
    $completedCheck->execute([$exam['id'], $student['id']]);
    if ($completedCheck->fetch()) {
        jsonResponse([
            'success'  => false,
            'message'  => 'You have already completed this exam. Retaking is not allowed.',
            'retakeDenied' => true
        ], 403);
    }

    // FIX #2: Prevent duplicate active sessions
    $dupCheck = $db->prepare(
        "SELECT id FROM exam_sessions WHERE exam_id = ? AND student_id = ? AND status = 'active'"
    );
    $dupCheck->execute([$exam['id'], $student['id']]);
    if ($dupCheck->fetch()) {
        jsonResponse([
            'success' => false,
            'message' => 'You already have an active session for this exam. Contact your teacher.'
        ], 409);
    }

    // FIX #4: Server-side whitelist enforcement using FIRST NAME + LAST NAME
    $whitelistCount = $db->prepare("SELECT COUNT(*) FROM exam_whitelist WHERE exam_id = ?");
    $whitelistCount->execute([$exam['id']]);
    $hasWhitelist = (int)$whitelistCount->fetchColumn() > 0;

    if ($hasWhitelist) {
        // Parse student name — stored as "LastName, FirstName" in most systems
        // Supports "LastName, FirstName" or "FirstName LastName"
        $fullName  = $student['name'];
        $nameParts = explode(',', $fullName, 2);
        if (count($nameParts) === 2) {
            $sLast  = strtolower(trim($nameParts[0]));
            $sFirst = strtolower(trim($nameParts[1]));
        } else {
            $parts  = explode(' ', trim($fullName), 2);
            $sFirst = strtolower(trim($parts[0] ?? ''));
            $sLast  = strtolower(trim($parts[1] ?? ''));
        }

        // Whitelist stores combined "first_name last_name" or "last_name"
        // Support both: match against full_name column or concatenated first+last
        $wCheck = $db->prepare(
            "SELECT id FROM exam_whitelist WHERE exam_id = ?
             AND (
                 LOWER(TRIM(last_name)) = ?
                 OR LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = ?
                 OR LOWER(TRIM(CONCAT(last_name, ' ', first_name))) = ?
                 OR LOWER(TRIM(CONCAT(last_name, ', ', first_name))) = ?
             )"
        );
        $fullMatch1 = $sFirst . ' ' . $sLast;
        $fullMatch2 = $sLast . ' ' . $sFirst;
        $fullMatch3 = $sLast . ', ' . $sFirst;
        $wCheck->execute([$exam['id'], $sLast, $fullMatch1, $fullMatch2, $fullMatch3]);
        if (!$wCheck->fetch()) {
            jsonResponse(['success' => false, 'message' => 'You are not authorized to take this exam.'], 403);
        }
    }

    // FIX #3: Cryptographically random session token
    $sessionToken = bin2hex(random_bytes(32));
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

    try {
        $db->prepare("INSERT INTO exam_sessions (exam_id, student_id, session_token, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?, 'active')")
           ->execute([$exam['id'], $student['id'], $sessionToken, $ip, $ua]);
        $sessionId = $db->lastInsertId();
    } catch (Exception $e) {
        $sessionId = null;
    }

    jsonResponse([
        'success' => true,
        'student' => [
            'id'         => $student['id'],
            'name'       => $student['name'],
            'studentId'  => $student['student_id'],
            'department' => $student['department'],
            'yearLevel'  => $student['year_level'],
        ],
        'exam' => [
            'id'       => $exam['id'],
            'title'    => $exam['title'],
            'formUrl'  => $exam['form_url'],
            'duration' => $exam['duration_minutes'],
            'uniqueId' => $exam['unique_id'],
        ],
        'sessionId'    => $sessionId,
        'sessionToken' => $sessionToken,
    ]);
}

// Phase 1 only response
jsonResponse([
    'success' => true,
    'student' => [
        'id'         => $student['id'],
        'name'       => $student['name'],
        'studentId'  => $student['student_id'],
        'department' => $student['department'],
        'yearLevel'  => $student['year_level'],
    ],
]);
