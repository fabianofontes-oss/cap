import { AppSubscription } from '../types';

/**
 * Returns true only when the subscription is genuinely active/trial AND not yet expired.
 *
 * Rules:
 *   - status must be 'active' or 'trial'
 *   - if expiresAt is set and is in the past → treated as expired (returns false)
 *   - if expiresAt is absent → trust the status value (backwards-compatible with existing records)
 *   - any other status ('free', 'expired') → returns false
 *
 * NOTE: This is a client-side check only. Server-side verification must be
 * added before production billing is enabled.
 */
export const isSubscriptionActive = (sub: AppSubscription | null | undefined): boolean => {
  if (!sub) return false;
  if (sub.status !== 'active' && sub.status !== 'trial') return false;
  if (sub.expiresAt && new Date(sub.expiresAt).getTime() < Date.now()) return false;
  return true;
};
