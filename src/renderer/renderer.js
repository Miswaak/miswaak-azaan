const PRAYERS = [
  ["fajr", "Fajr"],
  ["sunrise", "Sunrise"],
  ["dhuhr", "Dhuhr"],
  ["asr", "Asr"],
  ["maghrib", "Maghrib"],
  ["isha", "Isha"]
];
const AZAAN_PRAYERS = new Set(["fajr", "dhuhr", "asr", "maghrib", "isha"]);
const TEST_AZAAN_PRAYER = "dhuhr";

const state = {
  config: null,
  prayerData: null,
  refreshTimer: null,
  clockTimer: null,
  azaanAudioByPrayer: new Map(),
  currentAzaanAudio: null,
  isAzaanPlaying: false,
  notifiedPrayerKeys: new Set()
};

const elements = {
  sourceLabel: document.querySelector("#sourceLabel"),
  locationTitle: document.querySelector("#locationTitle"),
  nextPrayer: document.querySelector("#nextPrayer"),
  nextPrayerTime: document.querySelector("#nextPrayerTime"),
  azaanStatusLabel: document.querySelector("#azaanStatusLabel"),
  currentTimeLabel: document.querySelector("#currentTimeLabel"),
  dateLabel: document.querySelector("#dateLabel"),
  methodLabel: document.querySelector("#methodLabel"),
  timezoneLabel: document.querySelector("#timezoneLabel"),
  statusBox: document.querySelector("#statusBox"),
  timesGrid: document.querySelector("#timesGrid"),
  testAzaanButton: document.querySelector("#testAzaanButton"),
  refreshButton: document.querySelector("#refreshButton"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsForm: document.querySelector("#settingsForm"),
  diagnosticsButton: document.querySelector("#diagnosticsButton"),
  resolveLocationButton: document.querySelector("#resolveLocationButton"),
  detectLocationButton: document.querySelector("#detectLocationButton"),
  locationHelp: document.querySelector("#locationHelp"),
  miswaakLink: document.querySelector("#miswaakLink")
};

function showStatus(message, isError = false) {
  if (!message) {
    elements.statusBox.classList.add("hidden");
    elements.statusBox.textContent = "";
    return;
  }
  elements.statusBox.textContent = message;
  elements.statusBox.style.borderColor = isError ? "#f4c7c3" : "#99d4c9";
  elements.statusBox.style.color = isError ? "#9f1239" : "#115e59";
  elements.statusBox.style.background = isError ? "#fff5f5" : "#effcf8";
  elements.statusBox.classList.remove("hidden");
}

function setAzaanPlaying(isPlaying) {
  state.isAzaanPlaying = isPlaying;
  elements.testAzaanButton.textContent = isPlaying ? "Stop Azaan" : "Test Azaan";
  elements.testAzaanButton.setAttribute("aria-pressed", String(isPlaying));
  elements.testAzaanButton.classList.toggle("is-playing", isPlaying);
}

function getLocationDateParts(date = new Date()) {
  const timezone = state.config?.location?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    timeKey: `${values.hour}:${values.minute}`,
    displayTime: `${values.hour}:${values.minute}:${values.second}`
  };
}

function formatPrayerStatus() {
  if (!state.prayerData?.nextPrayer) {
    return "Azaan scheduler waiting for prayer times";
  }
  return `Azaan will play at ${state.prayerData.nextPrayer.label} (${state.prayerData.nextPrayer.time})`;
}

function renderPrayerTimes(data) {
  state.prayerData = data;
  const { location, timings, nextPrayer } = data;
  elements.sourceLabel.textContent = 'Prayer schedule';
  elements.locationTitle.textContent = `${location.city}, ${location.country}`;
  elements.nextPrayer.textContent = nextPrayer.label;
  elements.nextPrayerTime.textContent = nextPrayer.tomorrow ? `${nextPrayer.time} tomorrow` : nextPrayer.time;
  elements.azaanStatusLabel.textContent = formatPrayerStatus();
  elements.dateLabel.textContent = data.date;
  elements.methodLabel.textContent = data.method;
  elements.timezoneLabel.textContent = data.timezone;

  elements.timesGrid.innerHTML = PRAYERS.map(([key, label]) => {
    const active = key === nextPrayer.key ? " active" : "";
    return `<article class="time-card${active}"><span>${label}</span><strong>${timings[key]}</strong></article>`;
  }).join("");

  showStatus(data.warning ? `API fallback: ${data.warning}` : "");
  checkPrayerTriggers();
}

function renderConfig(config) {
  const form = elements.settingsForm;
  form.city.value = config.location.city;
  form.country.value = config.location.country;
  form.latitude.value = config.location.latitude ?? "";
  form.longitude.value = config.location.longitude ?? "";
  form.timezone.value = config.location.timezone;
  form.calculationMethod.value = config.prayer.calculationMethod;
  form.madhab.value = config.prayer.madhab;
  form.useApiFirst.checked = config.prayer.useApiFirst;
}

