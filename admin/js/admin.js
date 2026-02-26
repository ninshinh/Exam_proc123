/* ============================================================
   I.T Proctool — Admin Dashboard JS
   ============================================================ */

// ---- Auth Guard ----
const adminAuth = JSON.parse(sessionStorage.getItem('adminAuth') || 'null');
if (!adminAuth) window.location.href = 'login.html';

if (adminAuth) {
  document.getElementById('adminRoleLabel').textContent = `${adminAuth.name} – ${adminAuth.role}`;
  document.getElementById('adminNameLabel').textContent = adminAuth.name;
}

const API = '../api';

// ---- Toast ----
const toast = document.getElementById('toast');
let toastTimer;
function showToast(msg, type = '') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3200);
}

// ---- Navigation ----
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    const pageEl = document.getElementById('page-' + item.dataset.page);
    if (pageEl) pageEl.classList.add('active');
    const page = item.dataset.page;
    if (page === 'overview') loadOverview();
    if (page === 'teachers') loadSysLogs();
  });
});

// ---- Modal helpers ----
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('[data-close]').forEach(el => {
  el.addEventListener('click', () => closeModal(el.dataset.close));
});
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) backdrop.classList.remove('open');
  });
});

// ---- Logout ----
document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('adminAuth');
  window.location.href = 'login.html';
});

// =========================================================
//  API Helper
// =========================================================
async function apiFetch(url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      ...opts
    });
    return await res.json();
  } catch (err) {
    return { success: false, message: 'Network error.' };
  }
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { month:'numeric', day:'numeric', year:'numeric', timeZone:'Asia/Manila' });
}

// =========================================================
//  OVERVIEW
// =========================================================
async function loadOverview() {
  loadStats();
  loadTeachers();
}

async function loadStats() {
  const data = await apiFetch(`${API}/admin_stats.php`);
  if (data.success) {
    document.getElementById('statTeachers').textContent = data.teachers ?? '—';
    document.getElementById('statExams').textContent    = data.activeExams ?? '0';
    const dot  = document.querySelector('#statSystem .sys-dot');
    const txt  = document.getElementById('statSystemText');
    if (data.dbConnected) {
      if (dot) dot.style.background = '#10b981';
      if (txt) txt.textContent = 'Connected to MySQL';
    } else {
      if (dot) { dot.style.background = '#ef4444'; dot.style.animation = 'none'; }
      if (txt) { txt.textContent = 'Disconnected'; txt.style.color = '#f87171'; }
    }
  }
}

// =========================================================
//  TEACHERS — Card-based UI matching screenshot
// =========================================================
let teachersList = [];
const expandedTeachers = new Set();

async function loadTeachers() {
  const data = await apiFetch(`${API}/admin_teachers.php`);
  const container = document.getElementById('teachersContainer');
  if (!data.success) { container.innerHTML = '<div class="empty">Could not load teachers.</div>'; return; }
  teachersList = data.teachers || [];
  const countBadge = document.getElementById('teacherCountBadge');
  if (countBadge) countBadge.textContent = teachersList.length;
  renderTeacherCards(container);
}

function renderTeacherCards(container) {
  if (!teachersList.length) {
    container.innerHTML = '<div class="empty">No teachers found.</div>';
    return;
  }

  const STATUS_COLORS = { active: '#10b981', inactive: '#64748b' };

  container.innerHTML = '<div class="teacher-cards">' + teachersList.map(t => {
    const sc    = STATUS_COLORS[t.status] || '#64748b';
    const isExp = expandedTeachers.has(t.id);
    return `
      <div class="teacher-card ${isExp ? 'expanded' : ''}" id="tcard-${t.id}">
        <div class="tc-main" onclick="toggleTeacherCard(${t.id})">
          <div class="tc-info">
            <div class="tc-name-row">
              <span class="tc-name">${escHtml(t.name)}</span>
              <span class="tc-chevron">${isExp ? '&#8963;' : '&#8964;'}</span>
            </div>
            <div class="tc-email">${escHtml(t.email)}</div>
            <span class="tc-created">Created: ${fmtDate(t.created_at)}</span>
          </div>
          <div class="tc-actions" onclick="event.stopPropagation()">
            <span class="status-badge status-${t.status || 'inactive'}" style="margin-right:0.25rem;">${t.status || 'inactive'}</span>
            <button class="tc-btn-icon" title="Edit" onclick="editTeacher(${t.id})">
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="tc-btn-icon del" title="Delete" onclick="deleteTeacher(${t.id})">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>
        <div class="tc-exams-panel" id="tcpanel-${t.id}">
          <div class="tc-exams-label">Exams Created by ${escHtml(t.name)}</div>
          <div id="tcexams-${t.id}" class="tc-exams-msg">Loading exams…</div>
        </div>
      </div>`;
  }).join('') + '</div>';

  // If any were already expanded, re-load their exams
  expandedTeachers.forEach(id => loadTeacherExamsInline(id));
}

