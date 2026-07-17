export const MESSAGING_TIER_LIMITS: Record<string, number> = {
  TIER_250: 250,
  TIER_1K: 1000,
  TIER_10K: 10000,
  TIER_100K: 100000,
  UNLIMITED: Infinity,
  TIER_UNLIMITED: Infinity,
  UNKNOWN: Infinity,
};

export function parseMessagingTier(tier?: string): number {
  if (!tier) return Infinity;
  const upper = tier.toUpperCase();
  return MESSAGING_TIER_LIMITS[upper] ?? Infinity;
}
