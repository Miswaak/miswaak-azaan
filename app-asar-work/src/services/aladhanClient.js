const ALADHAN_BASE_URL = "https://api.aladhan.com/v1";

const METHOD_IDS = {
  MuslimWorldLeague: 3,
  Egyptian: 5,
  Karachi: 1,
  UmmAlQura: 4,
  Dubai: 16,
  Qatar: 10,
  Kuwait: 9,
  Singapore: 11,
  Turkey: 13,
  Tehran: 7,
  NorthAmerica: 2
};

const SCHOOL_IDS = {
  Shafi: 0,
  Hanafi: 1
};

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function stripTimeZoneSuffix(value) {
  return String(value).replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function buildTimingsUrl(config, date) {
  const params = new URLSearchParams({
    method: String(METHOD_IDS[config.prayer.calculationMethod] || METHOD_IDS.MuslimWorldLeague),
    school: String(SCHOOL_IDS[config.prayer.madhab] || SCHOOL_IDS.Shafi)
  });

  const datedPath = formatDate(date);
  if (Number.isFinite(config.location.latitude) && Number.isFinite(config.location.longitude)) {
    params.set("latitude", String(config.location.latitude));
    params.set("longitude", String(config.location.longitude));
    return `${ALADHAN_BASE_URL}/timings/${datedPath}?${params.toString()}`;
  }

  params.set("city", config.location.city);
  params.set("country", config.location.country);
  return `${ALADHAN_BASE_URL}/timingsByCity/${datedPath}?${params.toString()}`;
}

async function fetchPrayerTimesFromAladhan(config, date, logger) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.prayer.apiTimeoutMs);

  try {
    const url = buildTimingsUrl(config, date);
    logger.info("Fetching prayer times from Aladhan", { url });

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Aladhan request failed with HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (payload.code !== 200 || !payload.data?.timings) {
      throw new Error(payload.data || payload.status || "Aladhan returned an invalid response");
    }

    const timings = payload.data.timings;
    return {
      source: "api",
      provider: "Aladhan",
      date: payload.data.date?.readable || date.toDateString(),
      timezone: payload.data.meta?.timezone || config.location.timezone,
      method: payload.data.meta?.method?.name || config.prayer.calculationMethod,
      meta: payload.data.meta || {},
      timings: {
        fajr: stripTimeZoneSuffix(timings.Fajr),
        sunrise: stripTimeZoneSuffix(timings.Sunrise),
        dhuhr: stripTimeZoneSuffix(timings.Dhuhr),
        asr: stripTimeZoneSuffix(timings.Asr),
        maghrib: stripTimeZoneSuffix(timings.Maghrib),
        isha: stripTimeZoneSuffix(timings.Isha)
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { fetchPrayerTimesFromAladhan, METHOD_IDS, SCHOOL_IDS };
