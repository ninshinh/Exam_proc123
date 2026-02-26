<?php
/**
 * api/admin_exams.php
 * GET  → list all exams with teacher name (admin view - sees everything including teacher-deleted)
 * GET  ?teacherId=X → list exams for a specific teacher (admin view)
 * DELETE ?examId=X → admin permanently deletes an exam
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$db = getDB();

// Migration-safe: ensure teacher_deleted column exists
try { $db->exec("ALTER TABLE exams ADD COLUMN teacher_deleted TINYINT(1) DEFAULT 0"); } catch (Exception $e) {}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'DELETE') {
    $examId = $_GET['examId'] ?? null;
    if (!$examId) jsonResponse(['success' => false, 'message' => 'examId required'], 400);
    $db->prepare("DELETE FROM exams WHERE id = ?")->execute([$examId]);
    jsonResponse(['success' => true, 'message' => 'Exam permanently deleted']);
}

if ($method === 'PATCH') {
    $examId = $_GET['examId'] ?? null;
    if (!$examId) jsonResponse(['success' => false, 'message' => 'examId required'], 400);

    // Admin restoring a teacher-deleted exam
    if (isset($_GET['restore']) && $_GET['restore'] === '1') {
        $db->prepare("UPDATE exams SET teacher_deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
           ->execute([$examId]);
        jsonResponse(['success' => true, 'message' => 'Exam restored successfully']);
    }

    jsonResponse(['success' => false, 'message' => 'Unknown patch action'], 400);
}

if ($method !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$teacherId = $_GET['teacherId'] ?? null;

if ($teacherId) {
    // Exams by specific teacher (admin viewing teacher's exams - sees ALL including teacher-deleted)
    $stmt = $db->prepare(
        "SELECT e.id, e.title, e.unique_id, e.duration_minutes, e.status,
                COALESCE(e.teacher_deleted, 0) as teacher_deleted, 
                e.created_at, e.start_time, e.end_time, e.description,
                t.name AS teacher_name
         FROM exams e
         LEFT JOIN teachers t ON e.teacher_id = t.id
         WHERE e.teacher_id = ?
         ORDER BY e.created_at DESC"
    );
    $stmt->execute([$teacherId]);
    $exams = $stmt->fetchAll();
    jsonResponse(['success' => true, 'exams' => $exams]);
} else {
    // All exams (admin overview)
    $exams = $db->query(
        "SELECT e.id, e.title, e.unique_id, e.duration_minutes, e.status,
                COALESCE(e.teacher_deleted, 0) as teacher_deleted,
                e.created_at, e.start_time, e.end_time,
                t.name AS teacher_name
         FROM exams e
         LEFT JOIN teachers t ON e.teacher_id = t.id
         ORDER BY e.created_at DESC"
    )->fetchAll();
    jsonResponse(['success' => true, 'exams' => $exams]);
}
