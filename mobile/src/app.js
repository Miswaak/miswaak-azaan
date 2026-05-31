const PRAYERS = [
  ["fajr", "Fajr"],
  ["sunrise", "Sunrise"],
  ["dhuhr", "Dhuhr"],
  ["asr", "Asr"],
  ["maghrib", "Maghrib"],
  ["isha", "Isha"]
];

const METHOD_ID = 3;
const SCHOOL_ID = 0;
const APP_PLATFORM = "android";
const APP_VERSION_CODE = 1;
const UPDATE_MANIFEST_URL = "https://miswaak.github.io/miswaak-azaan/downloads/latest.json";

const state = {
  timings: null,
  nextPrayer: null,
  location: {
    city: localStorage.getItem("miswaak.city") || "Tokyo",
    country: localStorage.getItem("miswaak.country") || "Japan",
    latitude: Number(localStorage.getItem("miswaak.latitude")) || null,
    longitude: Number(localStorage.getItem("miswaak.longitude")) || null
  },
  countdownTimer: null,
  isAzaanPlaying: false
};

const elements = {
  locationLabel: document.querySelector("#locationLabel"),
  nextPrayerName: document.querySelector("#nextPrayerName"),
  nextPrayerTime: document.querySelector("#nextPrayerTime"),
  countdownLabel: document.querySelector("#countdownLabel"),
  prayerList: document.querySelector("#prayerList"),
  statusLabel: document.querySelector("#statusLabel"),
  cityInput: document.querySelector("#cityInput"),
  countryInput: document.querySelector("#countryInput"),
  refreshButton: document.querySelector("#refreshButton"),
  locationButton: document.querySelector("#locationButton"),
  saveLocationButton: document.querySelector("#saveLocationButton"),
  testAzaanButton: document.querySelector("#testAzaanButton"),
  updateBanner: document.querySelector("#updateBanner"),
  updateMessage: document.querySelector("#updateMessage"),
  updateButton: document.querySelector("#updateButton"),
  azaanAudio: document.querySelector("#azaanAudio")
};

function setStatus(message, isError = false) {
  elements.statusLabel.textContent = message;
  elements.statusLabel.classList.toggle("is-error", isError);
}

function setAzaanPlaying(isPlaying) {
  state.isAzaanPlaying = isPlaying;
  elements.testAzaanButton.textContent = isPlaying ? "Stop Azaan" : "Test Azaan";
  elements.testAzaanButton.classList.toggle("is-danger", isPlaying);
  elements.testAzaanButton.setAttribute("aria-pressed", String(isPlaying));
}

function stripTimeZoneSuffix(value) {
  return String(value).replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
}

function buildPrayerUrl() {
  const params = new URLSearchParams({
    method: String(METHOD_ID),
    school: String(SCHOOL_ID)
  });
  const datedPath = formatDate(new Date());

  if (Number.isFinite(state.location.latitude) && Number.isFinite(state.location.longitude)) {
    params.set("latitude", String(state.location.latitude));
    params.set("longitude", String(state.location.longitude));
    return `https://api.aladhan.com/v1/timings/${datedPath}?${params.toString()}`;
  }

  params.set("city", state.location.city);
  params.set("country", state.location.country);
  return `https://api.aladhan.com/v1/timingsByCity/${datedPath}?${params.toString()}`;
}

