// @vitest-environment node
//
// Unit tests for sendEmailSafely's resilience guarantee: every email send
// in this codebase goes through it, and it must never throw, whether the
// underlying Resend call rejects outright or resolves with an {error}
// payload (Resend's SDK does the latter for a lot of failure modes, e.g. an
// unverified sending domain, rather than throwing).
import "dotenv/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockSend = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

describe("sendEmailSafely (via sendAdminNewOrderEmail)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.RESEND_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  const order = {
    id: "test-order-id",
    createdAt: new Date("2026-01-01"),
    subtotalCents: 1000,
    discountCents: 0,
    discountCodeSnapshot: null,
    deliveryFeeCents: null,
    deliveryZoneNameSnapshot: null,
    notes: null,
    shippingName: "Jane Doe",
    shippingLine1: "123 Main St",
    shippingLine2: null,
    shippingCity: "Ramallah",
    shippingState: null,
    shippingPostalCode: "00000",
    shippingCountry: "Palestine",
    shippingPhone: null,
    items: [],
  } as never;

  it("does not throw when the Resend SDK call rejects outright", async () => {
    mockSend.mockRejectedValueOnce(new Error("network down"));
    const { sendAdminNewOrderEmail } = await import("./email");

    await expect(
      sendAdminNewOrderEmail({
        order,
        adminEmails: ["admin@example.com"],
        customerName: "Jane",
        customerEmail: "jane@example.com",
      })
    ).resolves.toBeUndefined();
  });

  it("does not throw when the Resend SDK resolves with an error payload", async () => {
    mockSend.mockResolvedValueOnce({ data: null, error: { message: "domain not verified" } });
    const { sendAdminNewOrderEmail } = await import("./email");

    await expect(
      sendAdminNewOrderEmail({
        order,
        adminEmails: ["admin@example.com"],
        customerName: "Jane",
        customerEmail: "jane@example.com",
      })
    ).resolves.toBeUndefined();
  });

  it("skips sending (without throwing) when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    const { sendAdminNewOrderEmail } = await import("./email");

    await expect(
      sendAdminNewOrderEmail({
        order,
        adminEmails: ["admin@example.com"],
        customerName: "Jane",
        customerEmail: "jane@example.com",
      })
    ).resolves.toBeUndefined();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
