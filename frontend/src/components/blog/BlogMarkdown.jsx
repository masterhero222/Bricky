import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function BlogMarkdown({ article }) {
  return (
    <div className="blog-content blog-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h2({ node, children }) {
            const section = article.sections.find(item => item.line === node.position?.start.line);
            return <h2 id={section?.id}>{children}</h2>;
          },
          table({ children }) {
            return <div className="blog-table-scroll" role="region" aria-label="Таблица с цени" tabIndex={0}><table>{children}</table></div>;
          },
          a({ href, children }) {
            const external = /^https?:\/\//.test(href || '');
            return <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>{children}</a>;
          },
        }}
      >
        {article.markdown}
      </ReactMarkdown>
    </div>
  );
}
