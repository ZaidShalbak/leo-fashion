import { useTranslations } from "next-intl";

const SOCIAL_LINKS = [
  { key: "instagram", href: "https://www.instagram.com/leo_jenin/" },
  { key: "facebook", href: "https://www.facebook.com/LEOMENFASHION/" },
] as const;

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

const ICONS = { instagram: InstagramIcon, facebook: FacebookIcon };

/** Footer icon row linking out to the store's social profiles — URLs are
 * hardcoded here rather than admin-editable, matching how other rarely-
 * changing static content (brand wordmark, placeholder assets) is handled
 * in this codebase; swap the href values directly if the profiles change. */
export function SocialLinks() {
  const t = useTranslations("Nav");

  return (
    <div className="flex items-center justify-center gap-4">
      {SOCIAL_LINKS.map(({ key, href }) => {
        const Icon = ICONS[key];
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t(`${key}Link`)}
            className="text-white/70 transition hover:text-white"
          >
            <Icon className="size-5" />
          </a>
        );
      })}
    </div>
  );
}
