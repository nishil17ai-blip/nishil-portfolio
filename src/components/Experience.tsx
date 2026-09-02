import { useEffect, useRef, useState } from "react";
import { profile } from "../lib/profile";
import { SectionLabel } from "./SectionLabel";
import { useReveal } from "../lib/hooks";

function formatMonth(iso: string): string {
  const [year, month] = iso.split("-");
  const names = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${names[Number(month) - 1]} ${year}`;
}

export function Experience() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [markerTops, setMarkerTops] = useState<number[]>([]);
  const roleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);

  // Measure card positions so markers stay perfectly aligned
  // Measure card positions so markers stay perfectly aligned
  useEffect(() => {
    const measure = () => {
      if (!trackRef.current) return;

      const tops = roleRefs.current.map((el) => {
        if (!el || !trackRef.current) return 0;
        // distance from the top of the track to the vertical center of the card
        return el.offsetTop + el.offsetHeight / 2 - 4.5;
      });

      setMarkerTops(tops);
    };

    measure();
    window.addEventListener("resize", measure);
    // re-measure after layout settles
    const t1 = setTimeout(measure, 50);
    const t2 = setTimeout(measure, 300);

    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Scroll-spy
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    roleRefs.current.forEach((el, index) => {
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(index);
          }
        },
        {
          root: null,
          rootMargin: "-40% 0px -40% 0px",
          threshold: 0,
        }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  return (
    <section id="experience">
      <SectionLabel text="Experience" count="Since Jan 2025" />
      <h2>Where I've done it</h2>

      <div className="timeline reveal" ref={ref} data-shown={shown}>
        {/* sticky track */}
        <div className="timeline-track" ref={trackRef} aria-hidden="true">
          <div className="timeline-line" />
          {profile.experience.map((job, index) => (
            <div
              key={job.company}
              className={`timeline-marker${activeIndex === index ? " timeline-marker--current" : ""}`}
              style={{ top: markerTops[index] ?? 0 }}
            />
          ))}
        </div>

        {/* role cards */}
        <div className="timeline-cards">
          {profile.experience.map((job, index) => (
            <div
              className="role"
              key={job.company}
              data-current={activeIndex === index}
              ref={(el) => {
                roleRefs.current[index] = el;
              }}
            >
              <div className="role-dates">
                {formatMonth(job.start)} - {job.endLabel}
              </div>
              <h3>{job.title}</h3>
              <div className="role-company">
                {job.company} · {job.location}
              </div>
              <div className="role-body">
                {job.paragraphs.map((para) => (
                  <p key={para}>{para}</p>
                ))}
              </div>
              <div className="chips">
                {job.stack.map((tech) => (
                  <span className="chip" key={tech}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}