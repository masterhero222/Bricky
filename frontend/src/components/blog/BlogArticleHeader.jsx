import { CalendarDays, Clock, UserRound } from "lucide-react";
import { Link } from 'react-router-dom';
import { blogRubricPath } from '../../data/blogRubrics';

export default function BlogArticleHeader({ article }) {
  return (
    <header className="blog-article-header">
      <nav className="blog-breadcrumb" aria-label="Път до статията">
        <Link to="/blog">Блог</Link><span aria-hidden="true"> / </span>
        <Link to={blogRubricPath(article.categoryKey)}>{article.categoryLabel}</Link>
      </nav>
      <h1>{article.title}</h1>
      <p>{article.excerpt}</p>
      <div className="blog-article-meta">
        <span>
          <Clock aria-hidden="true" /> {article.readingTimeMinutes} мин четене
        </span>
        <span>
          <UserRound aria-hidden="true" /> {article.authorName || "Екипът на Bricky"}
        </span>
        {article.updatedAt && <span>
          <CalendarDays aria-hidden="true" /> Актуализирано:
          <time dateTime={article.updatedAt}>{new Intl.DateTimeFormat('bg-BG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${article.updatedAt}T00:00:00Z`))}</time>
        </span>}
      </div>
    </header>
  );
}
