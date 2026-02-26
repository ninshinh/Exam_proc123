// js/dashboard.js — Teacher Dashboard
'use strict';

const API_BASE = window.API_BASE;

/* ─────────────────── Toast ─────────────────── */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

/* ─────────────────── Auth ──────────────────── */
const teacherData = JSON.parse(localStorage.getItem('teacherData') || 'null');
if (!teacherData || localStorage.getItem('userRole') !== 'teacher') {
  window.location.href = '../index.html';
}

/* ─────────────────── State ─────────────────── */
let exams      = [];
let violations = [];
let sessions   = [];
let openSessionId = null;   // which session card is expanded
const sheetTimerCache = {}; // examCode → duration in minutes (from GSheet)

async function fetchSheetTimer(examCode) {
  if (!examCode) return null;
  const key = examCode.trim().toUpperCase();
  if (sheetTimerCache[key] !== undefined) return sheetTimerCache[key];
  sheetTimerCache[key] = null; // mark as fetching to avoid duplicate requests
  try {
    const sheetsUrl = window.SHEETS_URL || '';
    if (!sheetsUrl) return null;
    const params = new URLSearchParams({ action: 'getExamTimer', code: key });
    const res  = await fetch(`${sheetsUrl}?${params}`, { redirect: 'follow' });
    const data = await res.json();
    if (data.globalExamTimerSeconds) {
      sheetTimerCache[key] = Math.round(data.globalExamTimerSeconds / 60);
    } else {
      sheetTimerCache[key] = null;
    }
  } catch { sheetTimerCache[key] = null; }
  return sheetTimerCache[key];
}

const sheetEndTimeCache = {}; // examCode → { "lastname|firstname": "YYYY-MM-DD HH:mm:ss" }

async function fetchSheetEndTimes(examCode) {
  if (!examCode) return {};
  const key = examCode.trim().toUpperCase();
  if (sheetEndTimeCache[key] !== undefined) return sheetEndTimeCache[key];
  sheetEndTimeCache[key] = {}; // prevent duplicate requests
  try {
    const sheetsUrl = window.SHEETS_URL || '';
    if (!sheetsUrl) return {};
    const params = new URLSearchParams({ action: 'getStudentEndTimes', code: key });
    const res  = await fetch(`${sheetsUrl}?${params}`, { redirect: 'follow' });
    const data = await res.json();
    if (data.success && data.endTimes) sheetEndTimeCache[key] = data.endTimes;
  } catch { sheetEndTimeCache[key] = {}; }
  return sheetEndTimeCache[key];
}

const sheetSubmissionsCache = {}; // examCode → [ {lastName, firstName, section, startTime, endTime, date} ]

async function fetchSheetSubmissions(examCode) {
  if (!examCode) return [];
  const key = examCode.trim().toUpperCase();
  if (sheetSubmissionsCache[key] !== undefined) return sheetSubmissionsCache[key];
  sheetSubmissionsCache[key] = [];
  try {
    const sheetsUrl = window.SHEETS_URL || '';
    if (!sheetsUrl) return [];
    const params = new URLSearchParams({ action: 'getAllSubmissions', code: key });
    const res  = await fetch(`${sheetsUrl}?${params}`, { redirect: 'follow' });
    const data = await res.json();
    if (data.success && Array.isArray(data.submissions)) {
      sheetSubmissionsCache[key] = data.submissions;
    }
  } catch { sheetSubmissionsCache[key] = []; }
  return sheetSubmissionsCache[key];
}

/* ─────────────────── Header ────────────────── */
document.getElementById('teacher-info').textContent =
  `${teacherData.name} · ${teacherData.department}`;

/* ─────────────────── Sidebar nav ───────────── */
document.querySelectorAll('.sb-item[data-section]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sb-item[data-section]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    const target = document.getElementById('section-' + btn.dataset.section);
    if (target) target.classList.add('active');
  });
});

/* ─────────────────── Helpers ───────────────── */

/**
 * Parse a datetime string stored as PHT (Asia/Manila, UTC+8) wall time.
 * DB returns plain "YYYY-MM-DD HH:mm:ss" with no timezone suffix.
 * Appending "T" alone causes browsers to treat it as UTC — WRONG.
 * We must manually offset by +08:00 so JS Date reflects PHT correctly.
 */
function parseLocalDatetime(d) {
  if (!d) return null;
  const s = String(d).trim();
  if (!s || s === '—') return null;

  // If it already has timezone info (contains + or Z after the time part), parse as-is
  if (/[Z+]/.test(s.slice(10))) {
    const dt = new Date(s);
    return isNaN(dt) ? null : dt;
  }

  // Bare time string "HH:mm:ss" or "HH:mm" — prepend today's PHT date
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // "YYYY-MM-DD"
    const normalized = `${today}T${s.length === 5 ? s + ':00' : s}+08:00`;
    const dt = new Date(normalized);
    return isNaN(dt) ? null : dt;
  }

  // Plain "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm:ss" — treat as PHT (+08:00)
  const normalized = s.replace(' ', 'T') + '+08:00';
  const dt = new Date(normalized);
  return isNaN(dt) ? null : dt;
}

/**
 * Parse a DB datetime string (stored as PHT) and return a Unix timestamp (ms)
 * that correctly reflects PHT wall time — used for schedule comparisons.
 */
function parsePHTtoMs(d) {
  if (!d) return null;
  const dt = parseLocalDatetime(d);
  return dt ? dt.getTime() : null;
}

function fmtTime(d) {
  if (!d) return '—';
  const dt = parseLocalDatetime(d);
  if (!dt) return '—';
  return dt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' });
}
function fmtDateShort(d) {
  if (!d) return '—';
  const dt = parseLocalDatetime(d);
  if (!dt) return '—';
  return dt.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' });
}
// Full date + time — used for exam card start/end chips
function fmtDateTime(d) {
  if (!d) return '—';
  const dt = parseLocalDatetime(d);
  if (!dt) return '—';
  const date = dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
  const time = dt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' });
  return `${date} ${time}`;
}

