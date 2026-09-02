import { useEffect, useState } from "react";

const LINKS = [
  { id: "work", label: "Work" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Stack" },
  { id: "writing", label: "Writing" },
  { id: "contact", label: "Contact" },
];

// The wordmark morph keeps these two letters visible at all times and
// collapses everything between them - mirroring how Anthropic's
// ANTHROPIC -> AI works (first letter, then the letters that spell the
// short form, everything else shrinks to nothing). NISHIL -> N + L
// reads as "NL", the initials, once scrolled.
const NAME_LETTERS = ["N", "I", "S", "H", "I", "L"];
const KEPT_INDICES = new Set([0, 5]); // "N" ... "L"

// How far down the page before the mark is considered "scrolled" -
// small enough that it reacts almost immediately, matching the snappy
// feel of Anthropic's own header on scroll.
const SCROLL_THRESHOLD = 24;

interface NavProps {
  active: string;
  chatOpen: boolean;
  showChatBtn: boolean;
  onChatToggle: () => void;
}

export function Nav({ active, chatOpen, showChatBtn, onChatToggle }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Drives the wordmark morph: full "NISHIL" at the very top of the
  // page, collapsing to "NL" the moment the visitor scrolls past the
  // threshold, and expanding back the instant they return to the top -
  // both directions, exactly like Anthropic's header.
  useEffect(() => {
    const evaluate = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    evaluate();
    window.addEventListener("scroll", evaluate, { passive: true });
    return () => window.removeEventListener("scroll", evaluate);
  }, []);

  // Close the mobile menu on any route/section change (link tap) and
  // whenever the viewport grows back past the mobile breakpoint, so it
  // never gets stuck open behind a resize (e.g. phone -> tablet rotate).
  useEffect(() => {
    if (!menuOpen) return;
    const mq = window.matchMedia("(min-width: 821px)");
    const onChange = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [menuOpen]);

  // Lock background scroll while the mobile menu overlay is open.
  useEffect(() => {
    if (menuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [menuOpen]);

  function handleLinkClick() {
    setMenuOpen(false);
  }

  function handleMobileChatToggle() {
    setMenuOpen(false);
    onChatToggle();
  }

  const logo = (
    <a
      href="#top"
      className="nav-logo"
      data-scrolled={scrolled}
      aria-label="Nishil Patel - back to top"
    >
      {NAME_LETTERS.map((letter, i) => (
        <span
          key={i}
          className={`nav-logo-letter${KEPT_INDICES.has(i) ? "" : " nav-logo-letter--collapsible"}`}
          aria-hidden={scrolled && !KEPT_INDICES.has(i) ? true : undefined}
        >
          {letter}
        </span>
      ))}
    </a>
  );

  return (
    <nav className="nav">
      {logo}

      <div className="nav-links">
        {/* Ask NIEL button - appears when showChatBtn is true */}
        <button
          className="nav-chat-link"
          data-visible={showChatBtn}
          data-open={chatOpen}
          onClick={onChatToggle}
          aria-label={chatOpen ? "Close assistant" : "Ask NIEL"}
        >
          <span className="nav-chat-dot" />
          {chatOpen ? "Close" : "Ask NIEL"}
        </button>

        {LINKS.map((l) => (
          <a key={l.id} href={`#${l.id}`} data-active={active === l.id}>
            {l.label}
          </a>
        ))}
      </div>

      {/* Mobile hamburger toggle - only visible under the nav-links
         breakpoint via CSS. */}
      <button
        className="nav-burger"
        data-open={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
      >
        <span />
        <span />
        <span />
      </button>

      {/* Mobile slide-down menu - mirrors nav-links content, including
         Ask NIEL, so nothing is unreachable once the button hides in
         the collapsed bar on small screens. */}
      <div className="nav-mobile-menu" data-open={menuOpen}>
        <button
          className="nav-chat-link nav-chat-link--mobile"
          data-visible={showChatBtn}
          data-open={chatOpen}
          onClick={handleMobileChatToggle}
          aria-label={chatOpen ? "Close assistant" : "Ask NIEL"}
        >
          <span className="nav-chat-dot" />
          {chatOpen ? "Close" : "Ask NIEL"}
        </button>

        {LINKS.map((l) => (
          <a
            key={l.id}
            href={`#${l.id}`}
            data-active={active === l.id}
            onClick={handleLinkClick}
          >
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}