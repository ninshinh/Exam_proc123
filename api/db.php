<?php
// ============================================================
// db.php — XAMPP MySQL connection (SECURITY HARDENED)
// FIX LIST:
//  1. DB error message no longer leaked to client
//  2. sanitizeStr() helper added for all input cleaning
//  3. rateLimitCheck() helper added for brute-force protection
//  4. Placeholder for server-side session auth helpers
// ============================================================

header('Access-Control-Allow-Origin: *');   // TODO: lock to your domain in prod
header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');           // XAMPP default: no password
define('DB_NAME', 'cec_exam_system');


function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
            // ── Timezone pinning ─────────────────────────────────────────────
            // Pin both PHP and MySQL to UTC so all datetime math is consistent.
            // toUtc8() in exam_sessions.php explicitly converts UTC → Asia/Manila.
            date_default_timezone_set('UTC');
            $pdo->exec("SET time_zone = '+00:00'");
        } catch (PDOException $e) {
            http_response_code(500);
            // FIX #1: Never expose raw DB error to client (was leaking $e->getMessage())
            error_log('DB Connection Error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
            exit;
        }
    }
    return $pdo;
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function getRequestBody() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

// FIX #2: Input sanitization helper
function sanitizeStr(?string $s, int $maxLen = 255): string {
    if ($s === null) return '';
    return mb_substr(trim(strip_tags($s)), 0, $maxLen);
}

// FIX #3: Simple IP-based rate limiting using DB
// Returns true if over limit (should block), false if ok
function rateLimitCheck(PDO $db, string $action, string $identifier, int $max = 10, int $windowSec = 60): bool {
    try {
        // Ensure table exists
        $db->exec("CREATE TABLE IF NOT EXISTS rate_limits (
            id INT AUTO_INCREMENT PRIMARY KEY,
            action VARCHAR(50) NOT NULL,
            identifier VARCHAR(100) NOT NULL,
            attempts INT DEFAULT 1,
            window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_rl (action, identifier, window_start)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $now = time();
        $windowStart = date('Y-m-d H:i:s', $now - $windowSec);

        // Count recent attempts
        $stmt = $db->prepare("SELECT SUM(attempts) as total FROM rate_limits WHERE action=? AND identifier=? AND window_start > ?");
        $stmt->execute([$action, $identifier, $windowStart]);
        $row = $stmt->fetch();
        $total = (int)($row['total'] ?? 0);

        // Log this attempt
        $db->prepare("INSERT INTO rate_limits (action, identifier) VALUES (?, ?) ON DUPLICATE KEY UPDATE attempts = attempts + 1")
           ->execute([$action, $identifier]);

        // Cleanup old records occasionally
        if (rand(1, 50) === 1) {
            $db->prepare("DELETE FROM rate_limits WHERE window_start < ?")
               ->execute([date('Y-m-d H:i:s', $now - $windowSec * 10)]);
        }

        return $total >= $max;
    } catch (Exception $e) {
        return false; // Fail open if rate limit table has issues
    }
}