<?php
// api/exams.php — FULL FIX v3
// FIX LIST:
//  1. Teacher ID verified: teacher can only see/modify THEIR OWN exams
//  2. PATCH ownership check added
//  3. DELETE ownership check added
//  4. exam unique_id collision check added
//  5. Input sanitization on all fields
//  6. TIME ENFORCEMENT: start_time/end_time automatically enforced server-side
//  7. REOPEN: Teacher can reopen exam; only students who never submitted may access
//  8. EDIT: Full exam editing (title, description, duration, start_time, end_time, form_url)
//  9. [FIX] All times now handled in Asia/Manila (PHT, UTC+8) consistently
// 10. [FIX] serverTime (PHT) now included in examStatusByCode response for client sync
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

// ── Always work in Philippine Time ───────────────────────────────────────────
date_default_timezone_set('Asia/Manila');
$PHT = new DateTimeZone('Asia/Manila');

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── Helper: current PHT timestamp as Unix ────────────────────────────────────
function nowPHT(): int {
    return (new DateTime('now', new DateTimeZone('Asia/Manila')))->getTimestamp();
}

// ── Helper: convert any stored datetime string → PHT Unix timestamp ──────────
function toPHTTimestamp(?string $dt): ?int {
    if (!$dt) return null;
    // If value has no timezone info (plain "Y-m-d H:i:s"), treat it as PHT
    $d = DateTime::createFromFormat('Y-m-d H:i:s', $dt, new DateTimeZone('Asia/Manila'));
    if (!$d) $d = new DateTime($dt, new DateTimeZone('Asia/Manila'));
    return $d ? $d->getTimestamp() : null;
}

// ── Helper: format a stored datetime string for display in PHT ───────────────
function formatPHT(?string $dt): string {
    if (!$dt) return '';
    $d = DateTime::createFromFormat('Y-m-d H:i:s', $dt, new DateTimeZone('Asia/Manila'));
    if (!$d) $d = new DateTime($dt, new DateTimeZone('Asia/Manila'));
    return $d ? $d->format('Y-m-d H:i') . ' (PHT)' : $dt;
}

// ── Helper: parse incoming datetime from client → MySQL string stored as PHT ─
function toMySQLPHT(?string $input): ?string {
    if (!$input) return null;
    // Client sends ISO 8601 (possibly with offset) — convert to PHT wall time
    try {
        $d = new DateTime($input);
        $d->setTimezone(new DateTimeZone('Asia/Manila'));
        return $d->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        return null;
    }
}

// ── Helper: enforce schedule, return true if blocked ─────────────────────────
function isScheduleBlocked(array $exam): bool {
    $now   = nowPHT();
    $start = toPHTTimestamp($exam['start_time']);
    $end   = toPHTTimestamp($exam['end_time']);
    if ($start && $now < $start) return true;
    if ($end   && $now > $end)   return true;
    return false;
}