// ── DEBUG helper: log all exam times to console so you can see what PHP returns ─
function debugExamTimes(exams) {
  exams.forEach(e => {
    console.log(`[Exam ${e.id} ${e.title}] start_time="${e.start_time}" end_time="${e.end_time}"`);
    console.log(`  → start parsed:`, parseLocalDatetime(e.start_time));
    console.log(`  → end parsed:  `, parseLocalDatetime(e.end_time));
  });
}
function sevBadge(s) {
  const cls = s || 'medium';
  return `<span class="sev-badge ${cls}">${cls.toUpperCase()}</span>`;
}

/* ─────────────────── Dropdown ──────────────── */
function closeAllDD() {
  document.querySelectorAll('.dd-menu').forEach(m => m.remove());
}
document.addEventListener('click', closeAllDD);

/* ═══════════════════════════════════════════════
   RENDER: My Exams
═══════════════════════════════════════════════ */
function renderExams() {
  const list = document.getElementById('exams-list');
  const n = exams.length;
  document.getElementById('chip-exams').textContent = n;

  if (!n) {
    list.innerHTML = `
      <div class="empty-box">
        <div class="ei">📄</div>
        <h3>No exams yet</h3>
        <p>Create your first exam with the button above.</p>
      </div>`;
    return;
  }

  const STATUS = {
    active:    { label:'ACTIVE',    color:'#10b981', hint:'Students can enter · Violations are being logged' },
    draft:     { label:'INACTIVE',  color:'#475569', hint:'Students cannot enter · Detection OFF' },
    completed: { label:'COMPLETED', color:'#3b82f6', hint:'Exam closed · No new entries allowed' },
    cancelled: { label:'CANCELLED', color:'#ef4444', hint:'Cancelled · All sessions closed' },
    reopened:  { label:'REOPENED',  color:'#f59e0b', hint:'Exam reopened · Only new students may enter' },
  };

  list.innerHTML = exams.map(exam => {
    const s = STATUS[exam.status] || STATUS.draft;
    const timingHtml = (exam.created_at || exam.start_time || exam.end_time) ? `
      <div class="ec-timing">
        ${exam.created_at  ? `<span class="ec-time-chip"><span class="ec-time-lbl">Created</span><span class="ec-time-val">${fmtDateShort(exam.created_at)}</span></span>` : ''}
        ${exam.start_time  ? `<span class="ec-time-chip"><span class="ec-time-lbl">▶ Starts</span><span class="ec-time-val">${fmtDateTime(exam.start_time)}</span></span>` : ''}
        ${exam.end_time    ? `<span class="ec-time-chip ec-time-chip-end"><span class="ec-time-lbl">⏹ Ends</span><span class="ec-time-val">${fmtDateTime(exam.end_time)}</span></span>` : ''}
      </div>` : '';
    return `
      <div class="exam-card" id="ecard-${exam.id}">
        <div class="ec-bar" style="background:${s.color};"></div>
        <div class="ec-body">
          <div class="ec-row1">
            <span class="ec-name">${exam.title}</span>
            <span class="ec-pill" style="background:${s.color}18;color:${s.color};border-color:${s.color}40;">
              <span style="width:5px;height:5px;border-radius:50%;background:${s.color};display:inline-block;"></span>
              ${s.label}
            </span>
          </div>
          <div class="ec-hint">${s.hint}</div>
          <div class="ec-desc">${exam.description || 'No description.'}</div>
          ${timingHtml}
          <div class="ec-foot">
            <span class="ec-code">${exam.unique_id}</span>
          </div>
        </div>
        <div class="ec-actions">
          <button class="ec-btn ec-btn-edit" id="ecbtn-edit-${exam.id}" title="Edit Exam">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="ec-btn" id="ecbtn-${exam.id}" title="Actions">•••</button>
        </div>
      </div>`;
  }).join('');

  exams.forEach(exam => {
    const editBtn = document.getElementById(`ecbtn-edit-${exam.id}`);
    editBtn?.addEventListener('click', e => {
      e.stopPropagation();
      openEditModal(exam);
    });

    const btn = document.getElementById(`ecbtn-${exam.id}`);
    btn.addEventListener('click', e => {
      e.stopPropagation();
      closeAllDD();

      const menu = document.createElement('div');
      menu.className = 'dd-menu';
      buildMenuItems(exam).forEach(item => {
        if (item === '---') {
          const d = document.createElement('div');
          d.className = 'dd-sep';
          menu.appendChild(d);
          return;
        }
        const b = document.createElement('button');
        b.className = `dd-item ${item.cls || ''}`;
        b.innerHTML = `<span style="font-size:0.9rem;">${item.icon}</span>${item.label}`;
        b.onclick = ev => { ev.stopPropagation(); closeAllDD(); item.action(); };
        menu.appendChild(b);
      });

      document.body.appendChild(menu);
      const r   = btn.getBoundingClientRect();
      const mw  = 200;
      let left  = r.right - mw;
      if (left < 6) left = 6;
      menu.style.left     = left + 'px';
      menu.style.top      = (r.bottom + 5) + 'px';
      menu.style.minWidth = mw + 'px';
    });
  });
}

