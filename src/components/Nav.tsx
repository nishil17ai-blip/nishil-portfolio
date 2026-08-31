const LINKS = [
  { id: "work", label: "Work" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Stack" },
  { id: "writing", label: "Writing" },
  { id: "contact", label: "Contact" },
];

export function Nav({ active }: { active: string }) {
  return (
    <nav className="nav">
      <div className="nav-links">
        {LINKS.map((l) => (
          <a key={l.id} href={`#${l.id}`} data-active={active === l.id}>
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}