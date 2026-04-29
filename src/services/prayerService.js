const { fetchPrayerTimesFromAladhan } = require("./aladhanClient");
const { calculateOfflinePrayerTimes } = require("./offlineCalculator");

const PRAYER_LABELS = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha"
};

function parseLocalTime(time, date) {
  const [hour, minute] = time.split(":").map(Number);
  const parsed = new Date(date);
  parsed.setHours(hour, minute, 0, 0);
  return parsed;
}

function getNextPrayer(timings, now = new Date()) {
  for (const [key, label] of Object.entries(PRAYER_LABELS)) {
    const at = parseLocalTime(timings[key], now);
    if (at > now) {
      return { key, label, time: timings[key] };
    }
  }
  return { key: "fajr", label: "Fajr", time: timings.fajr, tomorrow: true };
}

async function getPrayerTimes(config, logger, date = new Date()) {
  let result;
  let warning = null;

  if (config.prayer.useApiFirst) {
    try {
      result = await fetchPrayerTimesFromAladhan(config, date, logger);
    } catch (error) {
      warning = error.message;
      logger.warn("Aladhan unavailable; falling back to offline calculation", error);
    }
  }

  if (!result) {
    result = calculateOfflinePrayerTimes(config, date, logger);
  }

  return {
    ...result,
    location: config.location,
    nextPrayer: getNextPrayer(result.timings),
    warning
  };
}

module.exports = { getPrayerTimes, PRAYER_LABELS };