function buildMenuItems(exam) {
  if (exam.status === 'draft') {
    return [
      { icon:'🟢', label:'Activate Exam',    cls:'g', action:() => changeStatus(exam.id,'active') },
      { icon:'✏️', label:'Edit Exam',         cls:'',  action:() => openEditModal(exam) },
      { icon:'📋', label:'Manage Whitelist', cls:'',  action:() => openWhitelistModal(exam) },
      '---',
      { icon:'🗑', label:'Delete Exam',       cls:'r', action:() => deleteExam(exam.id) },
    ];
  }
  if (exam.status === 'active' || exam.status === 'reopened') {
    return [
      { icon:'⏸', label:'Deactivate',        cls:'a', action:() => changeStatus(exam.id,'draft') },
      { icon:'✔', label:'Mark Completed',    cls:'m', action:() => changeStatus(exam.id,'completed') },
      { icon:'✏️', label:'Edit Exam',         cls:'',  action:() => openEditModal(exam) },
      { icon:'📋', label:'Manage Whitelist', cls:'',  action:() => openWhitelistModal(exam) },
      '---',
      { icon:'🗑', label:'Delete Exam',       cls:'r', action:() => deleteExam(exam.id) },
    ];
  }
  // completed / cancelled
  return [
    { icon:'↩', label:'Reset to Draft',      cls:'m', action:() => changeStatus(exam.id,'draft') },
    { icon:'✏️', label:'Edit Exam',           cls:'',  action:() => openEditModal(exam) },
    { icon:'📋', label:'Manage Whitelist',   cls:'',  action:() => openWhitelistModal(exam) },
    '---',
    { icon:'🗑', label:'Delete Exam',         cls:'r', action:() => deleteExam(exam.id) },
  ];
}

/* ─────────────────── Reopen Exam ──────────────── */
async function reopenExam(examId) {
  if (!confirm('Reopen this exam? Only students who have NOT previously submitted will be able to access it.')) return;
  try {
    const res  = await fetch(`${API_BASE}/exams.php?examId=${examId}&teacherId=${teacherData.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'reopen' }),
    });
    const data = await res.json();
    if (data.success) { toast('Exam reopened ✓ — only new students may enter', 'success'); await loadExams(); }
    else toast(data.message || 'Failed to reopen', 'error');
  } catch { toast('Connection error', 'error'); }
}

/* ─────────────────── Edit Exam Modal ───────────── */
function openEditModal(exam) {
  document.getElementById('edit-exam-id').value      = exam.id;
  document.getElementById('edit-exam-title').value   = exam.title || '';
  document.getElementById('edit-exam-desc').value    = exam.description || '';

  // ── FIX: Parse stored PHT datetime correctly for datetime-local input ──────
  // DB returns "YYYY-MM-DD HH:mm:ss" in PHT (Asia/Manila).
  // We must NOT use new Date(str) directly — browsers parse bare ISO as UTC,
  // which shifts the displayed time by +8 hours. Instead, read the string directly.
  const fmtForInput = d => {
    if (!d) return '';
    // Strip any timezone suffix and normalize to "YYYY-MM-DDTHH:mm"
    const s = String(d).trim().replace(' ', 'T').slice(0, 16);
    // Validate it looks like a datetime
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? s : '';
  };

  document.getElementById('edit-exam-start').value = fmtForInput(exam.start_time);
  document.getElementById('edit-exam-end').value   = fmtForInput(exam.end_time);
  document.getElementById('modal-edit-exam').classList.remove('hidden');
  setTimeout(() => document.getElementById('edit-exam-title')?.focus(), 80);
}

document.getElementById('btn-cancel-edit')?.addEventListener('click', () => {
  document.getElementById('modal-edit-exam').classList.add('hidden');
});
document.getElementById('modal-edit-exam')?.addEventListener('click', e => {
  if (e.target === document.getElementById('modal-edit-exam'))
    document.getElementById('modal-edit-exam').classList.add('hidden');
});

document.getElementById('btn-save-edit')?.addEventListener('click', async () => {
  const examId    = document.getElementById('edit-exam-id').value;
  const title     = document.getElementById('edit-exam-title').value.trim();
  const desc      = document.getElementById('edit-exam-desc').value.trim();
  const startTime = document.getElementById('edit-exam-start').value; // "YYYY-MM-DDTHH:mm"
  const endTime   = document.getElementById('edit-exam-end').value;

  if (!title) { toast('Title is required', 'error'); return; }

  // ── FIX: Compare as plain strings — both are PHT, no UTC conversion needed ─
  if (startTime && endTime && endTime <= startTime) {
    toast('End time must be after start time', 'error'); return;
  }

  const btn = document.getElementById('btn-save-edit');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const res  = await fetch(`${API_BASE}/exams.php?examId=${examId}&teacherId=${teacherData.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editExam: true, title, description: desc, startTime, endTime }),
    });
    const data = await res.json();
    if (data.success) {
      toast('Exam updated ✓', 'success');
      document.getElementById('modal-edit-exam').classList.add('hidden');
      await loadExams();
    } else toast(data.message || 'Failed to update', 'error');
  } catch { toast('Connection error', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Save Changes'; }
});

/* ═══════════════════════════════════════════════
   RENDER: Activity Log
═══════════════════════════════════════════════ */
function getFilteredSessions() {
  const q = (document.getElementById('session-search')?.value || '').toLowerCase().trim();
  if (!q) return sessions;
  return sessions.filter(s =>
    (s.student_name  || '').toLowerCase().includes(q) ||
    (s.exam_unique_id|| '').toLowerCase().includes(q) ||
    (s.exam_title    || '').toLowerCase().includes(q)
  );
}

/**
 * Match violations to a session.
 *
 * DB sessions   → violations have exam_session_id = session.id
 * GS sessions   → violations have exam_session_id = NULL, matched by
 *                 student_name + exam code (exam_title OR exam_unique_id)
 */
