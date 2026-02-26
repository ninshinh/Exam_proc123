<?php
// api/admin_students.php — SECURITY HARDENED
// FIX LIST:
//  1. Input sanitization on all fields
//  2. year_level validation (must be 1–6)
//  3. Email validation
//  4. Prevent deleting a student who has active exam sessions
//  5. student_id uniqueness check on PUT as well
header('Content-Type: application/json');
require_once 'db.php';

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;

switch ($method) {

    case 'GET':
        $students = $db->query(
            "SELECT id, name, student_id, email, department, year_level, status, created_at FROM students ORDER BY name"
        )->fetchAll();
        jsonResponse(['success' => true, 'students' => $students]);
        break;

    case 'POST':
        $body      = getRequestBody();
        $name      = sanitizeStr($body['name']       ?? '', 255);
        $studentId = sanitizeStr($body['student_id'] ?? '', 50);
        $email     = sanitizeStr($body['email']      ?? '', 255);
        $dept      = sanitizeStr($body['department'] ?? '', 100);
        $year      = (int)($body['year_level'] ?? 1);
        $status    = in_array($body['status'] ?? 'active', ['active', 'inactive', 'graduated']) ? $body['status'] : 'active';

        if (!$name || !$studentId) {
            jsonResponse(['success' => false, 'message' => 'Name and Student ID are required.'], 400);
        }
        // FIX #3: Email validation
        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['success' => false, 'message' => 'Invalid email address.'], 400);
        }
        // FIX #2: Year level clamp
        $year = max(1, min(6, $year));

        $dup = $db->prepare("SELECT id FROM students WHERE student_id = ?");
        $dup->execute([$studentId]);
        if ($dup->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Student ID already exists.'], 409);
        }

        $stmt = $db->prepare(
            "INSERT INTO students (name, student_id, email, department, year_level, status, teacher_id) VALUES (?, ?, ?, ?, ?, ?, 1)"
        );
        $stmt->execute([$name, $studentId, $email ?: null, $dept ?: null, $year, $status]);
        jsonResponse(['success' => true, 'id' => $db->lastInsertId()]);
        break;

    case 'PUT':
        if (!$id) jsonResponse(['success' => false, 'message' => 'Student ID required.'], 400);
        $body   = getRequestBody();
        $fields = [];
        $vals   = [];

        if (isset($body['name']))       { $fields[] = 'name = ?';       $vals[] = sanitizeStr($body['name'], 255); }
        if (isset($body['student_id'])) {
            $newSid = sanitizeStr($body['student_id'], 50);
            // FIX #5: Check uniqueness on update
            $dupChk = $db->prepare("SELECT id FROM students WHERE student_id = ? AND id != ?");
            $dupChk->execute([$newSid, $id]);
            if ($dupChk->fetch()) jsonResponse(['success' => false, 'message' => 'Student ID already taken.'], 409);
            $fields[] = 'student_id = ?'; $vals[] = $newSid;
        }
        if (isset($body['email'])) {
            $em = sanitizeStr($body['email'], 255);
            if ($em && !filter_var($em, FILTER_VALIDATE_EMAIL)) {
                jsonResponse(['success' => false, 'message' => 'Invalid email.'], 400);
            }
            $fields[] = 'email = ?'; $vals[] = $em ?: null;
        }
        if (isset($body['department'])) { $fields[] = 'department = ?'; $vals[] = sanitizeStr($body['department'], 100) ?: null; }
        if (isset($body['year_level'])) { $fields[] = 'year_level = ?'; $vals[] = max(1, min(6, (int)$body['year_level'])); }
        if (isset($body['status']) && in_array($body['status'], ['active', 'inactive', 'graduated'])) {
            $fields[] = 'status = ?'; $vals[] = $body['status'];
        }

        if (!$fields) jsonResponse(['success' => false, 'message' => 'Nothing to update.'], 400);
        $vals[] = $id;
        $db->prepare("UPDATE students SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        jsonResponse(['success' => true]);
        break;

    case 'DELETE':
        if (!$id) jsonResponse(['success' => false, 'message' => 'Student ID required.'], 400);

        // FIX #4: Don't delete students with active exam sessions
        $activeCheck = $db->prepare("SELECT id FROM exam_sessions WHERE student_id = ? AND status = 'active' LIMIT 1");
        $activeCheck->execute([$id]);
        if ($activeCheck->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Cannot delete student with an active exam session.'], 409);
        }

        $db->prepare("DELETE FROM students WHERE id = ?")->execute([$id]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}
