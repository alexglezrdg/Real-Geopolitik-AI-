/**
 * Geo-Gate: Hard filter for geopolitical relevance
 *
 * Whitelist regions: US, LATAM, CARIBBEAN, MIDDLE_EAST, GLOBAL_GEO
 * Non-geo stories only allowed if LLM score >= 85 (high confidence)
 */

export type RegionBucket =
  | "US"
  | "LATAM"
  | "CARIBBEAN"
  | "MIDDLE_EAST"
  | "GLOBAL_GEO"
  | "OTHER"
  | string;

export function geoGate(params: {
  region_bucket?: RegionBucket | null;
  score?: number | null; // 0-100 (LLM curator score)
}) {
  const region = (params.region_bucket || "OTHER").toString();
  const score = Number(params.score ?? 0);

  const allowed = new Set([
    "US",
    "LATAM",
    "CARIBBEAN",
    "MIDDLE_EAST",
    "GLOBAL_GEO",
  ]);

  if (allowed.has(region)) {
    return { ok: true, reason: null as null, region, score };
  }

  // Non-geo exception only if very high confidence
  if (score >= 85) {
    return {
      ok: true,
      reason: "non_geo_high_confidence" as const,
      region,
      score,
    };
  }

  return { ok: false, reason: "low_geopolitics" as const, region, score };
}
