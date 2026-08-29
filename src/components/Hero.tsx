import { profile, isPlaceholder } from "../lib/profile";

export function Hero({ onAskAssistant }: { onAskAssistant: () => void }) {
  const { hero, identity } = profile;
  const resumeReady = !isPlaceholder(identity.links.resume);

  return (
    <section className="hero" id="top">
      <div className="hero-status">
        <span className="pulse" />
        {hero.status}
      </div>

      <h1>
        {hero.line1} <span className="warm">{hero.line2}</span>
      </h1>

      <p className="hero-standfirst">{hero.standfirst}</p>

      <div className="hero-cta">
        <button className="btn btn-solid" onClick={onAskAssistant}>
          Ask about my work
        </button>
        <a className="btn" href={`mailto:${identity.email}`}>
          {identity.email}
        </a>
        {resumeReady && (
          <a className="btn" href={identity.links.resume} target="_blank" rel="noreferrer">
            Resume, PDF
          </a>
        )}
      </div>
    </section>
  );
}
