import { useEffect, useRef, useState } from "react";
import { profile } from "../lib/profile";
import { SectionLabel } from "./SectionLabel";

export function Work() {
  const [active, setActive] = useState(profile.work[0].id);
  const refs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (top?.target.id) setActive(top.target.id.replace("work-", ""));
      },
      { rootMargin: "-25% 0px -40% 0px", threshold: [0.15, 0.6] },
    );
    for (const el of Object.values(refs.current)) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="work">
      <SectionLabel text="Work" count={`${profile.work.length} systems`} />
      <h2>Things I've shipped</h2>
      <p>
        Most of this is commercial work, so there are no repository links here — a closed padlock
        is more honest than a dead button. The last one is open, and it's answering questions in
        the corner of this page right now.
      </p>

      <div className="work-layout">
        <aside className="work-index">
          {profile.work.map((item) => (
            <button
              key={item.id}
              data-active={active === item.id}
              onClick={() =>
                refs.current[item.id]?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
            >
              {item.name}
            </button>
          ))}
        </aside>

        <div className="work-list">
          {profile.work.map((item) => (
            <article
              className="work-card"
              key={item.id}
              id={`work-${item.id}`}
              data-active={active === item.id}
              ref={(el) => {
                refs.current[item.id] = el;
              }}
            >
              <div className="work-head">
                <h3>{item.name}</h3>
                <span className="work-context">{item.context}</span>
              </div>
              <div className="work-sub">{item.subtitle}</div>

              <p>{item.blurb}</p>

              <ul>
                {item.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>

              <div className="chips">
                {item.stack.map((tech) => (
                  <span className="chip" key={tech}>
                    {tech}
                  </span>
                ))}
              </div>

              {item.proprietary && <div className="closed-note">{item.note}</div>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
