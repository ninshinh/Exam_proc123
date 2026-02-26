<?php
// ping.php — DB connectivity check (table names no longer exposed)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once 'db.php';

$result = [
    'php'         => true,
    'php_version' => PHP_VERSION,
    'db'          => false,
    'server_time' => date('Y-m-d H:i:s'),
];

try {
    $db = getDB();
    $db->query("SELECT 1");
    $result['db'] = true;
} catch (Exception $e) {
    $result['db_error'] = 'Connection failed.';
}

echo json_encode($result, JSON_PRETTY_PRINT);