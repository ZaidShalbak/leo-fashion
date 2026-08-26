import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import type { AppLocale } from "@/i18n/routing";
import { PolicySections, type PolicySection } from "@/components/storefront/PolicySections";

type Props = {
  params: Promise<{ locale: AppLocale }>;
};

// The date this policy was last published — update by hand whenever the
// content below actually changes, same as any other versioned document.
const LAST_UPDATED = new Date("2026-08-26");

const CONTACT_WHATSAPP = "+972 59 573 7545";
const CONTACT_EMAIL = "info@leofashion.com";

const SECTIONS_EN: PolicySection[] = [
  {
    heading: "Introduction",
    paragraphs: [
      "These Terms & Conditions govern your use of the Leo Fashion website and the orders you place through it. By browsing the site or placing an order, you agree to the terms below.",
    ],
  },
  {
    heading: "Use of the Site",
    list: [
      "You may use this site only for lawful purposes and in a way that doesn't interfere with anyone else's use of it.",
      "You may not attempt to disrupt, overload, or gain unauthorized access to any part of the site.",
      "We may update, restrict, or temporarily suspend access to the site or any part of it without prior notice.",
    ],
  },
  {
    heading: "Accounts",
    list: [
      "Creating an account requires accurate, complete information — you're responsible for keeping it up to date.",
      "You're responsible for keeping your account credentials confidential and for all activity under your account.",
      "We're not responsible for delays or errors caused by outdated or incorrect account or shipping information.",
    ],
  },
  {
    heading: "Orders & Payment",
    list: [
      "All orders are subject to product availability and confirmation by us.",
      "We accept payment on delivery or by invoice at pickup — no card details are collected online.",
      "We may cancel an order if it can't be confirmed, if items become unavailable, or if delivery isn't possible.",
      "A discount code, where applied, is limited to one use per customer and subject to its own listed conditions (expiry date, minimum order amount, or a maximum number of total uses).",
    ],
  },
  {
    heading: "Shipping & Delivery",
    paragraphs: [
      "Orders are typically delivered within 2–5 business days, depending on your selected delivery area. In-store pickup is also available where offered.",
      "Delivery times are estimates, not guarantees — we're not responsible for delays caused by circumstances outside our control (courier delays, weather, access restrictions, and similar).",
    ],
  },
  {
    heading: "Returns & Exchanges",
    list: [
      "Exchanges (for a different size) are accepted within 3 days of delivery.",
      "Items must be unused, unworn, in their original condition, and returned with their original packaging.",
      "A refund (rather than an exchange) is only offered where a genuine manufacturing defect is confirmed.",
      "Items purchased at a discounted or sale price are not eligible for return or exchange.",
      "To start a return or exchange, contact us using the details below before sending anything back.",
    ],
  },
  {
    heading: "Your Rights",
    list: [
      "You can access and update your account details at any time from your account page.",
      "You can unsubscribe from promotional messages at any time.",
      "We take complaints and feedback seriously and aim to respond promptly.",
    ],
  },
  {
    heading: "Limitation of Liability",
    paragraphs: [
      "We work to keep the information on this site accurate and up to date, but we don't guarantee the site will always be error-free or uninterrupted, and we're not liable for damages arising from your use of it, to the extent permitted by law.",
    ],
  },
  {
    heading: "Intellectual Property",
    paragraphs: [
      "All content on this site — including text, images, and logos — belongs to Leo Fashion or is used under license. Copying or redistributing it without our prior written permission isn't permitted.",
    ],
  },
  {
    heading: "Changes to These Terms",
    paragraphs: [
      "We may update these terms from time to time. Changes take effect once posted here, and the date at the top of this page reflects the most recent update.",
    ],
  },
];

