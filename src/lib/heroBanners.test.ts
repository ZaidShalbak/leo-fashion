import { describe, expect, it } from "vitest";

import { endOfDayUtc, isHeroBannerLive, startOfDayUtc, type HeroBannerScheduling } from "./heroBanners";

const now = new Date("2026-06-15T12:00:00.000Z");

function makeBanner(overrides: Partial<HeroBannerScheduling> = {}): HeroBannerScheduling {
  return { isActive: true, startsAt: null, endsAt: null, ...overrides };
}

describe("isHeroBannerLive", () => {
  it("is live when active with no scheduling window at all", () => {
    expect(isHeroBannerLive(makeBanner(), now)).toBe(true);
  });

  it("is not live when inactive, regardless of scheduling", () => {
    expect(isHeroBannerLive(makeBanner({ isActive: false }), now)).toBe(false);
  });

  it("is not live before its start date", () => {
    const banner = makeBanner({ startsAt: new Date("2026-06-16T00:00:00.000Z") });
    expect(isHeroBannerLive(banner, now)).toBe(false);
  });

  it("is live once its start date has passed", () => {
    const banner = makeBanner({ startsAt: new Date("2026-06-15T00:00:00.000Z") });
    expect(isHeroBannerLive(banner, now)).toBe(true);
  });

  it("is not live after its end date", () => {
    const banner = makeBanner({ endsAt: new Date("2026-06-14T23:59:59.999Z") });
    expect(isHeroBannerLive(banner, now)).toBe(false);
  });

  it("is live before its end date has passed", () => {
    const banner = makeBanner({ endsAt: new Date("2026-06-15T23:59:59.999Z") });
    expect(isHeroBannerLive(banner, now)).toBe(true);
  });

  it("respects both bounds together, live inside the window", () => {
    const banner = makeBanner({
      startsAt: new Date("2026-06-01T00:00:00.000Z"),
      endsAt: new Date("2026-06-30T23:59:59.999Z"),
    });
    expect(isHeroBannerLive(banner, now)).toBe(true);
  });

  it("respects both bounds together, not live outside the window", () => {
    const banner = makeBanner({
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      endsAt: new Date("2026-07-31T23:59:59.999Z"),
    });
    expect(isHeroBannerLive(banner, now)).toBe(false);
  });
});

describe("startOfDayUtc", () => {
  it("converts a YYYY-MM-DD string to 00:00:00.000 UTC on that date", () => {
    expect(startOfDayUtc("2026-06-15").toISOString()).toBe("2026-06-15T00:00:00.000Z");
  });
});

describe("endOfDayUtc", () => {
  it("converts a YYYY-MM-DD string to 23:59:59.999 UTC on that date", () => {
    expect(endOfDayUtc("2026-06-15").toISOString()).toBe("2026-06-15T23:59:59.999Z");
  });
});
