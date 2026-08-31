import { useEffect, useState, useCallback } from "react";
import { profile, isPlaceholder } from "../lib/profile";
import { useScramble, useDecodeTrigger } from "../lib/hooks";

const INTRO = "Hello, I'm Nishil Patel — AI Engineer.";
const INTRO_DECODE_MS = 6000;
const INTRO_START_MS = 400;

const NIEL_GREETING = "Hi, I am NI-EL, NIshil patEL's AI Assistant";

/* five scattered fragments, staggered top-to-bottom on alternating
   sides, clear of the centered column and the top-right badge */
const FRAGMENTS: { id: string; text: string; style: React.CSSProperties; side: "left" | "right" }[] = [
  { id: "retrieval", text: "Retrieval that actually retrieves", style: { top: "9%", left: "6%" }, side: "left" },
  { id: "backend", text: "Backends I design and own myself", style: { top: "32%", right: "6%" }, side: "right" },
  { id: "orchestration", text: "Orchestration that fails over, not just fails", style: { top: "54%", left: "4%" }, side: "left" },
  { id: "context", text: "Deciding exactly what the model sees", style: { top: "72%", right: "8%" }, side: "right" },
  { id: "reliability", text: "Systems that recover before anyone notices", style: { top: "88%", left: "10%" }, side: "left" },
];

const FRAGMENT_DECODE_MS = 1300;
const BETWEEN_FRAGMENTS_MS = 400;

const FIRST_TOAST = {
  text: "This is how retrieval is done — a query resolving against noise.",
  holdMs: 3800,
};

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
  const { active: hoverActive, trigger } = useDecodeTrigger();
  const active = forceActive || hoverActive;
  const display = useScramble(text, active, FRAGMENT_DECODE_MS);

  return (
    <button
      className={`fragment fragment--${side} ${active ? "fragment--active" : ""}`}
      style={style}
      onPointerEnter={trigger}
      onFocus={trigger}
      onClick={trigger}
    >
      <span className="fragment-dot" />
      <span>{display}</span>
    </button>
  );
}

export function Hero({
  onAskAssistant,
}: {
  onAskAssistant: (opts?: { greeting?: string }) => void;
}) {
  const { identity } = profile;
  const resumeReady = !isPlaceholder(identity.links.resume);
  const [introActive, setIntroActive] = useState(false);
  const [toast, setToast] = useState<"shown" | "gone" | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [sequenceRunning, setSequenceRunning] = useState(false);
  const [embeddingsOpen, setEmbeddingsOpen] = useState(false);
  const introText = useScramble(INTRO, introActive, INTRO_DECODE_MS);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setIntroActive(true), INTRO_START_MS));

    const introDoneAt = INTRO_START_MS + INTRO_DECODE_MS;
    const showAt = introDoneAt + AFTER_INTRO_GAP_MS;
    const hideAt = showAt + FIRST_TOAST.holdMs;
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
        <h1 className="hero-intro">{introText}</h1>

        <div className="hero-cta">
          <button
            className="btn btn-solid"
            onClick={() => onAskAssistant({ greeting: NIEL_GREETING })}
          >
            Ask NI-EL about me.
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
              {sequenceRunning ? "Opening embeddings…" : "Click here to open embeddings"}
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
          {FIRST_TOAST.text}
        </div>
      )}
    </section>
  );
}