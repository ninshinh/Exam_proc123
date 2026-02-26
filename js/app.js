// js/app.js — Login portal logic
// API_BASE is set automatically by config.js (loaded before this file)
const API_BASE = window.API_BASE;

// ---------- Toast ----------
function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ---------- Tab switching ----------
document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab)?.classList.add('active');
  });
});

// ---------- State ----------
let studentData = null;
let studentIdValue = '';

// ---------- Phase 1: Student ID ----------
const btnStudentLogin = document.getElementById('btn-student-login');
const studentIdInput  = document.getElementById('studentId');

async function doStudentPhase1() {
  const sid = studentIdInput.value.trim();
  if (!sid) { toast('Please enter your Student ID', 'error'); return; }

  studentIdValue = sid;
  btnStudentLogin.disabled = true;
  btnStudentLogin.textContent = 'Verifying...';

  try {
    const res  = await fetch(`${API_BASE}/auth_student.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: sid })
    });
    const data = await res.json();

    if (data.success) {
      studentData = data.student;
      localStorage.setItem('userRole', 'student');
      localStorage.setItem('studentData', JSON.stringify(data.student));

      document.getElementById('welcome-msg').textContent =
        `👋 Welcome, ${data.student.name}!`;
      document.getElementById('modal-formid').classList.remove('hidden');
      document.getElementById('uniqueFormId').value = '';
      toast(`ID verified! Enter your Exam Form ID.`, 'success');
    } else {
      toast(data.message || 'Student ID not found', 'error');
    }
  } catch (e) {
    toast('Connection error. Is the server running?', 'error');
    console.error(e);
  } finally {
    btnStudentLogin.disabled = false;
    btnStudentLogin.textContent = 'Continue to Exam Access';
  }
}

btnStudentLogin.addEventListener('click', doStudentPhase1);
studentIdInput.addEventListener('keydown', e => e.key === 'Enter' && doStudentPhase1());

// ---------- Phase 2: Form ID ----------
const btnFormSubmit  = document.getElementById('btn-form-submit');
const btnFormBack    = document.getElementById('btn-form-back');
const formIdInput    = document.getElementById('uniqueFormId');

formIdInput.addEventListener('input', () => {
  formIdInput.value = formIdInput.value.toUpperCase();
});

async function doStudentPhase2() {
  const formId = formIdInput.value.trim();
  if (!formId) { toast('Please enter the Unique Form ID', 'error'); return; }

  btnFormSubmit.disabled = true;
  btnFormSubmit.textContent = 'Checking ID...';

  try {
    const res  = await fetch(`${API_BASE}/auth_student.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: studentIdValue, uniqueFormId: formId })
    });
    const data = await res.json();

    if (data.success) {
      // Save session data for exam page
      localStorage.setItem('examData',    JSON.stringify(data.exam));
      localStorage.setItem('sessionId',   data.sessionId   || '');
      localStorage.setItem('sessionToken', data.sessionToken || '');
      if (data.student) localStorage.setItem('studentData', JSON.stringify(data.student));

      toast('Access granted! Starting exam...', 'success');
      setTimeout(() => {
        window.location.href = 'student/exam.html';
      }, 800);
    } else {
      toast(data.message || 'Invalid Unique Form ID', 'error');
    }
  } catch (e) {
    toast('Connection error. Please try again.', 'error');
    console.error(e);
  } finally {
    btnFormSubmit.disabled = false;
    btnFormSubmit.textContent = 'Start Exam';
  }
}

btnFormSubmit.addEventListener('click', doStudentPhase2);
formIdInput.addEventListener('keydown',  e => e.key === 'Enter' && doStudentPhase2());
btnFormBack.addEventListener('click', () => {
  document.getElementById('modal-formid').classList.add('hidden');
});

// ---------- Teacher Login ----------
const btnTeacherLogin = document.getElementById('btn-teacher-login');

async function doTeacherLogin() {
  const email    = document.getElementById('teacherEmail').value.trim();
  const password = document.getElementById('teacherPassword').value;

  if (!email || !password) { toast('Please enter both email and password', 'error'); return; }

  btnTeacherLogin.disabled = true;
  btnTeacherLogin.textContent = 'Authenticating...';

  try {
    const res  = await fetch(`${API_BASE}/auth_teacher.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem('userRole',    'teacher');
      localStorage.setItem('teacherData', JSON.stringify(data.teacher));
      toast('Login successful! Redirecting...', 'success');
      setTimeout(() => { window.location.href = 'teacher/dashboard.html'; }, 600);
    } else {
      toast(data.message || 'Invalid credentials', 'error');
    }
  } catch (e) {
    toast('Connection error. Is the server running?', 'error');
    console.error(e);
  } finally {
    btnTeacherLogin.disabled = false;
    btnTeacherLogin.textContent = 'Access Dashboard';
  }
}

btnTeacherLogin.addEventListener('click', doTeacherLogin);
document.getElementById('teacherPassword').addEventListener('keydown', e => e.key === 'Enter' && doTeacherLogin());