function readFormConfig() {
  const form = elements.settingsForm;
  const latitude = form.latitude.value.trim();
  const longitude = form.longitude.value.trim();

  return {
    ...state.config,
    location: {
      ...state.config.location,
      city: form.city.value.trim(),
      country: form.country.value.trim(),
      latitude: latitude === "" ? null : Number(latitude),
      longitude: longitude === "" ? null : Number(longitude),
      timezone: form.timezone.value.trim()
    },
    prayer: {
      ...state.config.prayer,
      calculationMethod: form.calculationMethod.value,
      madhab: form.madhab.value,
      useApiFirst: form.useApiFirst.checked
    }
  };
}

async function loadPrayerTimes() {
  elements.refreshButton.disabled = true;
  showStatus("Refreshing prayer times...");

  try {
    const data = await window.azaan.getPrayerTimes();
    renderPrayerTimes(data);
  } catch (error) {
    showStatus(error.message || "Unable to load prayer times", true);
  } finally {
    elements.refreshButton.disabled = false;
  }
}

function scheduleRefresh() {
  if (state.refreshTimer) {
    clearInterval(state.refreshTimer);
  }
  const minutes = Math.max(5, Number(state.config?.app?.refreshMinutes || 30));
  state.refreshTimer = setInterval(loadPrayerTimes, minutes * 60 * 1000);
}

function startClockAndPrayerScheduler() {
  if (state.clockTimer) {
    clearInterval(state.clockTimer);
  }

  updateClockAndScheduler();
  state.clockTimer = setInterval(updateClockAndScheduler, 1000);
}

function updateClockAndScheduler() {
  const { displayTime } = getLocationDateParts();
  elements.currentTimeLabel.textContent = displayTime;
  checkPrayerTriggers();
}

async function loadConfig() {
  state.config = await window.azaan.getConfig();
  await maybeAutoDetectDefaultLocation();
  renderConfig(state.config);
  scheduleRefresh();
  startClockAndPrayerScheduler();
}

async function showDiagnostics() {
  const diagnostics = await window.azaan.getDiagnostics();
  showStatus(`Config: ${diagnostics.configPath} | Log: ${diagnostics.logFile}`);
}


function setLocationHelp(message, isError = false) {
  elements.locationHelp.textContent = message;
  elements.locationHelp.style.color = isError ? "#9f1239" : "var(--muted)";
}

function applyResolvedLocation(location, source = location.source || "manual") {
  const form = elements.settingsForm;
  form.city.value = location.city;
  form.country.value = location.country;
  form.latitude.value = location.latitude;
  form.longitude.value = location.longitude;
  form.timezone.value = location.timezone;
  setLocationHelp(`Resolved ${location.city}, ${location.country} (${location.latitude}, ${location.longitude})`);
  return {
    ...state.config,
    location: {
      ...state.config.location,
      city: location.city,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      source
    }
  };
}

async function resolveLocationFromForm() {
  const form = elements.settingsForm;
  const city = form.city.value.trim();
  const country = form.country.value.trim();
  if (!city || !country) {
    throw new Error("Enter both city and country first.");
  }

  setLocationHelp("Resolving city, coordinates, and timezone...");
  const resolved = await window.azaan.resolveLocation({ city, country });
  return applyResolvedLocation(resolved, "city-search");
}

async function detectLocationFromIp() {
  elements.detectLocationButton.disabled = true;
  try {
    setLocationHelp("Detecting location from IP address...");
    const detected = await window.azaan.detectLocation();
    state.config = applyResolvedLocation(detected, "ip-detect");
    state.config = await window.azaan.saveConfig(state.config);
    state.notifiedPrayerKeys.clear();
    renderConfig(state.config);
    scheduleRefresh();
    startClockAndPrayerScheduler();
    await loadPrayerTimes();
    showStatus(`Location set to ${state.config.location.city}, ${state.config.location.country}.`);
  } catch (error) {
    setLocationHelp(error.message || "Unable to auto-detect location.", true);
  } finally {
    elements.detectLocationButton.disabled = false;
  }
}

async function maybeAutoDetectDefaultLocation() {
  if (!state.config?.app?.autoDetectOnFirstRun || state.config.location.source !== "default") {
    return;
  }

  try {
    const detected = await window.azaan.detectLocation();
    state.config = {
      ...state.config,
      location: detected,
      app: {
        ...state.config.app,
        autoDetectOnFirstRun: false
      }
    };
    state.config = await window.azaan.saveConfig(state.config);
    renderConfig(state.config);
    showStatus(`Auto-detected location: ${state.config.location.city}, ${state.config.location.country}.`);
  } catch (error) {
    state.config = {
      ...state.config,
      app: {
        ...state.config.app,
        autoDetectOnFirstRun: false
      }
    };
    state.config = await window.azaan.saveConfig(state.config);
    showStatus(`Using Tokyo fallback. Auto-detect failed: ${error.message || "unknown error"}. Open Settings to choose your city.`);
  }
}
async function getAzaanAudio(prayerKey = TEST_AZAAN_PRAYER) {
  if (!state.azaanAudioByPrayer.has(prayerKey)) {
    const audioUrl = await window.azaan.getAzaanAudioUrl(prayerKey);
    const audio = new Audio(audioUrl);
    audio.preload = "auto";
    audio.addEventListener("ended", () => {
      setAzaanPlaying(false);
      elements.azaanStatusLabel.textContent = formatPrayerStatus();
    });
    audio.addEventListener("pause", () => {
      if (audio.currentTime >= audio.duration || audio.currentTime === 0) {
        setAzaanPlaying(false);
      }
    });
    state.azaanAudioByPrayer.set(prayerKey, audio);
  }
  return state.azaanAudioByPrayer.get(prayerKey);
}

