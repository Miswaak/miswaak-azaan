(() => {
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 8) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const warning = document.getElementById('warning');
  const closeBtn = warning?.querySelector('.warning-close');
  const dismissed = localStorage.getItem('miswaak-warning-dismissed') === '1';
  if (dismissed) warning?.classList.add('is-hidden');
  closeBtn?.addEventListener('click', () => {
    warning.classList.add('is-hidden');
    try { localStorage.setItem('miswaak-warning-dismissed', '1'); } catch (_) {}
  });

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const city = tz && tz.includes('/') ? tz.split('/').pop().replace(/_/g, ' ') : null;
    const el = document.getElementById('device-city');
    if (city && el) el.textContent = city;
  } catch (_) { /* keep fallback */ }

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
