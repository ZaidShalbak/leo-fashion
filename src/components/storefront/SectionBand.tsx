/**
 * Shared chrome for the homepage's full-bleed "showcase" sections (Shop the
 * range / Shop by brand / Best sellers / New arrivals) — a fixed near-black
 * "ink" / warm-cream "paper" alternation, condensed display type, and a
 * hairline divider under the heading. Everything inside the band (grid,
 * wall, strip — whatever a given section needs) is bespoke and passed as
 * children; this component only owns the repeated header treatment so it
 * isn't copy-pasted four times.
 */
export function SectionBand({
  tone,
  title,
  subtitle,
  className,
  children,
}: {
  tone: "ink" | "paper";
  title: string;
  /** Small text in the header's end corner — usually a plain subtitle
   * string, but a "View all" link (see BrandsSection) works just as well. */
  subtitle?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "ink"
      ? "bg-showcase-ink text-showcase-paper"
      : "bg-showcase-paper text-showcase-ink";

  return (
    <section className={`${toneClasses} px-6 py-14 sm:px-10 sm:py-18 ${className ?? ""}`}>
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-current pb-4">
        <h2 className="font-showcase-display text-[clamp(2.2rem,5.5vw,3.4rem)] leading-[0.9] uppercase rtl:leading-[1.1] rtl:normal-case">
          {title}
        </h2>
        {subtitle && (
          <span className="text-xs font-semibold tracking-[0.08em] uppercase opacity-55 rtl:font-bold rtl:tracking-normal rtl:normal-case">
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
