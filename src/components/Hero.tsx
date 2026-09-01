import { useEffect, useMemo, useState, useCallback } from "react";
import { profile, isPlaceholder } from "../lib/profile";
import { useScramble } from "../lib/hooks";

/** Time-of-day greeting.
 *  new Date().getHours() reads the visitor's *local* time from their
 *  browser, so this works correctly whether they're in Asia, Europe,
 *  North America, or anywhere else - no timezone library or geo lookup
 *  needed, the browser has already done that work.
 *
 *  Buckets:
 *   00:00 – 04:59  →  late-night / small hours
 *   05:00 – 11:59  →  morning
 *   12:00 – 16:59  →  afternoon
 *   17:00 – 22:59  →  evening
 *   23:00 – 23:59  →  late-night / small hours
 */
type TimeBucket = "morning" | "afternoon" | "evening" | "night";

function getTimeBucket(): TimeBucket {
  const h = new Date().getHours();
  if (h >= 23 || h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const GREETINGS: Record<TimeBucket, { line1: string; line2: string; toast: string }> = {
  morning: {
    line1: "Morning - Hi, Nishil here,",
    line2: "Dawn whispers code.",
    toast: "Thanks for stopping by - take a look around.",
  },
  afternoon: {
    line1: "Afternoon - Hi, Nishil here,",
    line2: "Sun sculpts minds.",
    toast: "Welcome - hope the day's treating you well.",
  },
  evening: {
    line1: "Evening - Hi, Nishil here,",
    line2: "Dusk weaves nets.",
    toast: "Glad you swung by - make yourself at home.",
  },
  night: {
    line1: "Hey, Night Owl? Hi, Nishil here,",
    line2: "Stars train softly.",
    toast: "Great you're visiting at this hour - I respect the late shift.",
  },
};

const INTRO_DECODE_MS = 2500;
const INTRO_START_MS = 400;

const NIEL_GREETING = "Hi, I am NIEL, NIshil patEL's AI Assistant";

const FRAGMENTS_KICKER = "What I actually do is scattered around this page. Click below.";

/* five scattered fragments, staggered top-to-bottom on alternating
   sides, clear of the centered column and the top-right badge */
// Option 1: Direct & Impactful (Tailored directly to your enterprise GenAI & FastAPI experience)
const FRAGMENTS: { id: string; text: string; style: React.CSSProperties; side: "left" | "right" }[] = [
  { id: "retrieval", text: "Retrieval engineered to extract exact chunks, not top-k noise.", style: { top: "9%", left: "6%" }, side: "left" },
  { id: "backend", text: "Backends built to stay reliable under enterprise usage.", style: { top: "32%", right: "6%" }, side: "right" },
  { id: "orchestration", text: "Multi-model orchestration bridging Claude, ChatGPT and Airflow.", style: { top: "54%", left: "4%" }, side: "left" },
  { id: "context", text: "Context engineering optimized for token efficiency and low latency.", style: { top: "72%", right: "8%" }, side: "right" },
  { id: "reliability", text: "Automated real-time QC frameworks that guarantee grounded outputs.", style: { top: "88%", left: "10%" }, side: "left" },
];

const FRAGMENT_DECODE_MS = 1300;
const BETWEEN_FRAGMENTS_MS = 400;

const FIRST_TOAST_HOLD_MS = 3800;

const FADE_MS = 450;
const AFTER_INTRO_GAP_MS = 500;

function Fragment({
  text,
  style,
  side,
  forceActive,
}: {
  text: string;
  style: React.CSSProperties;
  side: "left" | "right";
  forceActive: boolean;
}) {
  // Decoding is driven entirely by forceActive now - set only by the
  // "Click here to checkout" sequence in the parent. Hovering
  // or focusing an individual fragment used to reveal it early; that's
  // deliberately removed so the scrambled text only resolves when the
  // visitor actually clicks the button, not by accident while scrolling
  // past with a cursor.
  const display = useScramble(text, forceActive, FRAGMENT_DECODE_MS);

  return (
    <div className={`fragment fragment--${side} ${forceActive ? "fragment--active" : ""}`} style={style}>
      <span className="fragment-dot" />
      <span>{display}</span>
    </div>
  );
}

export function Hero({
  onAskAssistant,
}: {
  onAskAssistant: (opts?: { greeting?: string }) => void;
}) {
  const { identity } = profile;
  const resumeReady = !isPlaceholder(identity.links.resume);
  const greeting = useMemo(() => GREETINGS[getTimeBucket()], []);
  const [introActive, setIntroActive] = useState(false);
  const [toast, setToast] = useState<"shown" | "gone" | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [sequenceRunning, setSequenceRunning] = useState(false);
  const [embeddingsOpen, setEmbeddingsOpen] = useState(false);
  const introLine1 = useScramble(greeting.line1, introActive, INTRO_DECODE_MS);
  const introLine2 = useScramble(greeting.line2, introActive, INTRO_DECODE_MS);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setIntroActive(true), INTRO_START_MS));

    const introDoneAt = INTRO_START_MS + INTRO_DECODE_MS;
    const showAt = introDoneAt + AFTER_INTRO_GAP_MS;
    const hideAt = showAt + FIRST_TOAST_HOLD_MS;
    const clearAt = hideAt + FADE_MS;

    timers.push(setTimeout(() => setToast("shown"), showAt));
    timers.push(setTimeout(() => setToast("gone"), hideAt));
    timers.push(setTimeout(() => setToast(null), clearAt));

    return () => timers.forEach(clearTimeout);
  }, []);

  const openEmbeddings = useCallback(() => {
    if (sequenceRunning || embeddingsOpen) return;
    setSequenceRunning(true);

    FRAGMENTS.forEach((f, i) => {
      const at = i * (FRAGMENT_DECODE_MS + BETWEEN_FRAGMENTS_MS);
      setTimeout(() => {
        setRevealed((prev) => new Set(prev).add(f.id));
        if (i === FRAGMENTS.length - 1) {
          setTimeout(() => {
            setSequenceRunning(false);
            setEmbeddingsOpen(true);
          }, FRAGMENT_DECODE_MS);
        }
      }, at);
    });
  }, [sequenceRunning, embeddingsOpen]);

  return (
    <section className="hero" id="top">
      <div className="hero-field">
        {FRAGMENTS.map((f) => (
          <Fragment
            key={f.id}
            text={f.text}
            style={f.style}
            side={f.side}
            forceActive={revealed.has(f.id)}
          />
        ))}
      </div>

      <div className="hero-inner">
        <h1 className="hero-intro">
          <span className="hero-intro-line">{introLine1}</span>
          <br />
          <span className="hero-intro-line">{introLine2}</span>
        </h1>
        <div className="hero-kicker">{FRAGMENTS_KICKER}</div>

        <div className="hero-cta">
          <button
            className="btn btn-solid"
            onClick={() => onAskAssistant({ greeting: NIEL_GREETING })}
          >
            Ask NIEL about me.
          </button>

          {embeddingsOpen ? (
            <a className="btn" href={`mailto:${identity.email}`}>
              {identity.email}
            </a>
          ) : (
            <button
              className={`btn btn-embeddings ${sequenceRunning ? "btn-embeddings--opening" : ""}`}
              onClick={openEmbeddings}
              disabled={sequenceRunning}
              aria-busy={sequenceRunning}
            >
              {sequenceRunning ? "Opening embeddings…" : "Click here to checkout"}
            </button>
          )}

          {resumeReady && (
            <a className="btn" href={identity.links.resume} target="_blank" rel="noreferrer">
              Resume ↗
            </a>
          )}
        </div>
      </div>

      {toast && (
        <div
          className={`hero-toast hero-toast--bottom ${
            toast === "gone" ? "hero-toast--out" : ""
          }`}
        >
          {greeting.toast}
        </div>
      )}
    </section>
  );
}