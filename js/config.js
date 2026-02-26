// config.js — Auto-detects API base URL regardless of folder name or depth
// This file must be loaded FIRST before app.js / dashboard.js / exam.js

(function () {
  // Walk up from current script location to find the project root
  // Strategy: the api/ folder is always at the project root.
  // We detect by finding the common ancestor of index.html.

  const scripts = document.getElementsByTagName('script');
  let configSrc = '';
  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].src && scripts[i].src.includes('config.js')) {
      configSrc = scripts[i].src;
      break;
    }
  }

  // configSrc is like: http://localhost/exam_system/js/config.js
  // We need:           http://localhost/exam_system/api
  let apiBase = '';
  if (configSrc) {
    // Remove /js/config.js, add /api
    apiBase = configSrc.replace(/\/js\/config\.js.*$/, '/api');
  } else {
    // Fallback: derive from window.location
    const path = window.location.pathname; // e.g. /exam_system/index.html
    const parts = path.split('/').filter(Boolean);
    // Remove file name
    parts.pop();
    // Go up if we're in a subfolder (teacher/ or student/)
    const depth = parts.length;
    // The api/ folder is at the same level as index.html
    // index.html is at root, teacher/dashboard.html is 1 deep, student/exam.html is 1 deep
    const prefix = window.location.origin + '/' + parts.slice(0, 1).join('/');
    apiBase = prefix + '/api';
  }

  window.API_BASE = apiBase;
  console.log('[Config] API_BASE =', window.API_BASE);

  // ── Google Apps Script Web App URL ──────────────────────────────────────────
  // Paste your deployed Apps Script URL here (deploy as "Anyone" can access).
  // Example: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
  window.SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx8Onmq8LVYzmIRiA_wklokZZ1W1wPi9u08XdM_RNRvRbgrW2lxoGoFYGHbt1Eg8VgR_w/exec';
  console.log('[Config] SHEETS_URL =', window.SHEETS_URL);
})();