function getSessionViolations(session) {
  const isGS = session.is_google_sheets == 1 || session.is_google_sheets === '1';

  if (isGS) {
    const code = (session.exam_unique_id || session.exam_title || '').trim().toUpperCase();
    const name = (session.student_name || '').trim().toLowerCase();

    return violations.filter(v => {
      if (v.exam_session_id != null) return false;
      const vName = (v.student_name || '').trim().toLowerCase();
      const vCode = (v.exam_title   || '').trim().toUpperCase();
      return vName === name && (vCode === code || vCode === code + ' EXAM');
    });
  }

  return violations.filter(v =>
    v.exam_session_id != null &&
    String(v.exam_session_id) === String(session.id)
  );
}

async function renderSessions() {
  const list     = document.getElementById('sessions-list');
  const filtered = getFilteredSessions();

  const uniqueCodes = [...new Set(filtered.map(s => s.exam_unique_id || s.exam_title).filter(Boolean))];
  await Promise.all(uniqueCodes.map(code => fetchSheetTimer(code)));
  const total    = sessions.length;
  // NOTE: chip-sessions / stat-sessions are updated in loadLiveData() to count
  // ALL unique students (DB sessions + violation-only GSheets students).
  // Do NOT overwrite those counters here with just sessions.length.

  if (!total) {
    list.innerHTML = `
      <div class="empty-box">
        <div class="ei">👁️</div>
        <h3>No active sessions</h3>
        <p>Students appear here once they start an <strong>active</strong> exam.<br>
           Make sure the exam is set to <strong>Active</strong> before students open it.<br>
           <span style="font-size:0.78rem;opacity:0.6;">Use the Refresh button to update.</span></p>
      </div>`;
    return;
  }
  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-box">
        <div class="ei">🔍</div>
        <h3>No results</h3>
        <p>No sessions match your search.</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(session => {
    const sv      = getSessionViolations(session);
    const isOpen  = openSessionId === session.id;
    const code    = session.exam_unique_id || session.exam_title || '—';
    const examLabel = session.exam_title && session.exam_title !== session.exam_unique_id
      ? session.exam_title
      : null;
    const initial = (session.student_name || 'S').charAt(0).toUpperCase();

    const violHtml = sv.length === 0
      ? '<p style="font-size:0.8rem;color:rgba(255,255,255,0.2);text-align:center;padding:0.4rem 0;">No violations recorded.</p>'
      : sv.map(v => `
          <div class="viol-entry">
            <div>
              <div class="viol-type-tag">${(v.violation_type || '').replace(/_/g, ' ')}</div>
            </div>
            <div>
              <div class="viol-entry-desc">${v.description || ''}</div>
              <div class="viol-entry-time">${fmtTime(v.timestamp)}</div>
            </div>
          </div>`).join('');

    // Show violations if any; show Active only if truly still active; show nothing if completed+clean
    const badge = sv.length > 0
      ? `<span class="badge badge-violation" style="font-size:0.73rem;">⚠ ${sv.length} violation${sv.length !== 1 ? 's' : ''}</span>`
      : session.status === 'active'
        ? `<span class="badge badge-live" style="font-size:0.73rem;">● Active</span>`
        : '';

    const startTime = session.start_time_utc8 || session.start_time;
    const endTime   = session.end_time_utc8   || session.end_time;
    const timerMins = sheetTimerCache[(session.exam_unique_id||session.exam_title||'').trim().toUpperCase()];

    return `
      <div class="sess-card ${isOpen ? 'open' : ''}" data-sid="${session.id}">
        <div class="sess-top">
          <div class="sess-left">
            <div class="sess-avatar">${initial}</div>
            <div>
              <div class="sess-name">${session.student_name}</div>
              <div class="sess-times-row">
                <span class="sess-time-block">
                  <span class="sess-time-lbl">Start</span>
                  <span class="sess-time-val">${fmtTime(startTime)}</span>
                </span>
                ${endTime ? `
                <span class="sess-time-sep">→</span>
                <span class="sess-time-block">
                  <span class="sess-time-lbl">End</span>
                  <span class="sess-time-val">${fmtTime(endTime)}</span>
                </span>` : ''}
                ${timerMins ? `<span class="sess-time-block"><span class="sess-time-lbl">⏱</span><span class="sess-time-val">${timerMins} min</span></span>` : ''}
              </div>
              <div class="sess-meta">
                <span style="font-size:0.68rem;color:rgba(255,255,255,0.2);font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Exam</span>
                <span class="sess-code" style="margin-left:0.25rem;">${code}</span>
                ${examLabel ? `<span style="font-size:0.72rem;color:rgba(255,255,255,0.38);">· ${examLabel}</span>` : ''}
                ${session.ip_address ? `&nbsp;·&nbsp;${session.ip_address}` : ''}
              </div>
            </div>
          </div>
          <div>${badge}</div>
        </div>
        <div class="sess-expand">
          <div class="expand-label">Violations (${sv.length})</div>
          ${violHtml}
          <button class="btn-remove-session" data-student="${encodeURIComponent(session.student_name)}" data-code="${encodeURIComponent(code)}" style="margin-top:0.75rem;padding:0.35rem 0.85rem;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#f87171;border-radius:7px;font-size:0.74rem;font-weight:600;cursor:pointer;transition:all 0.15s;" onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'">
            🗑 Remove from Activity Log
          </button>
        </div>
      </div>`;
  }).join('');

  // Expand / collapse + Remove button
  filtered.forEach(session => {
    const el = list.querySelector(`[data-sid="${session.id}"]`);
    if (!el) return;
    el.addEventListener('click', e => {
      if (e.target.closest('.btn-remove-session')) return;
      openSessionId = (openSessionId === session.id) ? null : session.id;
      renderSessions();
    });
    const removeBtn = el.querySelector('.btn-remove-session');
    if (removeBtn) {
      removeBtn.addEventListener('click', async e => {
        e.stopPropagation();
        const studentName = decodeURIComponent(removeBtn.dataset.student);
        const examCode    = decodeURIComponent(removeBtn.dataset.code);
        if (!confirm(`Remove "${studentName}" from the activity log for exam ${examCode}?\n\nThis removes their violations and session record from the dashboard. Their submission in the Google Sheet is NOT affected — delete it there if you want to allow a retake.`)) return;
        removeBtn.textContent = 'Removing…';
        removeBtn.disabled = true;
        try {
          await Promise.all([
            fetch(`${API_BASE}/violations.php?studentName=${encodeURIComponent(studentName)}&examCode=${encodeURIComponent(examCode)}`, { method: 'DELETE' }),
            fetch(`${API_BASE}/exam_sessions.php?studentName=${encodeURIComponent(studentName)}&examCode=${encodeURIComponent(examCode)}`, { method: 'DELETE' })
          ]);
          toast(`Removed ${studentName} from activity log`, 'success');
          await loadLiveData();
        } catch (err) {
          toast('Failed to remove — check console', 'error');
          console.error('[Remove session]', err);
          removeBtn.textContent = '🗑 Remove from Activity Log';
          removeBtn.disabled = false;
        }
      });
    }
  });
}

