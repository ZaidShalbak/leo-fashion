import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import type { AppLocale } from "@/i18n/routing";
import { PolicySections, type PolicySection } from "@/components/storefront/PolicySections";

type Props = {
  params: Promise<{ locale: AppLocale }>;
};

// Keep in sync with terms/page.tsx's LAST_UPDATED — bump both together
// whenever either document's content actually changes.
const LAST_UPDATED = new Date("2026-08-26");

const CONTACT_WHATSAPP = "+972 59 573 7545";
const CONTACT_EMAIL = "info@leofashion.com";

const SECTIONS_EN: PolicySection[] = [
  {
    heading: "Introduction",
    paragraphs: [
      "This Privacy Policy explains what information Leo Fashion collects, how we use it, and the choices you have. It applies to the Leo Fashion website and every service offered through it.",
    ],
  },
  {
    heading: "Information We Collect",
    list: [
      "Full name",
      "Email address",
      "Phone number (optional)",
      "Shipping address",
      "Account details and order history",
      "Cart activity and any discount codes applied",
    ],
  },
  {
    heading: "How We Collect It",
    list: [
      "When you create an account or sign in.",
      "When you place an order.",
      "When you contact us for support.",
    ],
  },
  {
    heading: "How We Use It",
    list: [
      "To process and fulfill your orders.",
      "To deliver products and coordinate delivery.",
      "To provide customer support and respond to your questions.",
      "To send order-status updates and confirmations.",
      "To improve the site and the shopping experience.",
      "To protect accounts and prevent misuse (for example, discount-code or inventory abuse).",
    ],
  },
  {
    heading: "Sharing Your Information",
    paragraphs: [
      "We don't sell or rent your personal information to anyone.",
      "We share only what's necessary with the service providers that help us run the site — our hosting and authentication provider (Supabase) and our transactional-email provider (Resend) — solely to provide the service you're using. We don't share your data with them for their own marketing purposes.",
    ],
  },
  {
    heading: "Data Security",
    paragraphs: [
      "We take reasonable technical measures to protect your data from unauthorized access, alteration, or disclosure. Your password itself is never stored or visible to us — account authentication is handled by our identity provider, Supabase.",
    ],
  },
  {
    heading: "Your Rights",
    list: [
      "Access the personal data we hold about you.",
      "Request a correction or update to your data.",
      "Request deletion of your data, subject to any records we're required to keep (for example, order history).",
      "Unsubscribe from promotional messages at any time.",
    ],
  },
  {
    heading: "Changes to This Policy",
    paragraphs: [
      "We may update this policy from time to time. Changes take effect once posted here, and the date at the top of this page reflects the most recent update.",
    ],
  },
];

const SECTIONS_AR: PolicySection[] = [
  {
    heading: "مقدمة",
    paragraphs: [
      "توضح سياسة الخصوصية هذه المعلومات التي يجمعها Leo Fashion، وكيفية استخدامها، والخيارات المتاحة لك. تنطبق هذه السياسة على موقع Leo Fashion الإلكتروني وجميع الخدمات المقدمة من خلاله.",
    ],
  },
  {
    heading: "المعلومات التي نقوم بجمعها",
    list: [
      "الاسم الكامل",
      "البريد الإلكتروني",
      "رقم الهاتف (اختياري)",
      "عنوان الشحن",
      "بيانات الحساب وسجل الطلبات",
      "نشاط سلة التسوق وأي أكواد خصم تم استخدامها",
    ],
  },
  {
    heading: "كيفية جمع هذه المعلومات",
    list: [
      "عند إنشاء حساب أو تسجيل الدخول.",
      "عند تقديم طلب.",
      "عند التواصل معنا للحصول على الدعم.",
    ],
  },
  {
    heading: "كيفية استخدام هذه المعلومات",
    list: [
      "لمعالجة طلباتك وإتمامها.",
      "لتوصيل المنتجات وتنسيق عملية التوصيل.",
      "لتقديم الدعم والإجابة على استفساراتك.",
      "لإرسال تحديثات وتأكيدات حول حالة الطلب.",
      "لتحسين الموقع وتجربة التسوق.",
      "لحماية الحسابات ومنع سوء الاستخدام (مثل إساءة استخدام أكواد الخصم أو المخزون).",
    ],
  },
  {
    heading: "مشاركة معلوماتك",
    paragraphs: [
      "لا نقوم ببيع أو تأجير بياناتك الشخصية لأي جهة.",
      "نشارك فقط ما هو ضروري مع مزودي الخدمات الذين يساعدوننا على تشغيل الموقع — مزود الاستضافة والمصادقة (Supabase) ومزود خدمة البريد الإلكتروني التشغيلي (Resend) — وذلك فقط لتقديم الخدمة التي تستخدمها. لا نشارك بياناتك معهم لأغراضهم التسويقية الخاصة.",
    ],
  },
  {
    heading: "حماية البيانات",
    paragraphs: [
      "نتخذ إجراءات تقنية معقولة لحماية بياناتك من الوصول غير المصرح به أو التعديل أو الإفصاح. كلمة المرور الخاصة بك لا تُخزَّن أو تكون مرئية لنا إطلاقًا — تتم المصادقة على الحساب عبر مزود الهوية الخاص بنا، Supabase.",
    ],
  },
  {
    heading: "حقوقك",
    list: [
      "الوصول إلى البيانات الشخصية التي نحتفظ بها عنك.",
      "طلب تصحيح أو تحديث بياناتك.",
      "طلب حذف بياناتك، مع مراعاة أي سجلات يتوجب علينا الاحتفاظ بها (مثل سجل الطلبات).",
      "إلغاء الاشتراك من الرسائل الترويجية في أي وقت.",
    ],
  },
  {
    heading: "التعديلات على هذه السياسة",
    paragraphs: [
      "قد نقوم بتحديث هذه السياسة من وقت لآخر. تصبح التعديلات سارية فور نشرها هنا، ويوضح التاريخ أعلى هذه الصفحة تاريخ آخر تحديث.",
    ],
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PolicyPages" });
  return { title: t("privacyTitle") };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("PolicyPages");
  const sections = locale === "ar" ? SECTIONS_AR : SECTIONS_EN;
  const dateLocale = locale === "ar" ? "ar" : "en-US";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{t("privacyTitle")}</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        {t("lastUpdated", {
          date: LAST_UPDATED.toLocaleDateString(dateLocale, {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        })}
      </p>

      <div className="mt-10">
        <PolicySections sections={sections} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">{t("contactHeading")}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed" dir="ltr">
          {CONTACT_EMAIL} · {CONTACT_WHATSAPP}
        </p>
      </section>
    </div>
  );
}
