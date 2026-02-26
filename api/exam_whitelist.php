<?php
// api/exam_whitelist.php — FULL FIX v2
// FIX LIST:
//  1. POST: verify exam belongs to teacher
//  2. DELETE: verify exam belongs to teacher
//  3. Input sanitization on names
//  4. Limit entries per exam
//  5. WHITELIST NOW STORES FIRST + LAST NAME — handles same-last-name collisions
//  6. Case-insensitive, whitespace-trimmed matching
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$db = getDB();

// Ensure whitelist table has first_name column (upgrade if needed)
$db->exec("CREATE TABLE IF NOT EXISTS exam_whitelist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_exam_student (exam_id, last_name, first_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// Add first_name column if it doesn't exist (migration)
try {
    $db->exec("ALTER TABLE exam_whitelist ADD COLUMN first_name VARCHAR(100) DEFAULT '' AFTER last_name");
} catch (Exception $e) {}

$method = $_SERVER['REQUEST_METHOD'];

// Check access: ?checkAccess&examCode=X&lastName=Y&firstName=Z
if ($method === 'GET' && isset($_GET['checkAccess'])) {
    $examCode  = strtoupper(sanitizeStr($_GET['examCode']  ?? '', 50));
    $lastName  = strtolower(trim(sanitizeStr($_GET['lastName']  ?? '', 100)));
    $firstName = strtolower(trim(sanitizeStr($_GET['firstName'] ?? '', 100)));

    if (!$examCode) {
        jsonResponse(['allowed' => true, 'whitelistEnabled' => false]);
    }

    $stmt = $db->prepare("SELECT id FROM exams WHERE unique_id = ?");
    $stmt->execute([$examCode]);
    $exam = $stmt->fetch();
    if (!$exam) {
        jsonResponse(['allowed' => true, 'whitelistEnabled' => false]);
    }

    $cnt = $db->prepare("SELECT COUNT(*) FROM exam_whitelist WHERE exam_id = ?");
    $cnt->execute([$exam['id']]);
    if ((int)$cnt->fetchColumn() === 0) {
        jsonResponse(['allowed' => true, 'whitelistEnabled' => false]);
    }

    // Match by last name alone OR last+first name (case-insensitive, trimmed)
    $wCheck = $db->prepare(
        "SELECT id FROM exam_whitelist WHERE exam_id = ? AND LOWER(TRIM(last_name)) = ?
         AND (first_name = '' OR LOWER(TRIM(first_name)) = ? OR ? = '')"
    );
    $wCheck->execute([$exam['id'], $lastName, $firstName, $firstName]);
    jsonResponse(['allowed' => $wCheck->fetch() !== false, 'whitelistEnabled' => true]);
}

if ($method === 'GET') {
    $examId = isset($_GET['examId']) ? (int)$_GET['examId'] : null;
    if (!$examId) jsonResponse(['success' => false, 'message' => 'examId required'], 400);

    $stmt = $db->prepare("SELECT id, last_name, first_name FROM exam_whitelist WHERE exam_id = ? ORDER BY last_name, first_name ASC");
    $stmt->execute([$examId]);
    jsonResponse(['success' => true, 'entries' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $b         = getRequestBody();
    $examId    = isset($b['examId']) ? (int)$b['examId'] : null;
    $teacherId = isset($b['teacherId']) ? (int)$b['teacherId'] : null;
    $names     = $b['names'] ?? $b['lastNames'] ?? []; // accept both formats

    if (!$examId) jsonResponse(['success' => false, 'message' => 'examId required'], 400);

    if ($teacherId) {
        $own = $db->prepare("SELECT id FROM exams WHERE id = ? AND teacher_id = ?");
        $own->execute([$examId, $teacherId]);
        if (!$own->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Exam not found or unauthorized'], 403);
        }
    }

    if (count($names) > 500) {
        jsonResponse(['success' => false, 'message' => 'Whitelist cannot exceed 500 entries.'], 400);
    }

    $db->prepare("DELETE FROM exam_whitelist WHERE exam_id = ?")->execute([$examId]);

    // Accept entries as:
    //   - "LastName" (last name only)
    //   - "FirstName LastName"
    //   - "LastName, FirstName"
    //   - {last_name: "X", first_name: "Y"} objects
    $stmt     = $db->prepare("INSERT IGNORE INTO exam_whitelist (exam_id, last_name, first_name) VALUES (?, ?, ?)");
    $inserted = 0;
    foreach ($names as $entry) {
        if (is_array($entry)) {
            $ln = strtolower(trim(sanitizeStr($entry['last_name'] ?? $entry['lastName'] ?? '', 100)));
            $fn = strtolower(trim(sanitizeStr($entry['first_name'] ?? $entry['firstName'] ?? '', 100)));
        } else {
            $raw = sanitizeStr((string)$entry, 201);
            $raw = trim($raw);
            if (strpos($raw, ',') !== false) {
                // "Last, First" format
                [$ln, $fn] = array_map('trim', explode(',', $raw, 2));
            } elseif (strpos($raw, ' ') !== false) {
                // "First Last" format — split on first space
                $parts = explode(' ', $raw, 2);
                $fn = trim($parts[0]);
                $ln = trim($parts[1]);
            } else {
                $ln = $raw;
                $fn = '';
            }
            $ln = strtolower($ln);
            $fn = strtolower($fn);
        }
        if ($ln !== '') {
            $stmt->execute([$examId, $ln, $fn]);
            $inserted++;
        }
    }

    jsonResponse(['success' => true, 'message' => "Whitelist updated with $inserted entries."]);
}

if ($method === 'DELETE') {
    $examId    = isset($_GET['examId']) ? (int)$_GET['examId'] : null;
    $lastName  = strtolower(trim(sanitizeStr($_GET['lastName'] ?? '', 100)));
    $firstName = strtolower(trim(sanitizeStr($_GET['firstName'] ?? '', 100)));
    $teacherId = isset($_GET['teacherId']) ? (int)$_GET['teacherId'] : null;

    if (!$examId || !$lastName) jsonResponse(['success' => false, 'message' => 'examId and lastName required'], 400);

    if ($teacherId) {
        $own = $db->prepare("SELECT id FROM exams WHERE id = ? AND teacher_id = ?");
        $own->execute([$examId, $teacherId]);
        if (!$own->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Unauthorized'], 403);
        }
    }

    if ($firstName) {
        $db->prepare("DELETE FROM exam_whitelist WHERE exam_id = ? AND LOWER(last_name) = ? AND LOWER(first_name) = ?")
           ->execute([$examId, $lastName, $firstName]);
    } else {
        $db->prepare("DELETE FROM exam_whitelist WHERE exam_id = ? AND LOWER(last_name) = ?")
           ->execute([$examId, $lastName]);
    }
    jsonResponse(['success' => true, 'message' => 'Entry removed.']);
}

jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
