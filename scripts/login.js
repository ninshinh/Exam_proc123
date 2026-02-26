/* login.js — Student exam entry with whitelist check, required fields, and popup messages */

const SHEETS_API = window.ANSWER_API_URL || 'https://script.google.com/macros/s/AKfycbx8Onmq8LVYzmIRiA_wklokZZ1W1wPi9u08XdM_RNRvRbgrW2lxoGoFYGHbt1Eg8VgR_w/exec';
const PHP_API    = window.location.origin +
  window.location.pathname.replace(/\/[^\/]*$/, '') + '/api';

// ── FIX: Declare checkData at module scope so agreeBtn can always read it ─────
let checkData = {};

// ── Bootstrap modals (guarded — won't crash if element is missing in HTML) ────
function getModal(id) {
  const el = document.getElementById(id);
  if (!el) { console.warn(`[Login] Modal element #${id} not found in HTML`); return null; }
  return new bootstrap.Modal(el);
}

const instructionModal = getModal('instructionModal');
const duplicateModal   = getModal('duplicateModal');
const errorModal       = getModal('errorModal');
const noInternetModal  = getModal('noInternetModal');

function showError(html) {
  const el = document.getElementById('errorText');
  if (el) el.innerHTML = html;
  if (errorModal) {
    errorModal.show();
  } else {
    alert(html.replace(/<[^>]*>/g, ''));
  }
}

function requestFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen)       return el.requestFullscreen();
  if (el.mozRequestFullScreen)    return el.mozRequestFullScreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  if (el.msRequestFullscreen)     return el.msRequestFullscreen();
  return Promise.resolve();
}

// ── Fetch with timeout helper ─────────────────────────────────────────────────
function fetchWithTimeout(url, opts = {}, ms = 6000) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(tid));
}

// ── Field validation highlight ────────────────────────────────────────────────
function highlightEmpty(fieldId) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.style.borderColor = '#ef4444';
  el.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.25)';
  el.addEventListener('input', function clearHighlight() {
    el.style.borderColor = '';
    el.style.boxShadow = '';
    el.removeEventListener('input', clearHighlight);
  }, { once: true });
}

// ── BEGIN EXAM ────────────────────────────────────────────────────────────────
const startBtn = document.getElementById('startBtn');

