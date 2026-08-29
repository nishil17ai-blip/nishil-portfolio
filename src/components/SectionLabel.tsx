export function SectionLabel({ text, count }: { text: string; count?: string }) {
  return (
    <div className="eyebrow">
      <span>{text}</span>
      {count && <span className="count">{count}</span>}
    </div>
  );
}
