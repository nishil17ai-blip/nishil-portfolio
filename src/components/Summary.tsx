import { SectionLabel } from "./SectionLabel";

// Deliberately separate from profile.hero.standfirst - that text is a
// factual role/employer summary used to ground the assistant's
// answers, and stays as-is for that purpose. This is the human version:
// who Nishil is, not what his job title says he does.
const ABOUT_TEXT =
  "I'm Nishil Patel, an Artificial Intelligence Engineer - who just don't just call any LLM API and hope to get correct responses, instead engineer the system around it. I enforce grounding through structured output and not wording that happens to sound right. I build the caching, rate-limiting and token budgets that keep a system stable under real load instead of just a demo. That's the job: not knowing what an LLM can do, but engineering the discipline around it so the answer is actually and facutally correct - not just fluent.";

/**
 * A short "about me" card sitting between the hero and the work
 * section, boxed the same way the project cards are - and closing
 * with an actual clickable handoff to NIEL, rather than just telling
 * the visitor the assistant exists.
 */
export function Summary({ onAskAssistant }: { onAskAssistant: () => void }) {
  return (
    <section id="summary" className="summary">
      <SectionLabel text="About" />
      <h2>Know who I'm</h2>
      <div className="summary-card">
        <p className="summary-text">{ABOUT_TEXT}</p>
        <p className="summary-cta">
          Want the fuller picture?{" "}
          <button type="button" className="summary-cta-link" onClick={onAskAssistant}>
            Ask NIEL
          </button>{" "}
          - my AI assistant - anything about my work, stack, or background.
        </p>
      </div>
    </section>
  );
}