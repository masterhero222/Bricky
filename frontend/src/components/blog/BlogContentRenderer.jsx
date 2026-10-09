import { Info } from "lucide-react";

export default function BlogContentRenderer({ sections }) {
  return (
    <div className="blog-content">
      {(sections || []).map((section) => (
        <section key={section.id} id={section.id}>
          <h2>{section.heading}</h2>
          {(section.paragraphs || []).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.bullets?.length > 0 && (
            <ul>
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
          {section.callout && (
            <aside className="blog-callout">
              <Info aria-hidden="true" />
              <div>
                <strong>{section.callout.title}</strong>
                <p>{section.callout.text}</p>
              </div>
            </aside>
          )}
        </section>
      ))}
    </div>
  );
}