const SECTIONS_AR: PolicySection[] = [
  {
    heading: "مقدمة",
    paragraphs: [
      "تحكم شروط الاستخدام هذه استخدامك لموقع Leo Fashion الإلكتروني والطلبات التي تقوم بتقديمها من خلاله. من خلال تصفح الموقع أو تقديم طلب، فإنك توافق على الشروط الموضحة أدناه.",
    ],
  },
  {
    heading: "استخدام الموقع",
    list: [
      "يجوز لك استخدام هذا الموقع فقط للأغراض المشروعة وبطريقة لا تؤثر على استخدام الآخرين له.",
      "لا يجوز لك محاولة تعطيل الموقع أو إثقاله أو الوصول إلى أي جزء منه دون تصريح.",
      "يحق لنا تحديث الموقع أو تقييد الوصول إليه أو تعليقه مؤقتًا، كليًا أو جزئيًا، دون إشعار مسبق.",
    ],
  },
  {
    heading: "الحسابات",
    list: [
      "يتطلب إنشاء حساب تقديم معلومات دقيقة وكاملة — وأنت مسؤول عن إبقائها محدثة.",
      "أنت مسؤول عن الحفاظ على سرية بيانات الدخول لحسابك وعن جميع الأنشطة التي تتم من خلاله.",
      "لا نتحمل مسؤولية أي تأخير أو خطأ ناتج عن معلومات حساب أو شحن غير محدثة أو غير صحيحة.",
    ],
  },
  {
    heading: "الطلبات والدفع",
    list: [
      "جميع الطلبات تخضع لتوفر المنتج وتأكيدنا له.",
      "نقبل الدفع عند الاستلام أو عبر فاتورة عند استلام الطلب — لا يتم جمع بيانات بطاقات الدفع إلكترونيًا.",
      "يحق لنا إلغاء أي طلب إذا تعذّر تأكيده، أو أصبح المنتج غير متوفر، أو تعذّر التوصيل.",
      "يقتصر استخدام كود الخصم، عند تطبيقه، على مرة واحدة لكل عميل، ويخضع لشروطه الخاصة المعلنة (تاريخ انتهاء الصلاحية، الحد الأدنى لقيمة الطلب، أو حد أقصى لعدد مرات الاستخدام الكلي).",
    ],
  },
  {
    heading: "الشحن والتسليم",
    paragraphs: [
      "عادةً ما يتم توصيل الطلبات خلال يومين إلى خمسة أيام عمل، حسب منطقة التوصيل التي تختارها. كما يتوفر خيار الاستلام من المتجر أينما كان متاحًا.",
      "مواعيد التوصيل هي تقديرات وليست مواعيد مضمونة — لا نتحمل مسؤولية التأخير الناتج عن ظروف خارجة عن إرادتنا (تأخر شركة التوصيل، الأحوال الجوية، قيود الوصول، وما شابه).",
    ],
  },
  {
    heading: "سياسة الإرجاع والاستبدال",
    list: [
      "يُقبل استبدال المنتج (لمقاس مختلف) خلال 3 أيام من تاريخ الاستلام.",
      "يجب أن يكون المنتج غير مستخدم وغير مرتدى وفي حالته الأصلية، ويُعاد مع تغليفه الأصلي.",
      "يُقدَّم استرجاع المبلغ (بدلاً من الاستبدال) فقط في حال تأكّد وجود عيب مصنعي حقيقي.",
      "المنتجات التي تم شراؤها بسعر مخفّض أو ضمن عرض لا يمكن إرجاعها أو استبدالها.",
      "لبدء عملية إرجاع أو استبدال، يُرجى التواصل معنا عبر بيانات التواصل أدناه قبل إعادة أي منتج.",
    ],
  },
  {
    heading: "حقوقك",
    list: [
      "يمكنك الوصول إلى بيانات حسابك وتحديثها في أي وقت من صفحة حسابك.",
      "يمكنك إلغاء الاشتراك من الرسائل الترويجية في أي وقت.",
      "نأخذ الشكاوى والملاحظات على محمل الجد ونسعى للرد عليها بسرعة.",
    ],
  },
  {
    heading: "حدود المسؤولية",
    paragraphs: [
      "نعمل على إبقاء المعلومات الموجودة على هذا الموقع دقيقة ومحدثة، لكننا لا نضمن خلو الموقع من الأخطاء أو انقطاع الخدمة بشكل تام، ولا نتحمل مسؤولية أي أضرار ناتجة عن استخدامك للموقع، إلى الحد الذي يسمح به القانون.",
    ],
  },
  {
    heading: "الملكية الفكرية",
    paragraphs: [
      "جميع محتويات هذا الموقع — بما في ذلك النصوص والصور والشعارات — مملوكة لـ Leo Fashion أو مستخدمة بترخيص. لا يُسمح بنسخها أو إعادة توزيعها دون إذن خطي مسبق منا.",
    ],
  },
  {
    heading: "التعديلات على هذه الشروط",
    paragraphs: [
      "قد نقوم بتحديث هذه الشروط من وقت لآخر. تصبح التعديلات سارية فور نشرها هنا، ويوضح التاريخ أعلى هذه الصفحة تاريخ آخر تحديث.",
    ],
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PolicyPages" });
  return { title: t("termsTitle") };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("PolicyPages");
  const sections = locale === "ar" ? SECTIONS_AR : SECTIONS_EN;
  const dateLocale = locale === "ar" ? "ar" : "en-US";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{t("termsTitle")}</h1>
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
