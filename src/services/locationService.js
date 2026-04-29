function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, done: () => clearTimeout(timeout) };
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeResolvedLocation(location, source) {
  const city = String(location.city || "").trim();
  const country = String(location.country || "").trim();
  const latitude = toNumber(location.latitude ?? location.lat);
  const longitude = toNumber(location.longitude ?? location.lon);
  const timezone = String(location.timezone || "").trim();

  if (!city || !country) {
    throw new Error("City and country are required.");
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Could not determine latitude and longitude for this location.");
  }
  if (!timezone) {
    throw new Error("Could not determine timezone for this location.");
  }

  return { city, country, latitude, longitude, timezone, source };
}

function chooseBestGeocodeResult(results, inputCountry) {
  const normalizedCountry = normalizeName(inputCountry);
  return results.find((result) => {
    const country = normalizeName(result.country);
    const countryCode = normalizeName(result.country_code);
    return country === normalizedCountry || country.includes(normalizedCountry) || countryCode === normalizedCountry;
  }) || results[0];
}

async function resolveLocationByCity(input, _config, logger, timeoutMs = 8000) {
  const city = String(input.city || "").trim();
  const country = String(input.country || "").trim();
  if (!city || !country) {
    throw new Error("Enter both city and country.");
  }

  const { controller, done } = withTimeout(timeoutMs);
  try {
    const params = new URLSearchParams({
      name: city,
      count: "10",
      language: "en",
      format: "json"
    });
    const url = `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
    logger.info("Resolving location with Open-Meteo", { city, country, url });

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Location lookup failed with HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload.results) || payload.results.length === 0) {
      throw new Error(`No location match found for ${city}, ${country}.`);
    }

    const result = chooseBestGeocodeResult(payload.results, country);
    return normalizeResolvedLocation({
      city: result.name || city,
      country: result.country || country,
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone
    }, "city-search");
  } finally {
    done();
  }
}

async function detectLocationByIp(logger, timeoutMs = 8000) {
  const { controller, done } = withTimeout(timeoutMs);
  try {
    logger.info("Detecting location by IP");
    const response = await fetch("https://ipapi.co/json/", {
      signal: controller.signal,
      headers: { "User-Agent": "Miswaak-Azaan/1.0.0" }
    });
    if (!response.ok) {
      throw new Error(`IP location request failed with HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (payload.error) {
      throw new Error(payload.reason || "IP location lookup failed");
    }

    return normalizeResolvedLocation({
      city: payload.city,
      country: payload.country_name,
      latitude: payload.latitude,
      longitude: payload.longitude,
      timezone: payload.timezone
    }, "ip-detect");
  } finally {
    done();
  }
}

module.exports = { resolveLocationByCity, detectLocationByIp };