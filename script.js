(() => {
  // ---------- Clean tracking params from shared links ----------
  try {
    const url = new URL(window.location.href);
    let changed = false;
    const removeExact = ['fbclid', 'gclid', 'igshid', 'mc_cid', 'mc_eid'];
    for (const key of removeExact) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.startsWith('utm_')) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      const cleanUrl = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState(null, '', cleanUrl);
    }
  } catch (_) {}
  // ---------- Sticky nav scroll state ----------
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 8) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- SmartScreen warning dismiss ----------
  const warning = document.getElementById('warning');
  const closeBtn = warning?.querySelector('.warning-close');
  try {
    if (localStorage.getItem('miswaak-warning-dismissed') === '1') {
      warning?.classList.add('is-hidden');
    }
  } catch (_) {}
  closeBtn?.addEventListener('click', () => {
    warning.classList.add('is-hidden');
    try { localStorage.setItem('miswaak-warning-dismissed', '1'); } catch (_) {}
  });

  // ---------- Theme toggle ----------
  const toggle = document.getElementById('theme-toggle');
  const setMeta = (theme) => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#24283A' : '#FFFDF7');
  };
  setMeta(document.documentElement.getAttribute('data-theme') || 'light');
  toggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    setMeta(next);
    try { localStorage.setItem('miswaak-theme', next); } catch (_) {}
  });

  // ---------- Smooth-scroll anchor links ----------
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ---------- Resolve city from timezone ----------
  let city = 'Worldwide';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz.includes('/')) {
      city = tz.split('/').pop().replace(/_/g, ' ');
    }
  } catch (_) {}
  const cityEl = document.getElementById('device-city');
  if (cityEl && city !== 'Worldwide') cityEl.textContent = city;

  // ---------- Prayer times ----------
  const ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  async function fetchTimings(addr) {
    const cacheKey = `miswaak-times-${addr}-${todayKey()}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    const url = `https://api.aladhan.com/v1/timingsByAddress?address=${encodeURIComponent(addr)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('aladhan request failed');
    const json = await res.json();
    const t = json?.data?.timings;
    if (!t) throw new Error('aladhan response missing timings');
    const out = {};
    for (const name of ORDER) {
      out[name] = (t[name] || '').slice(0, 5);
    }
    try { localStorage.setItem(cacheKey, JSON.stringify(out)); } catch (_) {}
    return out;
  }

  function readListTimings() {
    const out = {};
    document.querySelectorAll('#device-list li').forEach((li) => {
      const name = li.getAttribute('data-prayer');
      const value = li.querySelector('span:last-child')?.textContent?.trim();
      if (name && value) out[name] = value;
    });
    return out;
  }

  function paintTimings(times) {
    document.querySelectorAll('#device-list li').forEach((li) => {
      const name = li.getAttribute('data-prayer');
      if (!name || !times[name]) return;
      const valueSpan = li.querySelector('span:last-child');
      if (valueSpan) valueSpan.textContent = times[name];
    });
  }

  function nextPrayer(times) {
    const now = new Date();
    for (const name of ORDER) {
      const value = times[name];
      if (!value) continue;
      const [hh, mm] = value.split(':').map(Number);
      const t = new Date();
      t.setHours(hh, mm, 0, 0);
      if (t > now) return { name, time: t };
    }
    const value = times.Fajr;
    if (!value) return null;
    const [hh, mm] = value.split(':').map(Number);
    const t = new Date();
    t.setDate(t.getDate() + 1);
    t.setHours(hh, mm, 0, 0);
    return { name: 'Fajr', time: t };
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function formatRemaining(ms) {
    if (ms < 0) ms = 0;
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${pad(h)} : ${pad(m)} : ${pad(s)}`;
  }

  let countdownTimer = null;

  function startCountdown(times) {
    if (countdownTimer) clearInterval(countdownTimer);
    const nextNameEl = document.getElementById('next-name');
    const nextCountEl = document.getElementById('next-count');

    const update = () => {
      const np = nextPrayer(times);
      if (!np) return;
      if (nextNameEl) nextNameEl.textContent = np.name;
      if (nextCountEl) nextCountEl.textContent = formatRemaining(np.time - new Date());
      document.querySelectorAll('#device-list li').forEach((li) => {
        li.classList.toggle('active', li.getAttribute('data-prayer') === np.name);
      });
    };
    update();
    countdownTimer = setInterval(update, 1000);
  }

  // Kick off: try Aladhan; fall back to whatever's in the markup.
  (async () => {
    let times = readListTimings();
    if (city !== 'Worldwide') {
      try {
        times = await fetchTimings(city);
        paintTimings(times);
      } catch (_) {
        // Network/CORS/whatever — keep static fallback.
      }
    }
    startCountdown(times);
  })();
})();
