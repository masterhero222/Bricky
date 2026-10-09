export default function BlogTableOfContents({ sections }) {
  const items = (sections || []).filter((section) => section.id && section.heading);

  if (!items.length) return null;

  return (
    <nav className="blog-toc" aria-label="Съдържание на статията">
      <strong>В статията</strong>
      <div>
        {items.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.heading}
          </a>
        ))}
      </div>
    </nav>
  );
}