window.toggleTeacherCard = async function(teacherId) {
  if (expandedTeachers.has(teacherId)) {
    expandedTeachers.delete(teacherId);
  } else {
    expandedTeachers.add(teacherId);
    loadTeacherExamsInline(teacherId);
  }
  const card = document.getElementById(`tcard-${teacherId}`);
  if (!card) return;
  card.classList.toggle('expanded', expandedTeachers.has(teacherId));
  // Update chevron
  const chev = card.querySelector('.tc-chevron');
  if (chev) chev.innerHTML = expandedTeachers.has(teacherId) ? '&#8963;' : '&#8964;';
};

async function loadTeacherExamsInline(teacherId) {
  const container = document.getElementById(`tcexams-${teacherId}`);
  if (!container) return;
  container.innerHTML = '<span class="tc-exams-msg">Loading…</span>';

  const teacher = teachersList.find(t => t.id === teacherId);
  const data = await apiFetch(`${API}/admin_exams.php?teacherId=${teacherId}`);
  const exams = data.exams || [];

  if (!exams.length) {
    container.innerHTML = '<div class="tc-exams-msg">No exams found for this teacher.</div>';
    return;
  }

  const STATUS_COLORS = {
    active:    '#10b981',
    draft:     '#64748b',
    completed: '#3b82f6',
    cancelled: '#ef4444',
    deleted:   '#7c3aed',
  };
  const STATUS_LABELS = {
    active:    'active',
    draft:     'draft',
    completed: 'completed',
    cancelled: 'cancelled',
    deleted:   'deleted',
  };

  container.innerHTML = '<div class="exam-mini-grid">' + exams.map(ex => {
    const isDeleted = ex.teacher_deleted == 1 || ex.teacher_deleted === '1';
    const statusKey = isDeleted ? 'deleted' : (ex.status || 'draft');
    const color = STATUS_COLORS[statusKey] || '#64748b';
    const label = isDeleted ? 'deleted' : STATUS_LABELS[statusKey] || statusKey;

    // Admin can permanently delete OR restore teacher-deleted exams
    const footRight = isDeleted
      ? `<div style="display:flex;gap:6px;flex-wrap:wrap;">
           <button class="exam-mini-del-btn" style="background:#7c3aed18;color:#7c3aed;border-color:#7c3aed40;" onclick="adminRestoreExam(${ex.id}, ${teacherId})">↩ Restore</button>
           <button class="exam-mini-del-btn" onclick="adminPermanentDelete(${ex.id}, ${teacherId}, '${escHtml(ex.title).replace(/'/g,"\\'")}')">🗑 Delete</button>
         </div>`
      : `<span class="exam-mini-date">${fmtDate(ex.created_at)}</span>`;

    return `
      <div class="exam-mini-card">
        <div class="exam-mini-title">${escHtml(ex.title)}</div>
        <div class="exam-mini-code">Code: <strong>${escHtml(ex.unique_id)}</strong></div>
        <div class="exam-mini-foot">
          <span class="exam-mini-sbadge" style="background:${color}18;color:${color};border-color:${color}40;">
            ${label}
          </span>
          ${footRight}
        </div>
      </div>`;
  }).join('') + '</div>';
}

// ---- Styled delete confirmation modal ----
let _pendingDeleteId   = null;
let _pendingTeacherId  = null;

window.adminPermanentDelete = function(examId, teacherId, examTitle) {
  _pendingDeleteId  = examId;
  _pendingTeacherId = teacherId;
  const preview = document.getElementById('deleteExamPreview');
  if (preview && examTitle) {
    preview.innerHTML = `<span class="del-preview-label">Exam:</span> <strong>${escHtml(examTitle)}</strong>`;
  } else if (preview) {
    preview.innerHTML = '';
  }
  openModal('deleteConfirmModal');
};

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!_pendingDeleteId) return;
  const examId    = _pendingDeleteId;
  const teacherId = _pendingTeacherId;
  _pendingDeleteId  = null;
  _pendingTeacherId = null;
  closeModal('deleteConfirmModal');
  const data = await apiFetch(`${API}/admin_exams.php?examId=${examId}`, { method: 'DELETE' });
  if (data.success) {
    showToast('Exam permanently deleted.', 'success');
    loadTeacherExamsInline(teacherId);
  } else {
    showToast(data.message || 'Error deleting exam.', 'error');
  }
});