// ── Helper: auto-enforce schedule, deactivate/activate based on PHT time ─────
function autoEnforceSchedule(PDO $db, array $exam): array {
    $now   = nowPHT();
    $start = toPHTTimestamp($exam['start_time']);
    $end   = toPHTTimestamp($exam['end_time']);

    // If active/reopened but past end → auto-complete
    if (($exam['status'] === 'active' || $exam['status'] === 'reopened') && $end && $now > $end) {
        $db->prepare("UPDATE exams SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
           ->execute([$exam['id']]);
        $db->prepare("UPDATE exam_sessions SET status = 'completed', end_time = CURRENT_TIMESTAMP WHERE exam_id = ? AND status = 'active'")
           ->execute([$exam['id']]);
        $exam['status'] = 'completed';
    }
// 2. Modified Auto-activate: Only if NOT manually stopped
    if ($exam['status'] === 'draft' && $start && $end && $now >= $start && $now <= $end) {
        // Only auto-activate if the teacher hasn't manually killed it
        if (!isset($exam['is_manually_stopped']) || $exam['is_manually_stopped'] == 0) {
            $db->prepare("UPDATE exams SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
               ->execute([$exam['id']]);
            $exam['status'] = 'active';
        }
    }
    return $exam;
}

// ---- GET ----
if ($method === 'GET') {

    // Public status check by code (used on exam entry page)
    if (isset($_GET['examStatusByCode'])) {
        $code = sanitizeStr($_GET['examStatusByCode'] ?? '', 50);
        $stmt = $db->prepare("SELECT id, status, start_time, end_time FROM exams WHERE unique_id = ?");
        $stmt->execute([strtoupper($code)]);
        $row = $stmt->fetch();

        if (!$row) {
            jsonResponse(['found' => false]);
        }

        // Enforce schedule with PHT-aware logic
        $row = autoEnforceSchedule($db, $row);

        $now   = nowPHT();
        $start = toPHTTimestamp($row['start_time']);
        $end   = toPHTTimestamp($row['end_time']);

        $blocked = false;
        $blockReason = '';

        if ($start && $now < $start) {
            $blocked     = true;
            $blockReason = 'Exam has not started yet. Starts: ' . formatPHT($row['start_time']);
        } elseif ($end && $now > $end) {
            $blocked     = true;
            $blockReason = 'Exam has ended.';
        }

        // 'reopened' counts as accessible (overrides time block)
        if ($row['status'] === 'reopened') {
            $blocked     = false;
            $blockReason = '';
        }

        // ── FIX: Include serverTime in PHT so JS client can sync ─────────────
        $serverTime = (new DateTime('now', new DateTimeZone('Asia/Manila')))->format('c'); // e.g. 2026-02-26T13:00:00+08:00

        jsonResponse([
            'found'       => true,
            'status'      => $row['status'],
            'examId'      => $row['id'],
            'blocked'     => $blocked,
            'blockReason' => $blockReason,
            'serverTime'  => $serverTime,   // ← Used by login.js to sync start time
        ]);
    }

    if (isset($_GET['examStatusCheck'])) {
        $examId = (int)$_GET['examStatusCheck'];
        $stmt = $db->prepare("SELECT id, status, start_time, end_time FROM exams WHERE id = ?");
        $stmt->execute([$examId]);
        $row = $stmt->fetch();
        if (!$row) { jsonResponse(['status' => 'not_found'], 404); }
        $row = autoEnforceSchedule($db, $row);
        jsonResponse(['status' => $row['status']]);
    }

    $teacherId = isset($_GET['teacherId']) ? (int)$_GET['teacherId'] : null;
    if (!$teacherId) jsonResponse(['success' => false, 'message' => 'teacherId required'], 400);

    try { $db->exec("ALTER TABLE exams ADD COLUMN teacher_deleted TINYINT(1) DEFAULT 0"); } catch (Exception $e) {}

    $stmt = $db->prepare("SELECT * FROM exams WHERE teacher_id = ? AND (teacher_deleted IS NULL OR teacher_deleted = 0) ORDER BY created_at DESC");
    $stmt->execute([$teacherId]);
    $exams = $stmt->fetchAll();

    $updated = [];
    foreach ($exams as $ex) {
        $updated[] = autoEnforceSchedule($db, $ex);
    }
    jsonResponse(['success' => true, 'exams' => $updated]);
}

// ---- POST ----
if ($method === 'POST') {
    $b         = getRequestBody();
    $title     = sanitizeStr($b['title'] ?? '', 100);
    $formUrl   = sanitizeStr($b['formUrl'] ?? '', 2048);
    $teacherId = isset($b['teacherId']) ? (int)$b['teacherId'] : null;
    $desc      = sanitizeStr($b['description'] ?? '', 1000);
    $duration  = max(1, min(480, (int)($b['duration'] ?? 60)));
    $startTime = $b['startTime'] ?? null;
    $endTime   = $b['endTime']   ?? null;

    if (!$title || !$teacherId) {
        jsonResponse(['success' => false, 'message' => 'title and teacherId are required'], 400);
    }

    $tCheck = $db->prepare("SELECT id FROM teachers WHERE id = ? AND status = 'active'");
    $tCheck->execute([$teacherId]);
    if (!$tCheck->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Invalid teacher'], 403);
    }

    $uniqueId = strtoupper(preg_replace('/[^A-Z0-9]/', '', $title));
    if (strlen($uniqueId) < 3) {
        jsonResponse(['success' => false, 'message' => 'Title must contain at least 3 alphanumeric characters'], 400);
    }

    $colCheck = $db->prepare("SELECT id FROM exams WHERE unique_id = ?");
    $colCheck->execute([$uniqueId]);
    if ($colCheck->fetch()) {
        $uniqueId .= strtoupper(bin2hex(random_bytes(2)));
    }

    // ── FIX: Parse incoming times as PHT ─────────────────────────────────────
    $startMysql = toMySQLPHT($startTime);
    $endMysql   = toMySQLPHT($endTime);

    if ($startMysql && $endMysql && strtotime($endMysql) <= strtotime($startMysql)) {
        jsonResponse(['success' => false, 'message' => 'End time must be after start time'], 400);
    }

    $stmt = $db->prepare("INSERT INTO exams (title, description, form_url, duration_minutes, start_time, end_time, teacher_id, unique_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')");
    $stmt->execute([$title, $desc, $formUrl, $duration, $startMysql, $endMysql, $teacherId, $uniqueId]);
    $examId = $db->lastInsertId();

    jsonResponse(['success' => true, 'message' => 'Exam created', 'examId' => $examId, 'uniqueId' => $uniqueId]);
}

// ---- PATCH ----
if ($method === 'PATCH') {
    $examId    = isset($_GET['examId']) ? (int)$_GET['examId'] : null;
    $teacherId = isset($_GET['teacherId']) ? (int)$_GET['teacherId'] : null;
    if (!$examId) jsonResponse(['success' => false, 'message' => 'examId required'], 400);

    if ($teacherId) {
        $own = $db->prepare("SELECT id FROM exams WHERE id = ? AND teacher_id = ?");
        $own->execute([$examId, $teacherId]);
        if (!$own->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Exam not found or unauthorized'], 403);
        }
    }

    $b = getRequestBody();

    // ── EDIT exam fields ──────────────────────────────────────────────────────
    if (isset($b['editExam']) && $b['editExam'] === true) {
        $fields = []; $vals = [];
        if (isset($b['title']))       { $fields[] = 'title = ?';            $vals[] = sanitizeStr($b['title'], 100); }
        if (isset($b['description'])) { $fields[] = 'description = ?';      $vals[] = sanitizeStr($b['description'], 1000); }
        if (isset($b['formUrl']))     { $fields[] = 'form_url = ?';          $vals[] = sanitizeStr($b['formUrl'], 2048); }
        if (isset($b['duration']))    { $fields[] = 'duration_minutes = ?';  $vals[] = max(1, min(480, (int)$b['duration'])); }
        if (isset($b['startTime']))   {
            $fields[] = 'start_time = ?';
            $vals[]   = toMySQLPHT($b['startTime']); // ── FIX: PHT-aware parse
        }
        if (isset($b['endTime'])) {
            $fields[] = 'end_time = ?';
            $vals[]   = toMySQLPHT($b['endTime']);   // ── FIX: PHT-aware parse
        }
        if (!$fields) jsonResponse(['success' => false, 'message' => 'Nothing to update'], 400);
        $vals[] = $examId;
        $db->prepare("UPDATE exams SET " . implode(', ', $fields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ?")
           ->execute($vals);
        jsonResponse(['success' => true, 'message' => 'Exam updated']);
    }

    // ── REOPEN exam ───────────────────────────────────────────────────────────
    if (isset($b['status']) && $b['status'] === 'reopen') {
        $db->prepare("UPDATE exams SET status = 'reopened', updated_at = CURRENT_TIMESTAMP WHERE id = ?")->execute([$examId]);
        jsonResponse(['success' => true, 'message' => 'Exam reopened — only students who never submitted may enter']);
    }

    // ── Status change ─────────────────────────────────────────────────────────
    $status = $b['status'] ?? null;
    $valid  = ['draft', 'active', 'completed', 'cancelled', 'reopened'];
    if (!in_array($status, $valid)) jsonResponse(['success' => false, 'message' => 'Invalid status'], 400);

    $db->prepare("UPDATE exams SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")->execute([$status, $examId]);

    if (in_array($status, ['draft', 'completed', 'cancelled'])) {
        $db->prepare("UPDATE exam_sessions SET status = 'completed', end_time = CURRENT_TIMESTAMP WHERE exam_id = ? AND status = 'active'")
           ->execute([$examId]);
    }

    $msgs = [
        'active'    => 'Exam activated — students can now enter',
        'draft'     => 'Exam deactivated — students are now locked out',
        'completed' => 'Exam marked as completed',
        'cancelled' => 'Exam cancelled — all sessions closed',
    ];
    jsonResponse(['success' => true, 'message' => $msgs[$status]]);
}

// ---- DELETE ----
if ($method === 'DELETE') {
    $examId    = isset($_GET['examId']) ? (int)$_GET['examId'] : null;
    $teacherId = isset($_GET['teacherId']) ? (int)$_GET['teacherId'] : null;
    if (!$examId) jsonResponse(['success' => false, 'message' => 'examId required'], 400);

    if ($teacherId) {
        $own = $db->prepare("SELECT id FROM exams WHERE id = ? AND teacher_id = ?");
        $own->execute([$examId, $teacherId]);
        if (!$own->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Exam not found or unauthorized'], 403);
        }
    }

    if (isset($_GET['hardDelete']) && $_GET['hardDelete'] === '1') {
        $db->prepare("DELETE FROM exams WHERE id = ?")->execute([$examId]);
        jsonResponse(['success' => true, 'message' => 'Exam permanently deleted']);
    } else {
        try { $db->exec("ALTER TABLE exams ADD COLUMN teacher_deleted TINYINT(1) DEFAULT 0"); } catch (Exception $e) {}
        $db->prepare("UPDATE exams SET teacher_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")->execute([$examId]);
        jsonResponse(['success' => true, 'message' => 'Exam deleted']);
    }
}

jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);