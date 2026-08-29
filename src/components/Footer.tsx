import { profile, isPlaceholder } from "../lib/profile";
import { SectionLabel } from "./SectionLabel";

export function Footer() {
  const { identity, education } = profile;
  const links = [
    { label: "Email", href: `mailto:${identity.email}`, value: identity.email },
    { label: "LinkedIn", href: identity.links.linkedin, value: "linkedin" },
    { label: "GitHub", href: identity.links.github, value: "github" },
  ].filter((l) => !isPlaceholder(l.href));

  return (
    <section id="contact" className="footer">
      <SectionLabel text="Contact" />
      <div className="footer-grid">
        <div>
          <h2>Let's talk about what you're building.</h2>
          <p>
            I'm most useful on teams putting LLMs in front of real users, where getting the
            answer right matters more than getting it fast.
          </p>
        </div>

        <div className="footer-meta">
          {links.map((l) => (
            <div key={l.label}>
              <a href={l.href} target="_blank" rel="noreferrer">
                {l.label} ↗
              </a>
            </div>
          ))}
          <div>{identity.location}</div>
        </div>

        <div className="footer-meta">
          <div>{education.degree}</div>
          <div>{education.school}</div>
          <div>
            {education.years} · {education.detail}
          </div>
        </div>
      </div>

      <div className="colophon">
        <span>Bricolage Grotesque · Public Sans · JetBrains Mono</span>
        <span>Points in the background are a morphing embedding field, not decoration</span>
        <span>© {new Date().getFullYear()} {identity.name}</span>
      </div>
    </section>
  );
}
