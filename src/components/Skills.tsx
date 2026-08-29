import { profile } from "../lib/profile";
import { SectionLabel } from "./SectionLabel";
import { useReveal } from "../lib/hooks";

export function Skills() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const total = profile.skills.reduce((n, g) => n + g.items.length, 0);

  return (
    <section id="skills">
      <SectionLabel text="Stack" count={`${total} tools`} />
      <h2>What I reach for</h2>
      <p>
        Grouped by what the job is, not by how impressive it sounds. The first two groups are
        where almost all of my time goes.
      </p>
      <div className="skill-grid reveal" ref={ref} data-shown={shown}>
        {profile.skills.map((group) => (
          <div className="skill-cell" key={group.group}>
            <h4>{group.group}</h4>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