async function playAzaanAudio(reason, prayerKey = TEST_AZAAN_PRAYER) {
  if (state.currentAzaanAudio) {
    state.currentAzaanAudio.pause();
    state.currentAzaanAudio.currentTime = 0;
  }
  const audio = await getAzaanAudio(prayerKey);
  audio.pause();
  audio.currentTime = 0;
  state.currentAzaanAudio = audio;
  await audio.play();
  setAzaanPlaying(true);
  showStatus(reason);
}

async function toggleAzaanAudio() {
  const audio = state.currentAzaanAudio || await getAzaanAudio(TEST_AZAAN_PRAYER);

  if (state.isAzaanPlaying) {
    audio.pause();
    audio.currentTime = 0;
    setAzaanPlaying(false);
    showStatus("Stopped Azaan audio.");
    return;
  }

  elements.testAzaanButton.disabled = true;
  try {
    await playAzaanAudio("Playing test Azaan audio.", TEST_AZAAN_PRAYER);
  } catch (error) {
    setAzaanPlaying(false);
    showStatus(error.message || "Unable to play Azaan audio.", true);
  } finally {
    elements.testAzaanButton.disabled = false;
  }
}

async function checkPrayerTriggers() {
  if (!state.prayerData?.timings) {
    return;
  }

  const { dateKey, timeKey } = getLocationDateParts();
  for (const [key, label] of PRAYERS) {
    if (!AZAAN_PRAYERS.has(key)) {
      continue;
    }
    const prayerTime = state.prayerData.timings[key];
    const triggerKey = `${dateKey}-${key}-${prayerTime}`;
    if (prayerTime === timeKey && !state.notifiedPrayerKeys.has(triggerKey)) {
      state.notifiedPrayerKeys.add(triggerKey);
      elements.azaanStatusLabel.textContent = `Azaan playing for ${label}`;
      try {
        await playAzaanAudio(`Azaan playing for ${label} (${prayerTime}).`, key);
      } catch (error) {
        elements.azaanStatusLabel.textContent = `Azaan could not play for ${label}`;
        showStatus(error.message || `Unable to play Azaan for ${label}.`, true);
      }
      return;
    }
  }
}

async function init() {
  await loadConfig();
  await loadPrayerTimes();

  elements.refreshButton.addEventListener("click", loadPrayerTimes);
  elements.testAzaanButton.addEventListener("click", toggleAzaanAudio);
  elements.settingsButton.addEventListener("click", () => {
    renderConfig(state.config);
    setLocationHelp("City lookup saves latitude, longitude, and timezone for accurate offline fallback.");
    elements.settingsDialog.showModal();
  });

  elements.resolveLocationButton.addEventListener("click", async () => {
    elements.resolveLocationButton.disabled = true;
    try {
      state.config = await resolveLocationFromForm();
    } catch (error) {
      setLocationHelp(error.message || "Unable to resolve this city.", true);
    } finally {
      elements.resolveLocationButton.disabled = false;
    }
  });

  elements.detectLocationButton.addEventListener("click", detectLocationFromIp);

  elements.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nextConfig = readFormConfig();
    const locationNameChanged = nextConfig.location.city !== state.config.location.city || nextConfig.location.country !== state.config.location.country;
    if (!nextConfig.location.city || !nextConfig.location.country) {
      showStatus("City and country are required.", true);
      return;
    }

    let configToSave = nextConfig;
    if (locationNameChanged || !Number.isFinite(configToSave.location.latitude) || !Number.isFinite(configToSave.location.longitude) || !configToSave.location.timezone) {
      try {
        state.config = nextConfig;
        configToSave = await resolveLocationFromForm();
      } catch (error) {
        setLocationHelp(error.message || "Unable to resolve location before saving.", true);
        return;
      }
    } else {
      configToSave.location.source = "manual";
    }

    state.config = await window.azaan.saveConfig(configToSave);
    state.notifiedPrayerKeys.clear();
    elements.settingsDialog.close();
    scheduleRefresh();
    startClockAndPrayerScheduler();
    await loadPrayerTimes();
  });

  elements.diagnosticsButton.addEventListener("click", showDiagnostics);
  elements.miswaakLink.addEventListener("click", () => window.azaan.openExternal("https://miswaakofficial.com"));
}

init().catch((error) => showStatus(error.message || "App failed to start", true));
