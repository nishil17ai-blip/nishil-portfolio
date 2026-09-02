import { useEffect, useRef, useState } from "react";
import { profile, isPlaceholder } from "../lib/profile";
import { SectionLabel } from "./SectionLabel";

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 6.2 12 12.6l8.5-6.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.79-.25.79-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.19 1.78 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.21.66.79.55A10.51 10.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

const ICONS = { email: EmailIcon, linkedin: LinkedInIcon, github: GitHubIcon };

export function Footer() {
  const { identity, education } = profile;
  const gmailCompose = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    identity.email
  )}&su=${encodeURIComponent("Let's talk about what you're building")}`;

  const socials = [
    { label: "Email", href: gmailCompose, icon: "email" as const, note: null },
    { label: "LinkedIn", href: identity.links.linkedin, icon: "linkedin" as const, note: null },
    {
      label: "GitHub",
      href: identity.links.github,
      icon: "github" as const,
      note: "GitHub will get a full run of commits soon - currently WIP.",
    },
  ].filter((l) => !isPlaceholder(l.href));

  const [activeTip, setActiveTip] = useState<string | null>(null);
  const socialsRef = useRef<HTMLDivElement>(null);

  // Only relevant for the tap-to-open path on touch devices - a hover
  // dismissal already happens naturally via onMouseLeave. Tapping
  // anywhere outside the social icons closes whatever tip is open.
  useEffect(() => {
    if (!activeTip) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (socialsRef.current && !socialsRef.current.contains(e.target as Node)) {
        setActiveTip(null);
      }
    };
    document.addEventListener("touchstart", onOutside);
    document.addEventListener("click", onOutside);
    return () => {
      document.removeEventListener("touchstart", onOutside);
      document.removeEventListener("click", onOutside);
    };
  }, [activeTip]);

  const [email, setEmail] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = "Let's talk about what you're building";
    const bodyLines = [
      note || "Hey Nishil - here's what I'm building:",
      "",
      `My email: ${email}`,
      linkedin ? `LinkedIn: ${linkedin}` : null,
    ].filter(Boolean);
    // mailto: silently does nothing on a visitor's machine unless they
    // have a default mail app configured - which is common enough that
    // the button looked like it worked while actually sending nothing.
    // Gmail's compose URL opens in a real tab every time, pre-filled.
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      identity.email
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    window.open(gmailUrl, "_blank", "noreferrer");
    setSent(true);
    window.setTimeout(() => setSent(false), 4000);
  };

  const handleSocialEnter = (l: (typeof socials)[number]) => () => {
    if (l.note) setActiveTip(l.label);
  };

  const handleSocialLeave = () => setActiveTip(null);

  // Hover has no equivalent on touch, so without this the GitHub note
  // (the only one with a `note` at all) would simply never be visible
  // on a phone or tablet. A tap toggles it instead; the link itself
  // still opens normally via href, so this only ever prevents that
  // *specific* tap from also navigating - not every tap on the icon.
  const handleSocialClick = (l: (typeof socials)[number]) => (e: React.MouseEvent) => {
    if (!l.note) return;
    if (activeTip === l.label) {
      setActiveTip(null);
      return;
    }
    e.preventDefault();
    setActiveTip(l.label);
  };

  return (
    <section id="contact" className="footer">
      <SectionLabel text="Contact" />

      <div className="footer-grid">
        <div className="footer-lead">
          <h2>Let's talk about what you're building.</h2>
          <p>
          Reach out by filling below form if the question keeping you up isn't 'does it work' but 'what happens when it doesn't....
          </p>

          <form className="contact-form" onSubmit={submit}>
            <div className="contact-field">
              <label htmlFor="cf-email">Your email</label>
              <input
                id="cf-email"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="contact-field">
              <label htmlFor="cf-linkedin">LinkedIn (optional)</label>
              <input
                id="cf-linkedin"
                type="text"
                placeholder="linkedin.com/in/you"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
              />
            </div>
            <div className="contact-field">
              <label htmlFor="cf-note">What are you building?</label>
              <textarea
                id="cf-note"
                rows={3}
                placeholder="A couple lines is plenty."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <button className="btn btn-solid contact-submit" type="submit">
              {sent ? "Opened in Gmail - check the new tab ↗" : "Let's talk →"}
            </button>
          </form>
        </div>

        <div className="footer-panel">
          <div className="social-icons" ref={socialsRef}>
            {socials.map((l) => {
              const Icon = ICONS[l.icon];
              return (
                <div className="social-icon-wrap" key={l.label}>
                  <a
                    className="social-icon"
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={l.label}
                    title={l.note ? undefined : l.label}
                    onMouseEnter={handleSocialEnter(l)}
                    onMouseLeave={handleSocialLeave}
                    onFocus={handleSocialEnter(l)}
                    onBlur={handleSocialLeave}
                    onClick={handleSocialClick(l)}
                  >
                    <Icon />
                  </a>
                  {l.note && activeTip === l.label && (
                    <div className="social-tip" role="status">
                      {l.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="footer-meta">
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
      </div>

      <div className="colophon">
        <span>Points in the background are a morphing embedding field, not decoration</span>
        <span>© {new Date().getFullYear()} {identity.name}</span>
      </div>
    </section>
  );
}