if (startBtn) {
  startBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const lastName  = (document.getElementById('lastName')?.value  || '').trim();
    const firstName = (document.getElementById('firstName')?.value || '').trim();
    const section   = (document.getElementById('section')?.value   || '').trim();
    const code      = (document.getElementById('code')?.value      || '').trim().toUpperCase();

    // Required field validation
    const missing = [];
    if (!lastName)  { highlightEmpty('lastName');  missing.push('Last Name'); }
    if (!firstName) { highlightEmpty('firstName'); missing.push('First Name'); }
    if (!section)   { highlightEmpty('section');   missing.push('Section'); }
    if (!code)      { highlightEmpty('code');       missing.push('Test Code'); }

    if (missing.length) {
      showError(`<strong>All fields are required.</strong><br>Please fill in: <em>${missing.join(', ')}</em>.`);
      return;
    }

    checkData = { lastName, firstName, section, code };

    const spinner = document.getElementById('startLoadingSpinner');
    if (spinner) spinner.style.display = 'block';
    startBtn.disabled = true;

    try {
      // ── Step 1: PHP exam status check (FATAL — invalid code blocks entry) ──
      try {
        const phpRes  = await fetchWithTimeout(`${PHP_API}/exams.php?examStatusByCode=${encodeURIComponent(code)}`);
        const phpData = await phpRes.json();

        // ── FIX: Reject unknown exam codes ───────────────────────────────────
        if (phpData.found === false) {
          showError(`<strong>⛔ Invalid Exam Code</strong><br>No exam found with code <strong>${code}</strong>. Please check your code and try again.`);
          return;
        }

        if (phpData.found === true) {
          // ── FIX: Save server time so we use it instead of client clock ──────
          if (phpData.serverTime) {
            sessionStorage.setItem('exam_server_time', phpData.serverTime);
          }

          if (phpData.blocked) {
            showError(`<strong>⛔ Exam Not Available</strong><br>${phpData.blockReason || 'This exam is not currently accessible.'}`);
            return;
          }
          if (phpData.status && phpData.status !== 'active') {
            const msg = {
              draft:     'This exam has not been opened yet. Please wait for your teacher to activate it.',
              completed: 'This exam has already ended.',
              cancelled: 'This exam has been cancelled.',
              inactive:  'This exam is currently inactive.',
            }[phpData.status] || 'This exam is currently unavailable.';
            showError(`<strong>⛔ Exam Not Available</strong><br>${msg}`);
            return;
          }
        }
      } catch (phpErr) {
        // ── FIX: PHP check is now semi-fatal — if it's a network/timeout error
        //    we warn and continue, but a clear "found: false" above will block. ─
        console.warn('[Login] PHP check failed (network/timeout):', phpErr.message);
        // Non-fatal for network errors only — continue to exam
      }

      // ── Step 2: Whitelist check ───────────────────────────────────────────
      try {
        const wlRes  = await fetchWithTimeout(`${PHP_API}/exam_whitelist.php?checkAccess&examCode=${encodeURIComponent(code)}&lastName=${encodeURIComponent(lastName)}&firstName=${encodeURIComponent(firstName)}`);
        const wlData = await wlRes.json();
        if (wlData.whitelistEnabled && !wlData.allowed) {
          showError(`<strong>🚫 Not Allowed to Take This Exam</strong><br>Your name (<em>${firstName} ${lastName}</em>) is not on the access list for exam <strong>${code}</strong>.<br><br>Please contact your teacher if you believe this is an error.`);
          return;
        }
      } catch (wlErr) {
        console.warn('[Login] Whitelist check skipped:', wlErr.message);
      }

      // ── Step 3: Sheets duplicate check ───────────────────────────────────
      if (SHEETS_API) {
        try {
          const params = new URLSearchParams({ action: 'checkDuplicate', lastName, firstName, section, code });
          const dupRes  = await fetchWithTimeout(SHEETS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
          }, 8000);
          const dupData = await dupRes.json();
          if (dupData.exists) {
            const dt = document.getElementById('duplicateText');
            if (dt) dt.textContent = 'A student with this name and section has already taken this exam. Please contact your instructor.';
            if (duplicateModal) duplicateModal.show();
            return;
          }
        } catch (sheetsErr) {
          console.warn('[Login] Sheets duplicate check skipped:', sheetsErr.message);
        }
      }

      // ── Step 4: Honeypot anti-bot check ──────────────────────────────────
      /* const honeypot = document.getElementById('hp_email');
      if (honeypot && honeypot.value !== '') {
        showError(`<strong>⚠️ Access Denied</strong><br>Automated submissions are not permitted. You will be redirected.`);
        setTimeout(() => { window.location.href = 'index.html'; }, 2500);
        return;
      } */ // we will implement this in the future if bot traffic becomes an issue, but for now it causes more false positives than benefits

      // ── Step 5: Show instructions ─────────────────────────────────────────
      const instructionsText = document.getElementById('instructionsText');
      if (instructionsText) {
        instructionsText.innerHTML = `
          <p><strong>Welcome to the ${code} Exam</strong></p>
          <ol style="line-height:2;">
            <li>Answer each question to the best of your ability.</li>
            <li>You can skip questions and return to them later.</li>
            <li><strong>Fullscreen mode will be enforced throughout the exam.</strong></li>
            <li>Exiting fullscreen counts as a violation.</li>
            <li>The exam auto-submits after 3 violations.</li>
            <li>Ensure a stable internet connection throughout.</li>
          </ol>`;
      }

      if (instructionModal) {
        instructionModal.show();
      } else {
        console.warn('[Login] instructionModal not found, navigating directly.');
        navigateToExam();
      }

    } catch (err) {
      showError(`<strong>Unexpected Error</strong><br>${err.message}<br><br>Please try again.`);
    } finally {
      if (spinner) spinner.style.display = 'none';
      startBtn.disabled = false;
    }
  });
}

// ── Navigate to exam ──────────────────────────────────────────────────────────
function navigateToExam() {
  sessionStorage.setItem('exam_fullscreen_required', 'true');

  // ── FIX: Prefer server time over client clock to avoid time mismatch ───────
  const serverTime = sessionStorage.getItem('exam_server_time') || new Date().toISOString();
  sessionStorage.setItem('exam_start_time', serverTime);

  requestFullscreen().catch(e => console.warn('[Fullscreen]', e));

  setTimeout(() => {
    const url = new URL('exam.html', window.location.href);
    url.searchParams.set('lastName',  checkData.lastName);
    url.searchParams.set('firstName', checkData.firstName);
    url.searchParams.set('section',   checkData.section);
    url.searchParams.set('code',      checkData.code);
    url.searchParams.set('startTime', sessionStorage.getItem('exam_start_time') || serverTime);
    window.location.href = url.toString();
  }, 400);
}

// ── Agree → fullscreen → navigate ────────────────────────────────────────────
const agreeBtn = document.getElementById('agreeBtn');
if (agreeBtn) {
  agreeBtn.addEventListener('click', async () => {
    if (instructionModal) instructionModal.hide();

    if (!checkData.lastName || !checkData.code) {
      showError('<strong>Session Error</strong><br>Please go back and fill in your details again.');
      return;
    }

    try { await requestFullscreen(); }
    catch (e) { console.warn('[Fullscreen]', e); }

    navigateToExam();
  });
}

const cancelStart = document.getElementById('cancelStart');
if (cancelStart) cancelStart.addEventListener('click', () => {
  if (instructionModal) instructionModal.hide();
});

const retryOnline = document.getElementById('retryOnline');
if (retryOnline) {
  retryOnline.addEventListener('click', () => {
    if (noInternetModal) noInternetModal.hide();
    if (navigator.onLine) startBtn?.click();
    else alert('Still no internet. Please check your connection.');
  });
}

window.addEventListener('online',  () => { if (noInternetModal) noInternetModal.hide(); });
window.addEventListener('offline', () => {
  const nit = document.getElementById('noInternetText');
  if (nit) nit.textContent = 'Internet connection lost. Please reconnect and try again.';
  if (noInternetModal) noInternetModal.show();
});