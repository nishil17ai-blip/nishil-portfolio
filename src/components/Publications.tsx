import { profile, isPlaceholder } from "../lib/profile";
import { SectionLabel } from "./SectionLabel";

export function Publications() {
  return (
    <section id="writing">
      <SectionLabel text="Writing" count={`${profile.publications.length} pieces`} />
      <h2>Published work</h2>
      <p>
        Two peer-reviewed papers and one long-form tutorial, from before I moved into AI
        engineering full time.
      </p>

      <div>
        {profile.publications.map((pub) => {
          const live = !isPlaceholder(pub.url);
          const row = (
            <>
              <span className="pub-title">{pub.title}</span>
              <span>
                <span className="pub-venue">{pub.venue}</span>
                <span className="pub-kind">{pub.kind}</span>
              </span>
            </>
          );

          return live ? (
            <a className="pub" key={pub.title} href={pub.url} target="_blank" rel="noreferrer">
              {row}
            </a>
          ) : (
            <div className="pub" key={pub.title}>
              {row}
            </div>
          );
        })}
      </div>
    </section>
  );
}
