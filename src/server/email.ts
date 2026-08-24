import "server-only";
import { Resend } from "resend";
import type { ReactElement } from "react";
import type { Order, OrderItem } from "@prisma/client";

import type { AppLocale } from "@/i18n/routing";
import { AdminNewOrderEmail } from "@/emails/AdminNewOrderEmail";
import { CustomerOrderStatusEmail } from "@/emails/CustomerOrderStatusEmail";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
// Sandbox default only ever delivers to the Resend account's own verified
// address — real customer/admin delivery needs a verified sending domain in
// EMAIL_FROM (see .env.example). Local dev keeps using the sandbox address.
const FROM = process.env.EMAIL_FROM ?? "Leo Fashion <onboarding@resend.dev>";

export type OrderWithItems = Order & { items: OrderItem[] };

/**
 * Every email send goes through this — log and swallow, never throw. Unlike
 * logAudit (an unwrapped await expected to succeed), a missing API key, a
 * Resend outage, or a bad recipient address must never break the order flow
 * (placeOrder / updateOrderStatus) that triggered the send.
 */
async function sendEmailSafely(params: {
  to: string[];
  subject: string;
  react: ReactElement;
}): Promise<void> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${params.subject}" to ${params.to.join(", ")}`);
    return;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, ...params });
    if (error) {
      console.error(`[email] Resend rejected "${params.subject}":`, error);
    }
  } catch (error) {
    console.error(`[email] Failed to send "${params.subject}":`, error);
  }
}

export async function sendAdminNewOrderEmail(input: {
  order: OrderWithItems;
  adminEmails: string[];
  customerName: string;
  customerEmail: string;
}): Promise<void> {
  const { order, adminEmails, customerName, customerEmail } = input;
  if (adminEmails.length === 0) return;

  await sendEmailSafely({
    to: adminEmails,
    subject: `New order #${order.id.slice(-8).toUpperCase()} — ${customerName}`,
    react: AdminNewOrderEmail({ order, customerName, customerEmail }),
  });
}

export async function sendCustomerOrderStatusEmail(input: {
  order: OrderWithItems;
  customerEmail: string;
  customerName: string;
  locale: AppLocale;
}): Promise<void> {
  const { order, customerEmail, customerName, locale } = input;

  await sendEmailSafely({
    to: [customerEmail],
    subject: CustomerOrderStatusEmail.subjectFor(order, locale),
    react: CustomerOrderStatusEmail({ order, customerName, locale }),
  });
}
