# Full System Fix v2 — Change Log

## Summary of All 10 Fixes Applied

---

### ✅ Fix 1 — Exam Scheduling Enforcement (Server-Side PHP)

**Files:** `api/exams.php`, `api/auth_student.php`

- Added `autoEnforceSchedule()` in `exams.php`: every GET request auto-activates or auto-completes exams based on `start_time`/`end_time`.
- `auth_student.php` now enforces the schedule **before** issuing a session token — if `current_time < start_time` or `current_time > end_time`, access is blocked with a clear PHP 403 response. **This is pure PHP, not JavaScript.**
- `examStatusByCode` endpoint now returns `blocked: true` and `blockReason` when outside schedule window.

---

### ✅ Fix 2 — Teacher Reopen Feature

**Files:** `api/exams.php`, `js/dashboard.js`

- `PATCH` to `exams.php` with `{ status: "reopen" }` re-activates a completed exam.
- **Only students with no `completed` session** can re-enter (enforced in `auth_student.php` via the `retakeDenied` check).
- Dashboard menu: "Reopen Exam" button appears on completed/cancelled exams.

---

### ✅ Fix 3 — Admin Audit Log

**Files:** `api/admin_teachers.php`, `api/admin_logs.php`, `admin/js/admin.js`, `admin/dashboard.html`

- New `admin_audit_logs` table (auto-created, also in SQL migration).
- Every `POST` (create), `PUT` (edit), and `DELETE` on `admin_teachers.php` writes a log entry with:
  - Admin ID & name, action type, target teacher ID & name, details, IP address, timestamp.
- `admin_logs.php?type=audit` returns audit logs in **UTC+8**.
- Admin dashboard "System Logs" page now shows both Audit Logs and System Logs.

---

### ✅ Fix 4 — Auto-Grant Google Sheet Access

**Files:** `api/admin_teachers.php`

- On teacher creation (`POST`), calls `grantSheetAccess($email)` which uses a Google service account to grant **writer** access to the correct Sheet.
- **Setup required:** Place your service account JSON key at `api/google-service-account.json` (or set `GOOGLE_SA_KEY_PATH` in PHP config).
- Correct Sheet URL: `https://docs.google.com/spreadsheets/d/1scFoeGZZheTOPCM9eh38thM0mLSY6fU0RgWLrZXk1iY/edit?gid=0#gid=0`
- The teacher creation response now includes `sheetAccess: { granted: true/false }`.

---

### ✅ Fix 5 — Whitelisting — First Name + Last Name

**Files:** `api/exam_whitelist.php`, `api/auth_student.php`, `js/dashboard.js`, `teacher/dashboard.html`

- `exam_whitelist` table now has a `first_name` column (migration in SQL file).
- Entries can be stored as `LastName, FirstName` or just `LastName`.
- Matching in `auth_student.php` uses last+first with multiple fallback formats (case-insensitive, trimmed).
- Whitelist textarea now accepts `LastName, FirstName` format (e.g., `Dela Cruz, Juan`).
- Same last name collision is resolved by also matching first name.

---

### ✅ Fix 6 — Teacher Dashboard Improvements

**Files:** `js/dashboard.js`, `teacher/dashboard.html`

- Activity log now shows **Time Created (UTC+8)**, **Duration**, and **End Time** per session.
- New **Edit Exam** button and modal for every exam in all states (draft/active/completed/cancelled).
- Edit supports: title, description, Form URL, duration, start time, end time.
- **Reopen** button on completed/cancelled exams.

---

### ✅ Fix 7 — Activity Log Timezone (UTC+8)

**Files:** `api/exam_sessions.php`, `api/admin_logs.php`

- `exam_sessions.php` returns `start_time_utc8` and `end_time_utc8` (UTC+8) for all sessions.
- `admin_logs.php` uses `CONVERT_TZ(..., '+00:00', '+08:00')` for both system and audit logs.

---

### ✅ Fix 8 — Google Sheet Integration Verification

**Files:** `api/exam_whitelist.php`, `Code.gs`

- Verified `Code.gs` correctly handles `recordResultsFM`, `checkDuplicate`, `createExamSheet`, `getAllQuestionsAndAnswers`.
- The `createExamSheet` action creates a properly formatted tab using the exam code as the sheet name.
- Whitelist uses the correct Sheet ID: `1scFoeGZZheTOPCM9eh38thM0mLSY6fU0RgWLrZXk1iY`.

---

### ✅ Fix 9 — Exam Creation Popup UI Fix

**Files:** `teacher/dashboard.html`, `js/dashboard.js`

- After creating an exam, a properly styled modal now appears with:
  - Clear title: "Exam Created!"
  - Message: **"Please check the Google Sheet to create the questionnaire."**
  - "Open Google Sheet" button linking directly to the correct Sheet URL.
  - "Close" button.
- Sheet button in sidebar now uses the correct URL: `?gid=0#gid=0`.

---

### ✅ Fix 10 — Prevent Retake via Browser Back Button

**Files:** `api/exam_sessions.php`, `api/auth_student.php`, `scripts/exam.js`

- On exam submission: `scripts/exam.js` calls `exam_sessions.php` with `action: complete_session` to mark the DB session as `completed`.
- On exam page load: `scripts/exam.js` now calls `auth_student.php` server-side to check for a `completed` session before allowing access. Returns `retakeDenied: true` → redirects to `exit.html`.
- `auth_student.php` checks `status = 'completed'` sessions directly in the DB — **this is server-side, not JS.**
- Uses **POST-redirect-GET-compatible** pattern: session marked completed at the DB level immediately.

---

## Database Migrations

Run the new SQL at the bottom of `cec_exam_system (2).sql`:

```sql
-- Admin Audit Log table
CREATE TABLE IF NOT EXISTS `admin_audit_logs` (...);

-- Add first_name to whitelist
ALTER TABLE `exam_whitelist` ADD COLUMN IF NOT EXISTS `first_name` varchar(100) DEFAULT '' AFTER `last_name`;
```

---

## Setup: Google Sheet Auto-Access

1. Create a Google Cloud project & enable the Drive API.
2. Create a service account and download the JSON key.
3. Place the key file at: `api/google-service-account.json`
4. Share the target Google Sheet with the service account email (as an editor).
5. When an admin creates a teacher, the teacher's Gmail will automatically receive editor access.