/* ═══════════════════════════════════════════════
   RENDER: Violations Log
═══════════════════════════════════════════════ */
function getFilteredViolations() {
  const q   = (document.getElementById('violation-search')?.value || '').toLowerCase().trim();
  const sev = document.getElementById('severity-filter')?.value || 'all';
  return violations.filter(v => {
    const matchQ = !q ||
      (v.student_name   || '').toLowerCase().includes(q) ||
      (v.exam_title     || '').toLowerCase().includes(q) ||
      (v.violation_type || '').toLowerCase().includes(q) ||
      (v.description    || '').toLowerCase().includes(q);
    const matchS = sev === 'all' || v.severity === sev;
    return matchQ && matchS;
  });
}

function renderViolations() {
  const list     = document.getElementById('violations-list');
  const filtered = getFilteredViolations();
  const total    = violations.length;

  const relevantExamCodes = new Set(
    exams
      .filter(e => e.status === 'active' || e.status === 'completed' || e.status === 'reopened')
      .flatMap(e => [
        (e.unique_id || '').trim().toUpperCase(),
        ((e.unique_id || '').trim().toUpperCase()) + ' EXAM'
      ])
  );
  const relevantViolationCount = violations.filter(v => {
    const vCode = (v.exam_title || '').trim().toUpperCase();
    return relevantExamCodes.has(vCode);
  }).length;

  const chipViol = document.getElementById('chip-violations');
  if (chipViol) chipViol.textContent = relevantViolationCount;
  const statViol = document.getElementById('stat-violations');
  if (statViol) statViol.textContent = relevantViolationCount;

  if (!list) return;

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-box">
        <div class="ei">🛡️</div>
        <h3>${total === 0 ? 'No violations detected' : 'No results'}</h3>
        <p>${total === 0 ? 'Great — exam integrity is intact.' : 'Try adjusting your search or filters.'}</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(v => `
    <div class="viol-row">
      <div class="viol-left">
        <div class="viol-student">${v.student_name || 'Unknown'}</div>
        <div class="viol-exam-lbl">${v.exam_title || '—'}</div>
        <div class="viol-tags">
          <span class="viol-tag-type">${(v.violation_type || '').replace(/_/g, ' ')}</span>
          ${sevBadge(v.severity)}
        </div>
        <div class="viol-desc-text">${v.description || ''}</div>
      </div>
      <div class="viol-right">
        <div class="viol-time">${fmtTime(v.timestamp)}</div>
        <div class="viol-id">#${v.id}</div>
      </div>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════
   API
═══════════════════════════════════════════════ */
async function loadExams() {
  try {
    const res  = await fetch(`${API_BASE}/exams.php?teacherId=${teacherData.id}`);
    const data = await res.json();
    if (data.success) {
      exams = data.exams || [];
      debugExamTimes(exams); // ── TEMP DEBUG: open browser console to see raw values
    }

    // ── FIX: Use parsePHTtoMs() instead of new Date(str) for PHT-stored times ─
    // new Date("2026-02-26 05:17:00") parses as UTC in browsers, shifting by 8h.
    const nowMs = Date.now();

    // ── Auto-start drafts whose start time has arrived ────────────────────────
    const _asKey = 'proctool-autostarted';
    let _asDone  = JSON.parse(localStorage.getItem(_asKey) || '{}');
    for (const exam of exams) {
      if (exam.status === 'draft' && exam.start_time) {
        const startMs = parsePHTtoMs(exam.start_time);
        if (startMs && nowMs >= startMs && _asDone[exam.id] !== exam.start_time) {
          _asDone[exam.id] = exam.start_time;
          localStorage.setItem(_asKey, JSON.stringify(_asDone));
          await changeStatus(exam.id, 'active');
          toast(`Exam "${exam.title}" started — automatically activated.`, 'info');
        }
      }
    }

    // ── Auto-complete exams whose end time has passed ─────────────────────────
    const _acKey = 'proctool-autocompleted';
    let _acDone  = JSON.parse(localStorage.getItem(_acKey) || '{}');
    for (const exam of exams) {
      if (exam.status === 'active' && exam.end_time) {
        const endMs = parsePHTtoMs(exam.end_time);
        if (endMs && nowMs >= endMs && _acDone[exam.id] !== exam.end_time) {
          _acDone[exam.id] = exam.end_time;
          localStorage.setItem(_acKey, JSON.stringify(_acDone));
          await changeStatus(exam.id, 'completed');
          toast(`Exam "${exam.title}" ended — automatically marked as Completed.`, 'info');
        }
      }
    }

    document.getElementById('stat-active').textContent =
      exams.filter(e => e.status === 'active' || e.status === 'reopened').length;
    renderExams();
  } catch (err) {
    console.error('[loadExams]', err);
  }
}

async function loadLiveData() {
  let fetchOk = false;
  Object.keys(sheetEndTimeCache).forEach(k => delete sheetEndTimeCache[k]);
  try {
    const ts = Date.now();
    const [vRes, sRes] = await Promise.all([
      fetch(`${API_BASE}/violations.php?teacherId=${teacherData.id}&_t=${ts}`),
      fetch(`${API_BASE}/exam_sessions.php?teacherId=${teacherData.id}&_t=${ts}`)
    ]);
    const vData = await vRes.json();
    const sData = await sRes.json();

    if (vData.success) violations = vData.violations || [];
    if (sData.success) sessions   = sData.sessions   || [];

    const gasSessions = sessions.filter(s => s.is_google_sheets);
    if (gasSessions.length) {
      const uniqueCodes = [...new Set(gasSessions.map(s => (s.exam_unique_id || '').trim().toUpperCase()).filter(Boolean))];
      await Promise.all(uniqueCodes.map(code => fetchSheetEndTimes(code)));
      sessions = sessions.map(s => {
        if (!s.is_google_sheets) return s;
        const code    = (s.exam_unique_id || '').trim().toUpperCase();
        const endMap  = sheetEndTimeCache[code] || {};
        const nameRaw = (s.student_name || '').toLowerCase().trim();
        const spaceIdx = nameRaw.indexOf(' ');
        const keyFF    = spaceIdx > -1 ? nameRaw.slice(spaceIdx+1) + '|' + nameRaw.slice(0, spaceIdx) : nameRaw + '|';
        const keyFL    = spaceIdx > -1 ? nameRaw.slice(0, spaceIdx) + '|' + nameRaw.slice(spaceIdx+1) : '|' + nameRaw;
        const endTime  = endMap[keyFF] || endMap[keyFL] || endMap[nameRaw] || null;
        if (endTime) {
          return { ...s, end_time: endTime, end_time_utc8: endTime };
        }
        return s;
      });
    }

    // ── Pull all sheet submissions and inject missing students into sessions ──
    // Students who submitted cleanly (zero violations, no gs_session row yet)
    // only exist in the Google Sheet. Fetch them and add as synthetic sessions.
    try {
      const activeCodes = exams
        .filter(e => e.status === 'active' || e.status === 'completed' || e.status === 'reopened')
        .map(e => (e.unique_id || '').trim().toUpperCase())
        .filter(Boolean);

      // Clear cache so we get fresh data each reload
      Object.keys(sheetSubmissionsCache).forEach(k => delete sheetSubmissionsCache[k]);

      await Promise.all(activeCodes.map(code => fetchSheetSubmissions(code)));

      const existingNames = new Set(
        sessions.map(s => (s.student_name || '').trim().toLowerCase())
      );

      for (const code of activeCodes) {
        const submissions = sheetSubmissionsCache[code] || [];
        const exam = exams.find(e => (e.unique_id || '').toUpperCase() === code);

        for (const sub of submissions) {
          // Build student_name same format as exam.js: "firstName lastName"
          const name = `${sub.firstName || ''} ${sub.lastName || ''}`.trim();
          if (!name) continue;
          const nameLower = name.toLowerCase();

          // Also try "lastName firstName" order
          const nameAlt = `${sub.lastName || ''} ${sub.firstName || ''}`.trim().toLowerCase();

          if (existingNames.has(nameLower) || existingNames.has(nameAlt)) continue;

          // Not in sessions — add as synthetic completed session
          existingNames.add(nameLower);
          sessions.push({
            id:               `SHEET_${code}_${nameLower.replace(/\s+/g,'_')}`,
            exam_id:          exam ? exam.id : null,
            exam_title:       exam ? exam.title : code,
            exam_unique_id:   code,
            student_name:     name,
            student_id:       sub.section || '',
            start_time:       sub.startTime || null,
            start_time_utc8:  sub.startTime || null,
            end_time:         sub.endTime   || null,
            end_time_utc8:    sub.endTime   || null,
            status:           'completed',
            ip_address:       null,
            is_google_sheets: 1,
            violation_count:  0,
          });
        }
      }
    } catch (sheetErr) {
      console.warn('[loadLiveData] Sheet submissions fetch failed:', sheetErr.message);
    }

    // ── Sort all sessions: newest start_time first, regardless of status ──────
    sessions.sort((a, b) => {
      const tA = new Date(((a.start_time_utc8 || a.start_time || '').replace(' ', 'T') + '+08:00')).getTime() || 0;
      const tB = new Date(((b.start_time_utc8 || b.start_time || '').replace(' ', 'T') + '+08:00')).getTime() || 0;
      return tB - tA; // newest first
    });
    // ─────────────────────────────────────────────────────────────────────────

    fetchOk = vData.success && sData.success;

    if (!vData.success) console.error('[loadLiveData] violations.php error:', vData);
    if (!sData.success) console.error('[loadLiveData] exam_sessions.php error:', sData);
  } catch (err) {
    console.error('[loadLiveData] network error:', err);
  }

  renderViolations();
  await renderSessions();

  // ── Count ALL unique students: everyone in sessions array (active + completed)
  // plus any violation-only legacy students not already captured in sessions.
  // sessions array (from exam_sessions.php) is now the authoritative source —
  // it includes ALL gs_exam_sessions rows regardless of violation count.
  const sessionNames = new Set(
    sessions.map(s => (s.student_name || '').trim().toLowerCase()).filter(Boolean)
  );
  // Also pick up any legacy violation-only entries not in sessions
  const violationOnlyNames = new Set(
    violations
      .map(v => (v.student_name || '').trim().toLowerCase())
      .filter(name => name && !sessionNames.has(name))
  );
  const totalUniqueStudents = sessionNames.size + violationOnlyNames.size;
  document.getElementById('stat-sessions').textContent = totalUniqueStudents;
  document.getElementById('chip-sessions').textContent = totalUniqueStudents;

  return fetchOk;
}

async function changeStatus(examId, newStatus) {
  try {
    const res  = await fetch(`${API_BASE}/exams.php?examId=${examId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) { toast(data.message, 'success'); await loadExams(); }
    else toast(data.message || 'Failed to update status', 'error');
  } catch { toast('Connection error', 'error'); }
}

