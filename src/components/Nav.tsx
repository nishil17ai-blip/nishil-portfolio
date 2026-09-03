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

// Full name at the top of the page, collapsing to the assistant's name
// once scrolled. Clicking the mark opens the assistant at either
// state - "Ask NIEL" while scrolled (mark reads "NEIL"), and now the
// same action from the top of the page too (mark reads "Nishil
// Patel") - rather than the top state being a separate back-to-top
// link like it was before.
const FULL_NAME = "Nishil Patel";
const SHORT_NAME = "NEIL";

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

  // Drives the wordmark swap: full "Nishil Patel" at the very top of
  // the page, crossfading to "NEIL" the moment the visitor scrolls
  // past the threshold, and back the instant they return to the top -
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
    chatPillMobilePulse.trigger();
    setMenuOpen(false);
    onChatToggle();
  }

  // Both states now do the same thing: open the assistant. The
  // scrolled/"NEIL" click already did this; this just extends the
  // same behavior to the top-of-page/"Nishil Patel" state too, since
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
      <span className="nav-logo-full" aria-hidden={scrolled}>
        {FULL_NAME}
      </span>
      <span className="nav-logo-short" aria-hidden={!scrolled}>
        {SHORT_NAME}
      </span>
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