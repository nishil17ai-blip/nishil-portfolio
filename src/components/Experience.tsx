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

  return (
    <section id="experience">
      <SectionLabel text="Experience" count="Since Jan 2025" />
      <h2>Where I've done it</h2>

      <div className="timeline reveal" ref={ref} data-shown={shown}>
        {profile.experience.map((job) => (
          <div className="role" key={job.company} data-current={job.end === null}>
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
    </section>
  );
}