function parsePrayerTime(value) {
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function getNextPrayer(timings) {
  const now = new Date();
  for (const [key, label] of PRAYERS) {
    const at = parsePrayerTime(timings[key]);
    if (at > now) {
      return { key, label, time: timings[key], at };
    }
  }

  const tomorrow = parsePrayerTime(timings.fajr);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { key: "fajr", label: "Fajr", time: timings.fajr, at: tomorrow };
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderPrayerTimes() {
  elements.locationLabel.textContent = `${state.location.city}, ${state.location.country}`;
  elements.cityInput.value = state.location.city;
  elements.countryInput.value = state.location.country;

  if (!state.timings || !state.nextPrayer) {
    elements.prayerList.innerHTML = "";
    elements.nextPrayerName.textContent = "--";
    elements.nextPrayerTime.textContent = "--:--";
    elements.countdownLabel.textContent = "--";
    return;
  }

  elements.nextPrayerName.textContent = state.nextPrayer.label;
  elements.nextPrayerTime.textContent = state.nextPrayer.time;

  elements.prayerList.innerHTML = PRAYERS.map(([key, label]) => {
    const nextClass = key === state.nextPrayer.key ? " is-next" : "";
    return `<div class="prayer-row${nextClass}"><strong>${label}</strong><span>${state.timings[key]}</span></div>`;
  }).join("");

  updateCountdown();
}

function updateCountdown() {
  if (!state.nextPrayer) {
    elements.countdownLabel.textContent = "--";
    return;
  }
  elements.countdownLabel.textContent = formatDuration(state.nextPrayer.at.getTime() - Date.now());
}

async function fetchPrayerTimes() {
  setStatus("Refreshing");
  const response = await fetch(buildPrayerUrl());
  if (!response.ok) {
    throw new Error(`Prayer time request failed: HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.code !== 200 || !payload.data?.timings) {
    throw new Error("Prayer time response was not valid.");
  }

  const timings = payload.data.timings;
  state.timings = {
    fajr: stripTimeZoneSuffix(timings.Fajr),
    sunrise: stripTimeZoneSuffix(timings.Sunrise),
    dhuhr: stripTimeZoneSuffix(timings.Dhuhr),
    asr: stripTimeZoneSuffix(timings.Asr),
    maghrib: stripTimeZoneSuffix(timings.Maghrib),
    isha: stripTimeZoneSuffix(timings.Isha)
  };
  state.nextPrayer = getNextPrayer(state.timings);
  renderPrayerTimes();
  scheduleNextPrayerNotification();
  setStatus("Ready");
}

async function refreshPrayerTimes() {
  try {
    await fetchPrayerTimes();
  } catch (error) {
    setStatus(error.message || "Unable to refresh prayer times.", true);
  }
}

async function useDeviceLocation() {
  if (!navigator.geolocation) {
    setStatus("Location is not available on this device.", true);
    return;
  }

  setStatus("Detecting location");
  navigator.geolocation.getCurrentPosition(async (position) => {
    state.location.latitude = position.coords.latitude;
    state.location.longitude = position.coords.longitude;
    state.location.city = "Current location";
    state.location.country = "Detected";
    localStorage.setItem("miswaak.latitude", String(state.location.latitude));
    localStorage.setItem("miswaak.longitude", String(state.location.longitude));
    localStorage.setItem("miswaak.city", state.location.city);
    localStorage.setItem("miswaak.country", state.location.country);
    await refreshPrayerTimes();
  }, () => {
    setStatus("Location permission was not granted.", true);
  }, { enableHighAccuracy: true, timeout: 12000 });
}

function saveManualLocation() {
  state.location.city = elements.cityInput.value.trim() || "Tokyo";
  state.location.country = elements.countryInput.value.trim() || "Japan";
  state.location.latitude = null;
  state.location.longitude = null;
  localStorage.setItem("miswaak.city", state.location.city);
  localStorage.setItem("miswaak.country", state.location.country);
  localStorage.removeItem("miswaak.latitude");
  localStorage.removeItem("miswaak.longitude");
  refreshPrayerTimes();
}

async function playAzaan() {
  elements.azaanAudio.pause();
  elements.azaanAudio.currentTime = 0;
  await elements.azaanAudio.play();
  setAzaanPlaying(true);
}

function stopAzaan() {
  elements.azaanAudio.pause();
  elements.azaanAudio.currentTime = 0;
  setAzaanPlaying(false);
}

function toggleAzaan() {
  if (state.isAzaanPlaying) {
    stopAzaan();
    return;
  }

  playAzaan().catch(() => {
    setAzaanPlaying(false);
    setStatus("Unable to play azaan audio.", true);
  });
}

function resolveUpdateUrl(release) {
  return release.playStoreUrl || release.url || release.downloadUrl || null;
}

async function checkForUpdates() {
  try {
    const response = await fetch(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const manifest = await response.json();
    const release = manifest?.[APP_PLATFORM];
    if (!release || Number(release.versionCode) <= APP_VERSION_CODE) {
      return;
    }

    const updateUrl = resolveUpdateUrl(release);
    if (!updateUrl) {
      return;
    }

    elements.updateMessage.textContent = `Version ${release.versionName || release.versionCode} is ready to install.`;
    elements.updateButton.addEventListener("click", () => {
      window.open(updateUrl, "_blank", "noopener");
    }, { once: true });
    elements.updateBanner.hidden = false;
  } catch (_) {
    // Update checks should never interrupt prayer-time use.
  }
}

async function scheduleNextPrayerNotification() {
  if (!state.nextPrayer) {
    return;
  }

  const capacitor = window.Capacitor;
  const notifications = window.Capacitor?.Plugins?.LocalNotifications;
  if (!capacitor || !notifications) {
    return;
  }

  const permission = await notifications.requestPermissions();
  if (permission.display !== "granted") {
    return;
  }

  await notifications.cancel({ notifications: [{ id: 1001 }] });
  await notifications.schedule({
    notifications: [{
      id: 1001,
      title: `${state.nextPrayer.label} Azaan`,
      body: "Miswaak Azaan",
      schedule: { at: state.nextPrayer.at },
      sound: "rayhan_azaan.m4a"
    }]
  });
}

function bindEvents() {
  elements.refreshButton.addEventListener("click", refreshPrayerTimes);
  elements.locationButton.addEventListener("click", useDeviceLocation);
  elements.saveLocationButton.addEventListener("click", saveManualLocation);
  elements.testAzaanButton.addEventListener("click", toggleAzaan);
  elements.azaanAudio.addEventListener("ended", () => setAzaanPlaying(false));
  elements.azaanAudio.addEventListener("pause", () => {
    if (elements.azaanAudio.currentTime >= elements.azaanAudio.duration) {
      setAzaanPlaying(false);
    }
  });

  state.countdownTimer = setInterval(updateCountdown, 1000);
}

bindEvents();
renderPrayerTimes();
refreshPrayerTimes();
checkForUpdates();
