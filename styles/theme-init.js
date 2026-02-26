/* ============================================================
   I.T PROCTOOL — Theme Toggle Logic (inline in <head>)
   Apply saved theme immediately to prevent flash of wrong theme
   ============================================================ */
(function () {
  const saved = localStorage.getItem('proctool-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();
