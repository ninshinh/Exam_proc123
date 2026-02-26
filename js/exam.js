// js/exam.js — Student Exam Proctoring
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

// ---------- Load session data ----------
const examData    = JSON.parse(localStorage.getItem('examData') || 'null');
const studentData = JSON.parse(localStorage.getItem('studentData') || 'null');
const sessionId   = localStorage.getItem('sessionId') || null;

if (!examData || !studentData) {
  window.location.href = '../index.h  tml';
}

// ---------- Poll exam status — kick student out if exam is deactivated ----------
let examStatusPollInterval = null;
async function pollExamStatus() {
  if (!examData || !examData.id) return;
  try {
    const res  = await fetch(`${API_BASE}/exams.php?examStatusCheck=${examData.id}`);
    const data = await res.json();
    // If API returns the exam and it's no longer active, terminate immediately
    if (data && data.status && data.status !== 'active') {
      clearInterval(examStatusPollInterval);
      terminateExam('⛔ This exam has been deactivated by your teacher. Your session has ended.');
    }
  } catch (e) { /* ignore network errors during polling */ }
}
// Poll every 8 seconds
examStatusPollInterval = setInterval(pollExamStatus, 8000);

// ---------- DOM refs ----------
const examTitle    = document.getElementById('exam-title-display');
const examStudent  = document.getElementById('exam-student-display');
const examIframe   = document.getElementById('exam-iframe');
const timerDisplay = document.getElementById('timer-display');
const vCount       = document.getElementById('violation-count');
const vDisplay     = document.getElementById('violation-display');
const vFlash       = document.getElementById('violation-flash');
const btnSubmit    = document.getElementById('btn-submit-exam');

// ---------- Init display ----------
examTitle.textContent   = examData.title || 'Exam';
examStudent.textContent = `${studentData.name} · ${studentData.studentId || studentData.student_id || ''}`;

// Load exam form into iframe
if (examData.formUrl) {
  examIframe.src = examData.formUrl;
} else {
  examIframe.srcdoc = '<p style="color:red;padding:2rem;">No form URL configured for this exam.</p>';
}

// ---------- Timer ----------
let durationSeconds = (examData.duration || 60) * 60;
let timerInterval = null;

function updateTimer() {
  if (durationSeconds <= 0) {
    clearInterval(timerInterval);
    timerDisplay.textContent = '00:00';
    timerDisplay.classList.add('danger');
    autoSubmit('Time is up! Your exam has been automatically submitted.');
    return;
  }
  durationSeconds--;
  const m = Math.floor(durationSeconds / 60);
  const s = durationSeconds % 60;
  timerDisplay.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

  timerDisplay.classList.remove('warn','danger');
  if (durationSeconds <= 60)       timerDisplay.classList.add('danger');
  else if (durationSeconds <= 300) timerDisplay.classList.add('warn');
}
timerInterval = setInterval(updateTimer, 1000);
updateTimer();

// ---------- Violations ----------
let violationCount = 0;
const MAX_VIOLATIONS = 10; // adjust as needed

async function logViolation(type, description, severity = 'medium') {
  violationCount++;
  vCount.textContent = violationCount;
  vDisplay.style.display = 'inline-flex';

  // Flash message
  vFlash.textContent = `⚠️ ${type.replace(/_/g,' ')} detected`;
  vFlash.style.display = 'block';
  setTimeout(() => { vFlash.style.display = 'none'; }, 3000);

  // Check threshold
  if (violationCount >= MAX_VIOLATIONS) {
    terminateExam('You have exceeded the maximum number of allowed violations.');
    return;
  }

  // Send to server
  try {
    const res = await fetch(`${API_BASE}/violations.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examSessionId: sessionId,
        studentName:   studentData.name,
        examTitle:     examData.title,
        violationType: type,
        description,
        severity,
        timestamp:     new Date().toISOString()
      })
    });
    const data = await res.json();
    // Server blocked it because exam is no longer active — terminate student session
    if (data && data.blocked) {
      clearInterval(examStatusPollInterval);
      terminateExam('⛔ This exam has been deactivated by your teacher. Your session has ended.');
    }
  } catch (e) {
    console.warn('Failed to log violation:', e);
  }
}

// ---------- Proctoring events ----------

// Tab / window switch
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    logViolation('TAB_SWITCH', 'Student switched tabs, minimized window, or switched applications');
  }
});

window.addEventListener('blur', () => {
  logViolation('WINDOW_SWITCH', 'Student switched to another application or window');
});

// Right-click disable
document.addEventListener('contextmenu', e => {
  e.preventDefault();
  logViolation('RIGHT_CLICK', 'Student attempted to right-click', 'low');
});

// Copy / paste / cut
document.addEventListener('copy',  e => { e.preventDefault(); logViolation('COPY_ATTEMPT', 'Student attempted to copy content'); });
document.addEventListener('paste', e => { e.preventDefault(); logViolation('PASTE_ATTEMPT', 'Student attempted to paste content'); });
document.addEventListener('cut',   e => { e.preventDefault(); logViolation('CUT_ATTEMPT',  'Student attempted to cut content'); });

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  // Disable F12, Ctrl+Shift+I/J/C, Ctrl+U
  if (e.key === 'F12') { e.preventDefault(); logViolation('DEVTOOLS_ATTEMPT', 'Student attempted to open developer tools', 'high'); }
  if (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) {
    e.preventDefault(); logViolation('DEVTOOLS_ATTEMPT', 'Student attempted to open developer tools', 'high');
  }
  if (e.ctrlKey && e.key.toUpperCase() === 'U') { e.preventDefault(); logViolation('VIEW_SOURCE', 'Student attempted to view page source', 'high'); }
});

// Fullscreen detection
function checkFullscreen() {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
  if (!isFs) {
    const fsMsg = document.getElementById('fullscreen-msg');
    if (fsMsg) { fsMsg.style.display = 'block'; setTimeout(() => fsMsg.style.display = 'none', 4000); }
    logViolation('FULLSCREEN_EXIT', 'Student exited fullscreen mode during exam');
  }
}
document.addEventListener('fullscreenchange', checkFullscreen);
document.addEventListener('webkitfullscreenchange', checkFullscreen);

// Try to enter fullscreen on load
setTimeout(() => {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}, 500);

// ---------- Submit / Terminate ----------
function terminateExam(reason) {
  clearInterval(timerInterval);
  clearInterval(examStatusPollInterval);
  document.getElementById('terminated-reason').textContent = reason;
  document.getElementById('terminated-overlay').classList.remove('hidden');
}

function autoSubmit(reason) {
  toast(reason, 'error');
  setTimeout(() => window.location.href = '../index.html', 3000);
}

btnSubmit?.addEventListener('click', () => {
  if (confirm('Are you sure you want to submit your exam?')) {
    clearInterval(timerInterval);
    toast('Exam submitted successfully!', 'success');
    setTimeout(() => window.location.href = '../index.html', 1500);
  }
});

// Show fullscreen hint on load
setTimeout(() => {
  const fsMsg = document.getElementById('fullscreen-msg');
  if (fsMsg) {
    fsMsg.style.display = 'block';
    setTimeout(() => fsMsg.style.display = 'none', 5000);
  }
}, 1000);
