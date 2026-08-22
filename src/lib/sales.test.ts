import { describe, expect, it } from "vitest";

import {
  applySalePercent,
  getBestSaleForProduct,
  getSaleAdjustedPriceCents,
  isSaleLive,
  saleMatchesProduct,
  type SaleRecord,
} from "./sales";

const now = new Date("2026-06-15T12:00:00.000Z");

function makeSale(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: "sale_1",
    scope: "SITE_WIDE",
    percentOff: 20,
    isActive: true,
    collectionId: null,
    brandId: null,
    startsAt: null,
    endsAt: null,
    ...overrides,
  };
}

describe("isSaleLive", () => {
  it("is live when active with no scheduling window", () => {
    expect(isSaleLive(makeSale(), now)).toBe(true);
  });

  it("is not live when inactive", () => {
    expect(isSaleLive(makeSale({ isActive: false }), now)).toBe(false);
  });

  it("is not live before its start date", () => {
    expect(isSaleLive(makeSale({ startsAt: new Date("2026-06-16T00:00:00.000Z") }), now)).toBe(
      false
    );
  });

  it("is not live after its end date", () => {
    expect(isSaleLive(makeSale({ endsAt: new Date("2026-06-14T23:59:59.999Z") }), now)).toBe(
      false
    );
  });
});

describe("saleMatchesProduct", () => {
  it("a site-wide sale matches any product", () => {
    const sale = makeSale({ scope: "SITE_WIDE" });
    expect(saleMatchesProduct(sale, { brandId: null, collectionIds: [] })).toBe(true);
  });

  it("a brand sale matches only the same brand", () => {
    const sale = makeSale({ scope: "BRAND", brandId: "brand_1" });
    expect(saleMatchesProduct(sale, { brandId: "brand_1", collectionIds: [] })).toBe(true);
    expect(saleMatchesProduct(sale, { brandId: "brand_2", collectionIds: [] })).toBe(false);
    expect(saleMatchesProduct(sale, { brandId: null, collectionIds: [] })).toBe(false);
  });

  it("a collection sale matches only a product that belongs to it", () => {
    const sale = makeSale({ scope: "COLLECTION", collectionId: "col_1" });
    expect(
      saleMatchesProduct(sale, { brandId: null, collectionIds: ["col_1", "col_2"] })
    ).toBe(true);
    expect(saleMatchesProduct(sale, { brandId: null, collectionIds: ["col_2"] })).toBe(false);
    expect(saleMatchesProduct(sale, { brandId: null, collectionIds: [] })).toBe(false);
  });
});

describe("getBestSaleForProduct", () => {
  const product = { brandId: "brand_1", collectionIds: ["col_1"] };

  it("returns null when no sale matches", () => {
    const sales = [makeSale({ scope: "BRAND", brandId: "brand_2" })];
    expect(getBestSaleForProduct(sales, product, now)).toBeNull();
  });

  it("ignores a matching but expired/inactive sale", () => {
    const sales = [
      makeSale({ scope: "SITE_WIDE", isActive: false }),
      makeSale({ scope: "SITE_WIDE", endsAt: new Date("2026-01-01T00:00:00.000Z") }),
    ];
    expect(getBestSaleForProduct(sales, product, now)).toBeNull();
  });

  it("picks the single matching live sale", () => {
    const sale = makeSale({ scope: "COLLECTION", collectionId: "col_1", percentOff: 15 });
    expect(getBestSaleForProduct([sale], product, now)).toBe(sale);
  });

  it("when a site-wide and a brand sale both match, the highest percentOff wins", () => {
    const siteWide = makeSale({ id: "site", scope: "SITE_WIDE", percentOff: 10 });
    const brand = makeSale({ id: "brand", scope: "BRAND", brandId: "brand_1", percentOff: 25 });
    expect(getBestSaleForProduct([siteWide, brand], product, now)?.id).toBe("brand");
    // and the reverse — order in the array shouldn't matter
    expect(getBestSaleForProduct([brand, siteWide], product, now)?.id).toBe("brand");
  });
});

describe("applySalePercent", () => {
  it("matches validateDiscountCode's rounding formula", () => {
    expect(applySalePercent(1000, 20)).toBe(800);
    expect(applySalePercent(999, 10)).toBe(899); // Math.round(99.9) = 100 -> 999 - 100
  });
});

describe("getSaleAdjustedPriceCents", () => {
  it("passes the price through unchanged when there's no sale", () => {
    expect(getSaleAdjustedPriceCents(1000, null)).toEqual({
      priceCents: 1000,
      compareAtCents: null,
    });
  });

  it("reduces the price and sets compareAtCents to the original price", () => {
    const sale = makeSale({ percentOff: 25 });
    expect(getSaleAdjustedPriceCents(2000, sale)).toEqual({
      priceCents: 1500,
      compareAtCents: 2000,
    });
  });
});
