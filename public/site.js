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
  function initModal() {
    var m = document.getElementById('manifestoModal');
    if (!m) return;
    var KEY = 'rn-manifesto-popup-v1';
    try { if (localStorage.getItem(KEY)) return; } catch (e) {}
    var lastFocus;
    function close() {
      m.classList.remove('open'); m.setAttribute('aria-hidden', 'true');
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      document.removeEventListener('keydown', onKey);
      if (lastFocus) lastFocus.focus();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-modal-close]')) close(); });
    m.querySelectorAll('a[href]').forEach(function (a) { a.addEventListener('click', function () { try { localStorage.setItem(KEY, '1'); } catch (e) {} }); });
    setTimeout(function () {
      lastFocus = document.activeElement;
      m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
      document.addEventListener('keydown', onKey);
      var btn = m.querySelector('.btn-primary'); if (btn) btn.focus({ preventScroll: true });
    }, 1200);
  }

  ready(function () { initStagger(); initReveal(); initYear(); initModal(); });
})();
