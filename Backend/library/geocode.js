// Resolves free-text locations (donor location, emergency request location) to
// coordinates using the free Nominatim (OpenStreetMap) geocoding API, for use in
// nearby donor matching.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const MIN_REQUEST_INTERVAL_MS = 1100; // Nominatim's usage policy caps requests at ~1/sec

// Cached by normalized location text — the same donor/hospital location string is
// looked up repeatedly (every profile save, every emergency request), and Nominatim
// asks integrators not to send duplicate lookups.
const geocodeCache = new Map();
let lastRequestAt = 0;

async function throttle() {
  const waitMs = Math.max(0, lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now());
  lastRequestAt = Date.now() + waitMs;
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
}

// Returns { lat, lon } for the given location text, or null if it could not be
// resolved (unknown place, network failure, etc). Never throws — callers should
// treat null as "coordinates unavailable" and degrade gracefully.
async function geocodeLocation(locationText) {
  if (!locationText || !locationText.trim()) return null;

  const cacheKey = locationText.trim().toLowerCase();
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

  try {
    await throttle();
    const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(locationText)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'MediLabConnect/1.0 (CSE471 course project)' },
    });

    if (!response.ok) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const geo = { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
    geocodeCache.set(cacheKey, geo);
    return geo;
  } catch (error) {
    return null;
  }
}

module.exports = { geocodeLocation };