window.adminRestoreExam = async function(examId, teacherId) {
  const data = await apiFetch(`${API}/admin_exams.php?examId=${examId}&restore=1`, { method: 'PATCH' });
  if (data.success) {
    showToast('Exam restored — teacher can see it again.', 'success');
    loadTeacherExamsInline(teacherId);
  } else {
    showToast(data.message || 'Error restoring exam.', 'error');
  }
};

// ---- Eye toggle ----
document.getElementById('toggleTeacherPass')?.addEventListener('click', () => {
  const inp = document.getElementById('teacherPass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

// ---- Add Teacher ----
document.getElementById('addTeacherBtn').addEventListener('click', () => {
  document.getElementById('teacherModalTitle').textContent = 'Add Teacher';
  document.getElementById('teacherForm').reset();
  document.getElementById('teacherId').value = '';
  document.getElementById('teacherPassLabel').textContent = 'Password';
  document.getElementById('teacherPass').placeholder = 'Set password';
  document.getElementById('teacherPassHint').style.display = 'none';
  openModal('teacherModal');
});

// ---- Edit Teacher ----
window.editTeacher = function(id) {
  const t = teachersList.find(x => x.id === id);
  if (!t) return;
  document.getElementById('teacherModalTitle').textContent = 'Edit Teacher';
  document.getElementById('teacherId').value     = t.id;
  document.getElementById('teacherName').value   = t.name;
  document.getElementById('teacherEmail').value  = t.email;
  document.getElementById('teacherStatus').value = t.status || 'active';
  document.getElementById('teacherPass').value = '';
  document.getElementById('teacherPassLabel').textContent = 'New Password';
  document.getElementById('teacherPass').placeholder = 'Leave blank to keep current';
  document.getElementById('teacherPassHint').style.display = 'block';
  openModal('teacherModal');
};

// ---- Save Teacher ----
document.getElementById('teacherForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id   = document.getElementById('teacherId').value;
  const body = {
    name:   document.getElementById('teacherName').value.trim(),
    email:  document.getElementById('teacherEmail').value.trim(),
    status: document.getElementById('teacherStatus').value,
  };
  const passVal = document.getElementById('teacherPass').value;
  if (passVal) body.password = passVal;

  const url    = id ? `${API}/admin_teachers.php?id=${id}` : `${API}/admin_teachers.php`;
  const method = id ? 'PUT' : 'POST';
  const data   = await apiFetch(url, { method, body: JSON.stringify(body) });

  if (data.success) {
    showToast(id ? 'Teacher updated!' : 'Teacher added!', 'success');
    closeModal('teacherModal');
    loadTeachers();
  } else {
    showToast(data.message || 'Error saving teacher.', 'error');
  }
});

window.toggleTeacherStatus = async function(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const data = await apiFetch(`${API}/admin_teachers.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: newStatus })
  });
  if (data.success) { showToast(`Teacher ${newStatus}!`, 'success'); loadTeachers(); }
  else showToast(data.message || 'Error.', 'error');
};

window.deleteTeacher = async function(id) {
  if (!confirm('Delete this teacher? This cannot be undone.')) return;
  const data = await apiFetch(`${API}/admin_teachers.php?id=${id}`, { method: 'DELETE' });
  if (data.success) { showToast('Teacher deleted.', 'success'); expandedTeachers.delete(id); loadTeachers(); }
  else showToast(data.message || 'Error.', 'error');
};

// =========================================================
//  SYSTEM LOGS
// =========================================================
async function loadSysLogs() {
  const container = document.getElementById('sysLogsContainer');
  if (!container) return;
  container.innerHTML = '<div class="loading">Loading…</div>';
  const data = await apiFetch(`${API}/admin_logs.php?limit=50`);
  if (!data.success || !data.logs?.length) {
    container.innerHTML = '<div class="empty">No system logs found.</div>';
    return;
  }
  container.innerHTML = '<div class="logs-list">' + data.logs.map(log => `
    <div class="log-entry">
      <div class="log-entry-top">
        <span class="log-tag ${log.user_type || 'info'}">${log.user_type || 'system'}</span>
        <span class="log-desc">${escHtml(log.description || log.action)}</span>
        <span class="log-time">${new Date(log.timestamp).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>
      </div>
    </div>`).join('') + '</div>';
}

// =========================================================
//  INIT
// =========================================================
loadOverview();
