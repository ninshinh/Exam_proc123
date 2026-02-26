<?php
// ==============================================
// api/auth_teacher.php — SECURITY HARDENED
// ==============================================
// Security Features:
//  1. Rate limiting (5 attempts per 60 seconds)
//  2. Legacy plaintext password auto-upgrade to bcrypt
//  3. Uniform error messages (prevents user enumeration)
//  4. Login attempt logging (audit trail)
// ==============================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once 'db.php';

/* ==============================================
   ALLOW ONLY POST REQUESTS
============================================== */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

/* ==============================================
   INPUT VALIDATION
============================================== */
$body     = getRequestBody();
$email    = sanitizeStr($body['email'] ?? '', 255);
$password = $body['password'] ?? '';

if (!$email || !$password) {
    jsonResponse(['success' => false, 'message' => 'Email and password are required'], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    // Generic error (prevents attacker from knowing if email exists)
    jsonResponse(['success' => false, 'message' => 'Invalid credentials'], 401);
}

$db = getDB();

/* ==============================================
   RATE LIMITING (Email + IP Based)
   Prevents brute-force attacks
============================================== */
$identifier = $email . '|' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');

if (rateLimitCheck($db, 'teacher_login', $identifier, 5, 60)) {
    jsonResponse([
        'success' => false,
        'message' => 'Too many login attempts. Please wait 1 minute.'
    ], 429);
}

/* ==============================================
   FETCH TEACHER ACCOUNT
============================================== */
$stmt = $db->prepare("SELECT * FROM teachers WHERE email = ? AND status = 'active' LIMIT 1");
$stmt->execute([$email]);
$teacher = $stmt->fetch();

/* ==============================================
   PREVENT USER ENUMERATION
   Always return same error if account not found
============================================== */
if (!$teacher) {
    jsonResponse(['success' => false, 'message' => 'Invalid credentials'], 401);
}

/* ==============================================
   PASSWORD VERIFICATION
============================================== */
$hash    = $teacher['password_hash'];
$isValid = false;

// Secure bcrypt verification
if (password_verify($password, $hash)) {
    $isValid = true;

} elseif ($password === $hash) {
    // Legacy plaintext password detected
    // Auto-upgrade to bcrypt immediately
    $isValid = true;

    $newHash = password_hash($password, PASSWORD_BCRYPT);
    $db->prepare("UPDATE teachers SET password_hash = ? WHERE id = ?")
       ->execute([$newHash, $teacher['id']]);
}

/* ==============================================
   FAILED LOGIN HANDLING
============================================== */
if (!$isValid) {

    // Log failed attempt (audit trail)
    try {
        $db->prepare("
            INSERT INTO system_logs (user_type, user_id, action, description)
            VALUES (?, ?, ?, ?)
        ")->execute([
            'teacher',
            $teacher['id'],
            'login_failed',
            "Failed login attempt: $email"
        ]);
    } catch (Exception $e) {}

    jsonResponse(['success' => false, 'message' => 'Invalid credentials'], 401);
}

/* ==============================================
   SUCCESS LOGIN
============================================== */

// Log successful login
try {
    $db->prepare("
        INSERT INTO system_logs (user_type, user_id, action, description)
        VALUES (?, ?, ?, ?)
    ")->execute([
        'teacher',
        $teacher['id'],
        'login',
        "Teacher login: $email"
    ]);
} catch (Exception $e) {}

jsonResponse([
    'success' => true,
    'teacher' => [
        'id'         => $teacher['id'],
        'name'       => $teacher['name'],
        'email'      => $teacher['email'],
        'department' => $teacher['department'],
    ],
]);