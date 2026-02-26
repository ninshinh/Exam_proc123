<?php
/**
 * api/admin_logs.php — FULL FIX v2
 * GET ?type=system  → system activity logs (UTC+8)
 * GET ?type=audit   → admin audit logs (UTC+8)
 * GET (default)     → system logs (backwards compat)
 * All timestamps displayed in UTC+8
 */
header('Content-Type: application/json');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$limit = min((int) ($_GET['limit'] ?? 50), 500);
$type  = $_GET['type'] ?? 'system';
$db    = getDB();

if ($type === 'audit') {
    // Admin audit logs
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_id INT DEFAULT NULL,
            admin_name VARCHAR(255) DEFAULT NULL,
            action_type VARCHAR(50) DEFAULT 'other',
            target_teacher_id INT DEFAULT NULL,
            target_teacher_name VARCHAR(255) DEFAULT NULL,
            details TEXT DEFAULT NULL,
            ip_address VARCHAR(45) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_aal_admin (admin_id),
            KEY idx_aal_target (target_teacher_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Exception $e) {}

    $stmt = $db->prepare(
        "SELECT id, admin_id, admin_name, action_type, target_teacher_id, target_teacher_name,
                details, ip_address,
                DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+08:00'), '%Y-%m-%d %H:%i:%s') AS timestamp_utc8
         FROM admin_audit_logs ORDER BY created_at DESC LIMIT ?"
    );
    $stmt->execute([$limit]);
    jsonResponse(['success' => true, 'logs' => $stmt->fetchAll()]);
}

// System logs — with UTC+8 timestamp conversion
$stmt = $db->prepare(
    "SELECT id, user_type, user_id, action, description, ip_address,
            DATE_FORMAT(CONVERT_TZ(timestamp, '+00:00', '+08:00'), '%Y-%m-%d %H:%i:%s') AS timestamp
     FROM system_logs
     ORDER BY timestamp DESC
     LIMIT ?"
);
$stmt->execute([$limit]);
$logs = $stmt->fetchAll();

jsonResponse(['success' => true, 'logs' => $logs]);
