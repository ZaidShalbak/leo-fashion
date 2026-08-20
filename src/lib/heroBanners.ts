// Pure, DB-free logic for whether a hero banner is currently live — mirrors
// src/lib/discount.ts's approach (and its date-only-input helpers) so this
// is trivial to unit test and easy to re-run identically wherever a banner
// needs to be shown or hidden (the homepage today; anywhere else later).

export type HeroBannerScheduling = {
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

/**
 * A banner is live when it's turned on and, if a scheduling window is set,
 * "now" falls inside it. Either bound alone is fine (e.g. "hide after
 * March 1" with no start date, or "go live March 1" with no end date).
 */
export function isHeroBannerLive(banner: HeroBannerScheduling, now: Date): boolean {
  if (!banner.isActive) return false;
  if (banner.startsAt && banner.startsAt.getTime() > now.getTime()) return false;
  if (banner.endsAt && banner.endsAt.getTime() < now.getTime()) return false;
  return true;
}

/** Start-of-day UTC on the given "YYYY-MM-DD" form-input date string. */
export function startOfDayUtc(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

/** End-of-day UTC on the given "YYYY-MM-DD" form-input date string. */
export function endOfDayUtc(dateOnly: string): Date {
  return new Date(`${dateOnly}T23:59:59.999Z`);
}
