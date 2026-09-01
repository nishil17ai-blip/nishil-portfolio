// Text/count are still accepted so every call site (`<SectionLabel text="Work" count="4 systems" />`)
// keeps compiling unchanged - we just stop rendering them, leaving only the rule line.
export function SectionLabel(_props: { text: string; count?: string }) {
  return <div className="eyebrow" aria-hidden="true" />;
}