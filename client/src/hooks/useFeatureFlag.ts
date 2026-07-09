import { trpc } from "@/lib/trpc";

/**
 * Returns whether a specific feature flag is enabled for the current user.
 * Admins always get `true`. Contractors get the DB-stored value.
 * Returns `false` while loading (safe default — hides features until confirmed).
 */
export function useFeatureFlag(flagKey: string): boolean {
  const { data } = trpc.featureFlags.getForUser.useQuery();
  if (!data) return false;
  return data[flagKey] ?? false;
}

/**
 * Returns the full feature flags map for the current user.
 * Useful when you need to check multiple flags at once.
 */
export function useFeatureFlags(): Record<string, boolean> {
  const { data } = trpc.featureFlags.getForUser.useQuery();
  return data ?? {};
}
