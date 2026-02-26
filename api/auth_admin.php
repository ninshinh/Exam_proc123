<?php
// ==================================================
// api/auth_admin.php — SECURITY HARDENED
// ==================================================
// Security Features:
//  1. Rate limiting (5 attempts per IP per 60 seconds)
//  2. Legacy plaintext password auto-upgrade to bcrypt
//  3. Uniform error messages (prevents user enumeration)
//  4. Logs blocked, failed, and successful login attempts
// ==================================================

header('Content-Type: application/json');
require_once 'db.php';

/* ==================================================
   ALLOW ONLY POST REQUESTS
================================================== */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

/* ==================================================
   INPUT VALIDATION
================================================== */
$body     = getRequestBody();
$email    = sanitizeStr($body['email'] ?? '', 255);
$password = $body['password'] ?? '';

if (!$email || !$password) {
    jsonResponse(['success' => false, 'message' => 'Email and password are required.'], 400);
}

// Generic validation error (no enumeration)
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['success' => false, 'message' => 'Invalid email or password.'], 401);
}

$db = getDB();
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

/* ==================================================
   RATE LIMITING (Per IP)
   Prevents brute-force attacks
================================================== */
if (rateLimitCheck($db, 'admin_login', $ip, 5, 60)) {

    try {
        $db->prepare("
            INSERT INTO system_logs (user_type, user_id, action, description, ip_address)
            VALUES ('admin', 0, 'login_blocked', ?, ?)
        ")->execute([
            "Rate-limited admin login attempt for: $email",
            $ip
        ]);
    } catch (Exception $e) {}

    jsonResponse([
        'success' => false,
        'message' => 'Too many login attempts. Please wait 1 minute.'
    ], 429);
}

/* ==================================================
   FETCH ADMIN ACCOUNT
================================================== */
$stmt = $db->prepare("
    SELECT * FROM administrators
    WHERE email = ? AND status = 'active'
    LIMIT 1
");
$stmt->execute([$email]);
$admin = $stmt->fetch();

/* ==================================================
   PREVENT USER ENUMERATION
================================================== */
if (!$admin) {

    try {
        $db->prepare("
            INSERT INTO system_logs (user_type, user_id, action, description, ip_address)
            VALUES ('admin', 0, 'login_failed', ?, ?)
        ")->execute([
            "Login failed (unknown email): $email",
            $ip
        ]);
    } catch (Exception $e) {}

    jsonResponse(['success' => false, 'message' => 'Invalid email or password.'], 401);
}

/* ==================================================
   PASSWORD VERIFICATION
================================================== */
$hash = $admin['password_hash'];
$passwordValid = false;

// Secure bcrypt verification
if (password_verify($password, $hash)) {
    $passwordValid = true;

} elseif ($password === $hash) {
    // Legacy plaintext detected
    // Auto-upgrade immediately to bcrypt
    $passwordValid = true;

    $newHash = password_hash($password, PASSWORD_BCRYPT);
    $db->prepare("
        UPDATE administrators
        SET password_hash = ?
        WHERE id = ?
    ")->execute([$newHash, $admin['id']]);
}

/* ==================================================
   HANDLE FAILED PASSWORD
================================================== */
if (!$passwordValid) {

    try {
        $db->prepare("
            INSERT INTO system_logs (user_type, user_id, action, description, ip_address)
            VALUES ('admin', ?, 'login_failed', ?, ?)
        ")->execute([
            $admin['id'],
            "Invalid password attempt for: $email",
            $ip
        ]);
    } catch (Exception $e) {}

    jsonResponse(['success' => false, 'message' => 'Invalid email or password.'], 401);
}

/* ==================================================
   SUCCESSFUL LOGIN
================================================== */
try {
    $db->prepare("
        INSERT INTO system_logs (user_type, user_id, action, description, ip_address)
        VALUES ('admin', ?, 'login', ?, ?)
    ")->execute([
        $admin['id'],
        "Admin login successful: {$admin['email']}",
        $ip
    ]);
} catch (Exception $e) {}

jsonResponse([
    'success' => true,
    'admin'   => [
        'id'    => $admin['id'],
        'name'  => $admin['name'],
        'email' => $admin['email'],
        'role'  => $admin['role'],
    ],
]);