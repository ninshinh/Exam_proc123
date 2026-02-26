<?php
/**
 * api/admin_teachers.php
 * GET             → list all teachers
 * POST            → create teacher
 * PUT  ?id=X      → update teacher
 * DELETE ?id=X    → delete teacher
 */
header('Content-Type: application/json');
require_once 'db.php';

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;

switch ($method) {

    case 'GET':
        $teachers = $db->query(
            "SELECT id, name, email, employee_id, department, status, created_at FROM teachers ORDER BY created_at DESC"
        )->fetchAll();
        jsonResponse(['success' => true, 'teachers' => $teachers]);
        break;

    case 'POST':
        $body = getRequestBody();
        $name  = trim($body['name']  ?? '');
        $email = trim($body['email'] ?? '');
        $pass  = trim($body['password'] ?? '');
        $empId = trim($body['employee_id'] ?? '');
        $dept  = trim($body['department']  ?? '');
        $status = in_array($body['status'] ?? 'active', ['active', 'inactive']) ? $body['status'] : 'active';

        if (!$name || !$email) {
            jsonResponse(['success' => false, 'message' => 'Name and email are required.'], 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['success' => false, 'message' => 'Invalid email.'], 400);
        }

        // Check duplicate
        $dup = $db->prepare("SELECT id FROM teachers WHERE email = ?");
        $dup->execute([$email]);
        if ($dup->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Email already exists.'], 409);
        }

        $passHash = $pass ? password_hash($pass, PASSWORD_BCRYPT) : password_hash('changeme123', PASSWORD_BCRYPT);

        $stmt = $db->prepare(
            "INSERT INTO teachers (name, email, password_hash, employee_id, department, status)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$name, $email, $passHash, $empId, $dept, $status]);
        jsonResponse(['success' => true, 'id' => $db->lastInsertId()]);
        break;

    case 'PUT':
        if (!$id) jsonResponse(['success' => false, 'message' => 'Teacher ID required.'], 400);
        $body   = getRequestBody();
        $fields = [];
        $vals   = [];

        if (isset($body['name']))        { $fields[] = 'name = ?';        $vals[] = trim($body['name']); }
        if (isset($body['email']))       { $fields[] = 'email = ?';       $vals[] = trim($body['email']); }
        if (isset($body['employee_id'])) { $fields[] = 'employee_id = ?'; $vals[] = trim($body['employee_id']); }
        if (isset($body['department']))  { $fields[] = 'department = ?';  $vals[] = trim($body['department']); }
        if (isset($body['status']) && in_array($body['status'], ['active', 'inactive'])) {
            $fields[] = 'status = ?';
            $vals[]   = $body['status'];
        }
        if (isset($body['password']) && $body['password']) {
            $fields[] = 'password_hash = ?';
            $vals[]   = password_hash($body['password'], PASSWORD_BCRYPT);
        }

        if (!$fields) jsonResponse(['success' => false, 'message' => 'Nothing to update.'], 400);
        $vals[] = $id;
        $db->prepare("UPDATE teachers SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
        jsonResponse(['success' => true]);
        break;

    case 'DELETE':
        if (!$id) jsonResponse(['success' => false, 'message' => 'Teacher ID required.'], 400);
        $db->prepare("DELETE FROM teachers WHERE id = ?")->execute([$id]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}
