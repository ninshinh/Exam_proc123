<?php
// api/teacher_password.php — SECURITY HARDENED
// FIX LIST:
//  1. New password minimum length increased to 8 (was 6)
//  2. New password cannot equal old password
//  3. Rate limiting to prevent brute-force of current password
header('Content-Type: application/json');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$body            = getRequestBody();
$teacherId       = (int)($body['teacherId']       ?? 0);
$currentPassword = $body['currentPassword']       ?? '';
$newPassword     = $body['newPassword']           ?? '';

if (!$teacherId || !$currentPassword || !$newPassword) {
    jsonResponse(['success' => false, 'message' => 'Teacher ID, current password, and new password are required.'], 400);
}
// FIX #1: Increased minimum length
if (strlen($newPassword) < 8) {
    jsonResponse(['success' => false, 'message' => 'New password must be at least 8 characters.'], 400);
}

$db = getDB();
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

// FIX #3: Rate limiting
if (rateLimitCheck($db, 'teacher_pw_change', $ip . '_' . $teacherId, 5, 300)) {
    jsonResponse(['success' => false, 'message' => 'Too many attempts. Please wait.'], 429);
}

$stmt = $db->prepare("SELECT password_hash FROM teachers WHERE id = ?");
$stmt->execute([$teacherId]);
$teacher = $stmt->fetch();

if (!$teacher) {
    jsonResponse(['success' => false, 'message' => 'Teacher not found.'], 404);
}

$hash  = $teacher['password_hash'];
$valid = password_verify($currentPassword, $hash) || $currentPassword === $hash;

if (!$valid) {
    jsonResponse(['success' => false, 'message' => 'Current password is incorrect.'], 401);
}

// FIX #2: Prevent reuse of current password
if (password_verify($newPassword, $hash) || $newPassword === $hash) {
    jsonResponse(['success' => false, 'message' => 'New password must be different from current password.'], 400);
}

$newHash = password_hash($newPassword, PASSWORD_BCRYPT);
$db->prepare("UPDATE teachers SET password_hash = ? WHERE id = ?")->execute([$newHash, $teacherId]);

jsonResponse(['success' => true, 'message' => 'Password updated successfully.']);
