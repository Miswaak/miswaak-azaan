const adhan = require("adhan");

const METHOD_FACTORIES = {
  MuslimWorldLeague: () => adhan.CalculationMethod.MuslimWorldLeague(),
  Egyptian: () => adhan.CalculationMethod.Egyptian(),
  Karachi: () => adhan.CalculationMethod.Karachi(),
  UmmAlQura: () => adhan.CalculationMethod.UmmAlQura(),
  Dubai: () => adhan.CalculationMethod.Dubai(),
  Qatar: () => adhan.CalculationMethod.Qatar(),
  Kuwait: () => adhan.CalculationMethod.Kuwait(),
  Singapore: () => adhan.CalculationMethod.Singapore(),
  Turkey: () => adhan.CalculationMethod.Turkey(),
  Tehran: () => adhan.CalculationMethod.Tehran(),
  NorthAmerica: () => adhan.CalculationMethod.NorthAmerica()
};

const PRAYERS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

function formatInTimeZone(date, timezone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function createCalculationParams(config) {
  const factory = METHOD_FACTORIES[config.prayer.calculationMethod] || METHOD_FACTORIES.MuslimWorldLeague;
  const params = factory();
  params.madhab = config.prayer.madhab === "Hanafi" ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
  return params;
}

function calculateOfflinePrayerTimes(config, date, logger) {
  const { latitude, longitude, timezone } = config.location;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Offline calculation requires latitude and longitude. Add coordinates in Settings.");
  }

  logger.info("Calculating prayer times offline", { latitude, longitude, method: config.prayer.calculationMethod });

  const coordinates = new adhan.Coordinates(latitude, longitude);
  const params = createCalculationParams(config);
  const prayerTimes = new adhan.PrayerTimes(coordinates, date, params);

  const timings = PRAYERS.reduce((result, prayer) => {
    result[prayer] = formatInTimeZone(prayerTimes[prayer], timezone);
    return result;
  }, {});

  return {
    source: "offline",
    provider: "adhan",
    date: date.toDateString(),
    timezone,
    method: config.prayer.calculationMethod,
    timings
  };
}

module.exports = { calculateOfflinePrayerTimes, METHOD_FACTORIES };
