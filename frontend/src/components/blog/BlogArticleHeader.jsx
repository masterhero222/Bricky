import { Clock, UserRound } from "lucide-react";

export default function BlogArticleHeader({ article }) {
  return (
    <header className="blog-article-header">
      <p className="blog-breadcrumb">Bricky Съвети / {article.categoryLabel}</p>
      <span className="blog-category-chip">{article.categoryLabel}</span>
      <h1>{article.title}</h1>
      <p>{article.excerpt}</p>
      <div className="blog-article-meta">
        <span>
          <Clock aria-hidden="true" /> {article.readingTimeMinutes} мин четене
        </span>
        <span>
          <UserRound aria-hidden="true" /> {article.authorName || "Екипът на Bricky"}
        </span>
      </div>
    </header>
  );
}
