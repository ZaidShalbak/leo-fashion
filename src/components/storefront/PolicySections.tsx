export type PolicySection = {
  heading: string;
  paragraphs?: string[];
  list?: string[];
};

/**
 * Shared prose renderer for the Terms & Privacy pages — same heading/
 * paragraph/bulleted-list shape covers both documents, so one component
 * renders either from a plain data array rather than duplicating the
 * markup twice. Content itself lives in each page file, not here.
 */
export function PolicySections({ sections }: { sections: PolicySection[] }) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.heading}>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">{section.heading}</h2>
          {section.paragraphs?.map((paragraph, index) => (
            <p key={index} className="text-muted-foreground mb-3 text-sm leading-relaxed">
              {paragraph}
            </p>
          ))}
          {section.list && (
            <ul className="text-muted-foreground list-disc space-y-1.5 ps-5 text-sm leading-relaxed">
              {section.list.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