async function deleteExam(examId) {
  if (!confirm('Delete this exam? The exam will be hidden from your dashboard. The admin may still be able to see it.')) return;
  try {
    const res  = await fetch(`${API_BASE}/exams.php?examId=${examId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { toast('Exam deleted', 'success'); await loadExams(); }
    else toast(data.message || 'Failed to delete', 'error');
  } catch { toast('Connection error', 'error'); }
}

/* ═══════════════════════════════════════════════
   Create Exam Modal
═══════════════════════════════════════════════ */
const modalCreate     = document.getElementById('modal-create-exam');
const btnOpenCreate   = document.getElementById('btn-open-create');
const btnCancelCreate = document.getElementById('btn-cancel-create');
const btnCreateExam   = document.getElementById('btn-create-exam');

function openCreateModal() {
  // ── Use local clock for the "now" default — datetime-local inputs are always local ─
  const now   = new Date();
  const later = new Date(now.getTime() + 1800000); // 30 minutes
  const fmt   = d => {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  document.getElementById('exam-title').value = '';
  document.getElementById('exam-desc').value  = '';
  document.getElementById('exam-start').value = fmt(now);
  document.getElementById('exam-end').value   = fmt(later);
  modalCreate.classList.remove('hidden');
  setTimeout(() => document.getElementById('exam-title')?.focus(), 80);
}

btnOpenCreate?.addEventListener('click', openCreateModal);
btnCancelCreate?.addEventListener('click', () => modalCreate.classList.add('hidden'));
modalCreate?.addEventListener('click', e => {
  if (e.target === modalCreate) modalCreate.classList.add('hidden');
});

btnCreateExam?.addEventListener('click', async () => {
  const rawCode  = document.getElementById('exam-title').value.trim();
  const examCode = rawCode.toUpperCase().replace(/\s+/g, '_');
  const desc     = document.getElementById('exam-desc').value.trim();
  const startTime = document.getElementById('exam-start').value; // "YYYY-MM-DDTHH:mm"
  const endTime   = document.getElementById('exam-end').value;

  if (!examCode) { toast('Exam Code is required', 'error'); return; }
  if (exams.some(e => e.title?.toUpperCase().replace(/\s+/g,'_') === examCode)) {
    toast(`An exam with code "${examCode}" already exists`, 'error'); return;
  }
  // ── FIX: Compare as plain strings — both are local PHT from datetime-local input ─
  if (startTime && endTime && endTime <= startTime) {
    toast('End time must be after start time', 'error'); return;
  }

  btnCreateExam.disabled = true;
  btnCreateExam.innerHTML = 'Creating…';

  try {
    const res  = await fetch(`${API_BASE}/exams.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: examCode, description: desc, startTime, endTime, teacherId: teacherData.id })
    });
    const data = await res.json();
    if (!data.success) { toast(data.message || 'Failed to create exam', 'error'); return; }

    toast(`Exam created! Code: ${examCode}`, 'success');

    showSheetPromptModal(examCode);

    const sheetsUrl = window.SHEETS_URL || '';
    if (sheetsUrl && sheetsUrl.startsWith('http')) {
      try {
        btnCreateExam.innerHTML = 'Syncing Sheet…';
        const params = new URLSearchParams({
          action:'createExamSheet', code:examCode,
          title:examCode, description:desc,
          teacher:teacherData.name || '',
          startTime:startTime || '', endTime:endTime || ''
        });
        const shRes   = await fetch(`${sheetsUrl}?${params}`, { redirect:'follow' });
        const shData  = await shRes.json();
        if (shData.success) toast(`Sheet tab "${examCode}" created ✓`, 'success');
        else toast(`Sheet: ${shData.error || shData.message || 'check Apps Script'}`, 'info');
      } catch (shErr) {
        toast('Exam created — Sheets sync failed (see console)', 'info');
        console.warn('[Sheets]', shErr);
      }
    }

    modalCreate.classList.add('hidden');
    await loadExams();
  } catch (err) {
    toast('Connection error — is the server running?', 'error');
    console.error(err);
  } finally {
    btnCreateExam.disabled = false;
    btnCreateExam.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Create Exam';
  }
});

