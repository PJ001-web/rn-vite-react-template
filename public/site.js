// Resilience Nexus — shared site behaviour
(function () {
  // Mobile nav toggle
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-nav-toggle]');
    if (t) {
      var links = document.querySelector('.nav-links');
      if (links) links.classList.toggle('open');
    }
  });

  // Scroll reveal
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  // Stagger helper: any [data-stagger] gets incremental transition-delay on .reveal children
  function initStagger() {
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      var kids = group.querySelectorAll('.reveal');
      kids.forEach(function (k, i) { k.style.transitionDelay = (i * 90) + 'ms'; });
    });
  }

  // Current year
  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  function ready(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  // Manifesto launch pop-up (home page only; shown once until dismissed)
    // Manifesto launch pop-up (home page only; show on refresh/direct entry, not internal navigation)
  function initModal() {
    var m = document.getElementById('manifestoModal');
    if (!m) return;
    // Don't show when navigating back from another page on the same site
    var navEntry = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    var navType = navEntry ? navEntry.type : 'navigate';
    var referrer = document.referrer;
    var isInternalNav = (navType === 'navigate' || navType === 'back_forward')
      && referrer && referrer.indexOf(location.hostname) !== -1;
    if (isInternalNav) return;
    var lastFocus;
    function close() {
      m.classList.remove('open'); m.setAttribute('aria-hidden', 'true');
      document.removeEventListener('keydown', onKey);
      if (lastFocus) lastFocus.focus();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-modal-close]')) close(); });
    setTimeout(function () {
      lastFocus = document.activeElement;
      m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
      document.addEventListener('keydown', onKey);
      var btn = m.querySelector('.btn-primary'); if (btn) btn.focus({ preventScroll: true });
    }, 1200);
  }

  ready(function () { initStagger(); initReveal(); initYear(); initModal(); });
})();
