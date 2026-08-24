import { describe, expect, it } from "vitest";

import { buildOrderStatusTimeline } from "./orderTimeline";

const createdAt = new Date("2026-01-01T10:00:00.000Z");

function auditRow(from: string, to: string, at: string, trackingNumber?: string) {
  return { metadata: { from, to, trackingNumber }, createdAt: new Date(at) };
}

describe("buildOrderStatusTimeline", () => {
  it("returns a single pending entry when there are no audit rows", () => {
    const entries = buildOrderStatusTimeline({ createdAt }, []);
    expect(entries).toEqual([{ status: "pending", at: createdAt }]);
  });

  it("appends each real transition in order", () => {
    const rows = [
      auditRow("pending", "processing", "2026-01-01T11:00:00.000Z"),
      auditRow("processing", "shipped", "2026-01-02T09:00:00.000Z"),
    ];
    const entries = buildOrderStatusTimeline({ createdAt }, rows);
    expect(entries).toEqual([
      { status: "pending", at: createdAt },
      { status: "processing", at: new Date("2026-01-01T11:00:00.000Z") },
      { status: "shipped", at: new Date("2026-01-02T09:00:00.000Z") },
    ]);
  });

  it("filters out a same-status resubmission used only to attach a tracking number", () => {
    const rows = [
      auditRow("pending", "processing", "2026-01-01T11:00:00.000Z"),
      auditRow("processing", "shipped", "2026-01-02T09:00:00.000Z"),
      auditRow("shipped", "shipped", "2026-01-02T10:00:00.000Z", "1Z999AA10123456784"),
    ];
    const entries = buildOrderStatusTimeline({ createdAt }, rows);
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.status)).toEqual(["pending", "processing", "shipped"]);
  });

  it("ends with a cancelled entry for a cancelled order", () => {
    const rows = [
      auditRow("pending", "processing", "2026-01-01T11:00:00.000Z"),
      auditRow("processing", "cancelled", "2026-01-01T12:00:00.000Z"),
    ];
    const entries = buildOrderStatusTimeline({ createdAt }, rows);
    expect(entries.map((e) => e.status)).toEqual(["pending", "processing", "cancelled"]);
  });

  it("safely skips malformed or legacy metadata instead of throwing", () => {
    const rows = [
      { metadata: null, createdAt: new Date("2026-01-01T11:00:00.000Z") },
      { metadata: { foo: "bar" }, createdAt: new Date("2026-01-01T12:00:00.000Z") },
      auditRow("pending", "processing", "2026-01-01T13:00:00.000Z"),
    ];
    const entries = buildOrderStatusTimeline({ createdAt }, rows);
    expect(entries.map((e) => e.status)).toEqual(["pending", "processing"]);
  });
});
