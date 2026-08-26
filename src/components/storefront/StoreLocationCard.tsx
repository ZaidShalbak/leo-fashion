import { getTranslations } from "next-intl/server";

// Trimmed of the session-specific ?entry=/g_ep= tracking params Google
// appends when you copy a link from the app — everything before that is
// the real, stable place URL (confirmed against the store's verified
// Google Business listing).
const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/place/Leo+fashion/@32.4688758,35.2941389,19z/data=!4m14!1m7!3m6!1s0x151cff12fbb26517:0x3c86d81e7f04467e!2sLeo+fashion!8m2!3d32.469002!4d35.2947211!16s%2Fg%2F11hzlmchny!3m5!1s0x151cff12fbb26517:0x3c86d81e7f04467e!8m2!3d32.469002!4d35.2947211!16s%2Fg%2F11hzlmchny";

// Real street/place names (جنين / الشارع العسكري / دوار البطيخة), not UI
// copy — kept in Arabic on both /en and /ar rather than translated, same
// as the terms/privacy pages' fixed contact details.
const ADDRESS_AR = "جنين - الشارع العسكري - دوار البطيخة";

/**
 * Footer "visit us" card — a small illustrated scene of the roundabout
 * next to the store (دوار البطيخة / Al-Batikha roundabout, on الشارع
 * العسكري), not a real map embed: Google's iframe embed needs either an
 * unofficial endpoint or a billed API key, both worse tradeoffs than a
 * hand-drawn illustration that matches the rest of the site's hand-rolled
 * icon work (Logo, HeroCarousel). The whole card links out to the real,
 * verified Google Maps listing. The illustration is decorative — its text
 * labels are aria-hidden, so the link's accessible name comes from the
 * visible copy below it (store name, address, "get directions").
 */
export async function StoreLocationCard() {
  const t = await getTranslations("Nav");

  return (
    <a
      href={GOOGLE_MAPS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group block max-w-xs rounded-lg border border-white/10 bg-white/[3%] p-5 transition hover:border-white/25 hover:bg-white/5"
    >
      <p className="mb-3 text-[11px] font-medium tracking-[0.1em] text-white/45 uppercase">
        {t("visitStore")}
      </p>

      <svg viewBox="0 0 300 170" className="mb-2.5 h-auto w-full" aria-hidden="true">
        <defs>
          <radialGradient id="melonBody" cx="36%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#5aab5f" />
            <stop offset="55%" stopColor="#316f41" />
            <stop offset="100%" stopColor="#1e4a2a" />
          </radialGradient>
          <linearGradient id="stemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8a9a55" />
            <stop offset="100%" stopColor="#4d5a2c" />
          </linearGradient>
          <clipPath id="melonClip">
            <ellipse cx="70" cy="87" rx="14.5" ry="13.5" />
          </clipPath>
        </defs>

        <line
          x1="70"
          y1="52"
          x2="70"
          y2="14"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="2"
          strokeDasharray="1 8"
          strokeLinecap="round"
        />
        <text
          x="70"
          y="9"
          textAnchor="middle"
          fontSize="9.5"
          letterSpacing="0.3"
          className="fill-white/50 font-[family-name:var(--font-tajawal)]"
        >
          شارع حيفا
        </text>

        <path
          d="M70 166 L70 120 C 70 100, 42 86, 10 86"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="2"
          strokeDasharray="1 8"
          strokeLinecap="round"
          fill="none"
        />
        <text
          x="76"
          y="151"
          textAnchor="start"
          fontSize="9.5"
          letterSpacing="0.3"
          className="fill-white/50 font-[family-name:var(--font-tajawal)]"
        >
          الشارع العسكري
        </text>

        <circle cx="70" cy="86" r="30" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="9" />

        <ellipse cx="70" cy="101" rx="12" ry="2.4" fill="#000" opacity="0.28" />
        <path
          d="M67.5 75 C 66.5 71, 67.5 67.5, 71.5 66 C 69.6 69, 69 72, 69.8 76 Z"
          fill="url(#stemGrad)"
        />
        <path
          d="M71.5 67.5 C 75 66, 78.5 66.8, 79.5 69 C 76.5 69, 74 69.7, 71.5 71.5 Z"
          fill="url(#stemGrad)"
          opacity="0.9"
        />
        <g clipPath="url(#melonClip)">
          <ellipse cx="70" cy="87" rx="14.5" ry="13.5" fill="url(#melonBody)" />
          <g fill="#20502c" opacity="0.9">
            <path d="M56 72 C 53.5 79, 53.5 95, 56 102 C 58.5 95, 58.5 79, 56 72 Z" />
            <path d="M63 71 C 60.5 78.5, 60.5 95.5, 63 103 C 65.5 95.5, 65.5 78.5, 63 71 Z" />
            <path d="M70 70.5 C 67.3 78, 67.3 96, 70 103.5 C 72.7 96, 72.7 78, 70 70.5 Z" />
            <path d="M77 71 C 74.5 78.5, 74.5 95.5, 77 103 C 79.5 95.5, 79.5 78.5, 77 71 Z" />
            <path d="M84 72 C 81.5 79, 81.5 95, 84 102 C 86.5 95, 86.5 79, 84 72 Z" />
          </g>
          <ellipse
            cx="64"
            cy="81"
            rx="4.5"
            ry="2.6"
            fill="#fff"
            opacity="0.16"
            transform="rotate(-25 64 81)"
          />
        </g>

        <text
          x="70"
          y="134"
          textAnchor="middle"
          fontSize="10.5"
          letterSpacing="0.5"
          className="fill-white/50 font-[family-name:var(--font-tajawal)]"
        >
          دوار البطيخة
        </text>

        <path
          d="M98 78 C 130 74, 150 82, 172 76"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="2"
          strokeDasharray="1 8"
          strokeLinecap="round"
          fill="none"
        />
        <g transform="translate(172, 46)">
          <path
            d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 26 15 26s15-14.8 15-26C30 6.7 23.3 0 15 0z"
            fill="#fff"
          />
          <circle cx="15" cy="15" r="5.6" fill="#0a0a0a" />
        </g>
      </svg>

      <p dir="ltr" className="font-[family-name:var(--font-bebas-neue)] text-2xl tracking-wide text-white">
        Leo Fashion
      </p>
      <p dir="rtl" className="mb-4 font-[family-name:var(--font-tajawal)] text-sm text-white/55">
        {ADDRESS_AR}
      </p>

      <span className="flex items-center gap-1.5 border-t border-white/10 pt-3.5 text-[12.5px] font-medium text-white/85">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5 shrink-0"
          aria-hidden="true"
        >
          <line x1="7" y1="17" x2="17" y2="7" />
          <polyline points="7 7 17 7 17 17" />
        </svg>
        {t("getDirections")}
      </span>
    </a>
  );
}
