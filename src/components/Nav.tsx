import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePulse } from "../lib/hooks";

const LINKS = [
  { id: "work", label: "Work" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Stack" },
  { id: "writing", label: "Writing" },
  { id: "contact", label: "Contact" },
];

// The same technique anthropic.com uses for ANTHROPIC -> AI: keep a
// few letters of the full name fixed in place and collapse everything
// between them to zero width, so the short form reads as the long
// form *resolving* rather than being swapped out. That only works if
// the short form's letters actually appear, in order, inside the full
// name - "NIEL" does: N and I are the first two letters of "Nishil",
// E and L are the last two of "Patel". The array itself stays normal
// mixed case; `.nav-logo` uppercases everything with CSS so it always
// reads as a clean "NISHIL PATEL" -> "NIEL", not a stylized mixed-case
// hidden acronym. The space is a non-breaking space (`\u00A0`) rather
// than a plain " " - a lone regular space as the entire text content
// of a flex/inline-block item isn't reliably rendered by every
// browser and was disappearing, merging the two words together.
const NAME_LETTERS = ["N", "i", "s", "h", "i", "l", "\u00A0", "P", "a", "t", "e", "l"];
const KEPT_INDICES = new Set([0, 1, 10, 11]); // "N" "i" ... "e" "l" -> NIEL

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

  // A quick ping on whichever control opens/closes the assistant - the
  // click itself gets a moment of feedback before the panel does its
  // own, bigger materialize-in, so the whole thing reads as one
  // continuous gesture (tap -> spark -> portal opens) rather than the
  // panel just appearing out of nowhere. Three independent instances
  // since the logo and the two "Ask NIEL" pills (desktop + mobile) are
  // separate elements that can each be the one actually clicked.
  const logoPulse = usePulse();
  const chatPillPulse = usePulse();
  const chatPillMobilePulse = usePulse();

  // Drives the wordmark morph: full "NISHIL PATEL" at the very top of
  // the page, collapsing to "NIEL" the moment the visitor scrolls past
  // the threshold, and expanding back the instant they return to the
  // top - both directions, exactly like Anthropic's header.
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
    chatPillMobilePulse.trigger();
    setMenuOpen(false);
    onChatToggle();
  }

  // Both states now do the same thing: open the assistant. The
  // scrolled/"NIEL" click already did this; this just extends the
  // same behavior to the top-of-page/"NISHIL PATEL" state too, since
  // it's the primary way into NIEL directly from the logo at any
  // scroll position now, not just after scrolling.
  function handleLogoClick() {
    logoPulse.trigger();
    onChatToggle();
  }

  const logoLabel = chatOpen ? "Close assistant" : "Ask NIEL - open assistant";

  const logo = (
    <button
      type="button"
      className="nav-logo"
      data-scrolled={scrolled}
      data-pulse={logoPulse.pulsing}
      onClick={handleLogoClick}
      aria-label={logoLabel}
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
    </button>
  );

  return (
    <>
      <nav className="nav">
        {logo}

        <div className="nav-links">
          {/* Ask NIEL button - appears when showChatBtn is true */}
          <button
            className="nav-chat-link"
            data-visible={showChatBtn}
            data-open={chatOpen}
            data-pulse={chatPillPulse.pulsing}
            onClick={() => {
              chatPillPulse.trigger();
              onChatToggle();
            }}
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
      </nav>

      {/* Mobile slide-down menu - portaled to document.body rather than
         nested inside <nav>. .nav has backdrop-filter, which (like
         transform) creates a containing block for position:fixed
         descendants - so inset:0 here was resolving against .nav's own
         thin bounding box instead of the viewport, squashing this
         menu's actual background down to nav-bar height while its
         content still rendered past that, unclipped and with nothing
         opaque behind it. Portaling to body removes it from that
         subtree entirely and restores normal viewport-relative fixed
         positioning.

         The close button lives inside this same portaled subtree
         (rather than relying on the separate nav-bar burger button
         staying visible above the menu via z-index) so there is no
         cross-subtree stacking dependency at all - wherever this menu
         renders, its own close control renders with it. */}
      {createPortal(
        <div className="nav-mobile-menu" data-open={menuOpen}>
          <button
            className="nav-mobile-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <span />
            <span />
          </button>

          <button
            className="nav-chat-link nav-chat-link--mobile"
            data-visible={showChatBtn}
            data-open={chatOpen}
            data-pulse={chatPillMobilePulse.pulsing}
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
        </div>,
        document.body,
      )}
    </>
  );
}