/* ═══════════════════════════════════════════════
   Filter listeners
═══════════════════════════════════════════════ */
document.getElementById('violation-search')?.addEventListener('input', renderViolations);
document.getElementById('severity-filter')?.addEventListener('change', renderViolations);
document.getElementById('session-search')?.addEventListener('input', renderSessions);
document.getElementById('btn-refresh-violations')?.addEventListener('click', () => {
  loadLiveData();
  toast('Data refreshed', 'info');
});

document.getElementById('btn-refresh-exams')?.addEventListener('click', async function () {
  const icon = document.getElementById('exams-refresh-icon');
  this.disabled = true;
  if (icon) icon.style.animation = 'spin 0.6s linear infinite';
  await Promise.all([loadExams(), loadLiveData()]);
  toast('Exams refreshed', 'success');
  setTimeout(() => {
    this.disabled = false;
    if (icon) icon.style.animation = '';
  }, 500);
});

/* ═══════════════════════════════════════════════
   Logout
═══════════════════════════════════════════════ */
document.getElementById('btn-logout')?.addEventListener('click', () => {
  localStorage.removeItem('teacherData');
  localStorage.removeItem('userRole');
  window.location.href = '../index.html';
});

/* ═══════════════════════════════════════════════
   WHITELIST MANAGEMENT
═══════════════════════════════════════════════ */
let currentWhitelistExam = null;

