const Donor = require('../models/Donor');
const { geocodeLocation } = require('./geocode');
const { getCompatibleDonorBloodGroups } = require('./bloodCompatibility');

const DEFAULT_MAX_DISTANCE_KM = 50;
const DEFAULT_LIMIT = 20;

// Finds donors eligible to fulfil an emergency blood request, ranked nearest-first.
// Applies, in order: blood group compatibility, availability, geographic proximity
// (when the request location can be geocoded), then donation eligibility (age +
// minimum gap since last donation). Availability and eligibility are always enforced —
// callers cannot opt out of them.
async function findMatchingDonors({ bloodGroup, location, maxDistanceKm = DEFAULT_MAX_DISTANCE_KM, limit = DEFAULT_LIMIT }) {
  const requestGeo = await geocodeLocation(location);
  const compatibleGroups = getCompatibleDonorBloodGroups(bloodGroup);
  const baseQuery = { bloodGroup: { $in: compatibleGroups }, available: true };

  let candidates;
  if (requestGeo) {
    candidates = await Donor.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [requestGeo.lon, requestGeo.lat] },
          distanceField: 'distanceMeters',
          maxDistance: maxDistanceKm * 1000,
          query: baseQuery,
          spherical: true,
        },
      },
    ]);
  } else {
    // Request location couldn't be geocoded — fall back to blood group + availability only,
    // with distance left unknown rather than blocking matching entirely.
    candidates = await Donor.find(baseQuery).lean();
  }

  const matches = candidates
    .map((donor) => ({
      donor,
      eligibility: Donor.computeEligibility(donor),
      distanceKm: donor.distanceMeters != null ? donor.distanceMeters / 1000 : null,
    }))
    .filter((entry) => entry.eligibility.eligible)
    .sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, limit);

  return { requestGeo, matches };
}

module.exports = { findMatchingDonors };
