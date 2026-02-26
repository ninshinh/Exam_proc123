<?php
/**
 * api/admin_stats.php
 * GET → returns dashboard stat counts
 */
header('Content-Type: application/json');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$db = getDB();

$students    = $db->query("SELECT COUNT(*) FROM students WHERE status = 'active'")->fetchColumn();
$teachers    = $db->query("SELECT COUNT(*) FROM teachers WHERE status = 'active'")->fetchColumn();
$activeExams = $db->query("SELECT COUNT(*) FROM exams WHERE status = 'active'")->fetchColumn();

jsonResponse([
    'success'     => true,
    'students'    => (int) $students,
    'teachers'    => (int) $teachers,
    'activeExams' => (int) $activeExams,
    'dbConnected' => true,
]);