async function openWhitelistModal(exam) {
  currentWhitelistExam = exam;
  document.getElementById('whitelist-exam-title').textContent = `${exam.title} (${exam.unique_id})`;
  document.getElementById('whitelist-names').value = 'Loading...';
  document.getElementById('modal-whitelist').classList.remove('hidden');

  try {
    const res  = await fetch(`${API_BASE}/exam_whitelist.php?examId=${exam.id}`);
    const data = await res.json();
    if (data.success) {
      const names = (data.entries || []).map(e =>
        e.first_name ? `${e.last_name}, ${e.first_name}` : e.last_name
      ).join('\n');
      document.getElementById('whitelist-names').value = names;
    } else {
      document.getElementById('whitelist-names').value = '';
    }
  } catch {
    document.getElementById('whitelist-names').value = '';
    toast('Could not load whitelist', 'error');
  }
}

document.getElementById('btn-cancel-whitelist')?.addEventListener('click', () => {
  document.getElementById('modal-whitelist').classList.add('hidden');
  currentWhitelistExam = null;
});

document.getElementById('modal-whitelist')?.addEventListener('click', e => {
  if (e.target === document.getElementById('modal-whitelist')) {
    document.getElementById('modal-whitelist').classList.add('hidden');
    currentWhitelistExam = null;
  }
});

document.getElementById('btn-save-whitelist')?.addEventListener('click', async () => {
  if (!currentWhitelistExam) return;
  const raw = document.getElementById('whitelist-names').value;
  const names = raw.split('\n').map(n => n.trim()).filter(n => n.length > 0);

  const btn = document.getElementById('btn-save-whitelist');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const res  = await fetch(`${API_BASE}/exam_whitelist.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId: currentWhitelistExam.id, names })
    });
    const data = await res.json();
    if (data.success) {
      toast(data.message || 'Whitelist saved!', 'success');
      document.getElementById('modal-whitelist').classList.add('hidden');
      currentWhitelistExam = null;
    } else {
      toast(data.message || 'Failed to save whitelist', 'error');
    }
  } catch {
    toast('Connection error', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Whitelist';
  }
});

/* ═══════════════════════════════════════════════
   Google Sheet Prompt Modal (post exam creation)
═══════════════════════════════════════════════ */
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1scFoeGZZheTOPCM9eh38thM0mLSY6fU0RgWLrZXk1iY/edit?gid=0#gid=0';

function showSheetPromptModal(examCode) {
  const modal = document.getElementById('modal-sheet-prompt');
  if (!modal) return;
  const codeEl = document.getElementById('sheet-prompt-code');
  if (codeEl) codeEl.textContent = examCode;
  modal.classList.remove('hidden');
}

document.getElementById('btn-close-sheet-prompt')?.addEventListener('click', () => {
  document.getElementById('modal-sheet-prompt')?.classList.add('hidden');
});
document.getElementById('btn-open-sheet')?.addEventListener('click', () => {
  window.open(GOOGLE_SHEET_URL, '_blank');
  document.getElementById('modal-sheet-prompt')?.classList.add('hidden');
});
document.getElementById('modal-sheet-prompt')?.addEventListener('click', e => {
  if (e.target === document.getElementById('modal-sheet-prompt'))
    document.getElementById('modal-sheet-prompt').classList.add('hidden');
});

/* ═══════════════════════════════════════════════
   Init
═══════════════════════════════════════════════ */
async function init() {
  try {
    await Promise.all([loadExams(), loadLiveData()]);
  } finally {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('dashboard-content').classList.remove('hidden');
  }
}

init();
setInterval(async () => {
  await loadLiveData();
  await loadExams();
}, 60000);

// ── Manual refresh (Activity Log "Refresh" button) ──────────────────────────
document.getElementById('btn-manual-refresh')?.addEventListener('click', async function () {
  const btn = this;
  const svg = btn.querySelector('svg');
  btn.disabled = true;
  if (svg) svg.style.animation = 'spin 0.6s linear infinite';

  await loadLiveData();
  await loadExams();
  toast('Activity refreshed', 'success');

  setTimeout(() => {
    btn.disabled = false;
    if (svg) svg.style.animation = '';
  }, 500);
});

/* ═══════════════════════════════════════════════
   Change Password
═══════════════════════════════════════════════ */
const modalChangePassword = document.getElementById('modal-change-password');

document.getElementById('btn-change-password')?.addEventListener('click', () => {
  document.getElementById('cp-current').value = '';
  document.getElementById('cp-new').value = '';
  document.getElementById('cp-confirm').value = '';
  modalChangePassword.classList.remove('hidden');
  setTimeout(() => document.getElementById('cp-current')?.focus(), 80);
});

document.getElementById('btn-cancel-password')?.addEventListener('click', () => {
  modalChangePassword.classList.add('hidden');
});

document.getElementById('btn-save-password')?.addEventListener('click', async () => {
  const current = document.getElementById('cp-current').value;
  const newPass  = document.getElementById('cp-new').value;
  const confirm  = document.getElementById('cp-confirm').value;

  if (!current || !newPass || !confirm) { toast('All fields are required', 'error'); return; }
  if (newPass.length < 6) { toast('New password must be at least 6 characters', 'error'); return; }
  if (newPass !== confirm) { toast('New passwords do not match', 'error'); return; }

  const btn = document.getElementById('btn-save-password');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const res = await fetch(`${API_BASE}/teacher_password.php`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId: teacherData.id, currentPassword: current, newPassword: newPass })
    });
    const data = await res.json();
    if (data.success) {
      toast('Password changed successfully!', 'success');
      modalChangePassword.classList.add('hidden');
    } else {
      toast(data.message || 'Failed to change password', 'error');
    }
  } catch (err) {
    toast('Network error. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Password';
  }
});