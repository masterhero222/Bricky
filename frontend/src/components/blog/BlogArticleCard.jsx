import { Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { BLOG_FALLBACK_COVER } from "../../data/blogArticles";
import { articlePath, getArticleCover } from "../../utils/blog";

export default function BlogArticleCard({ article }) {
  return (
    <article className="blog-article-card">
      <Link to={articlePath(article)} className="blog-card-link" aria-label={`Прочети статията: ${article.title}`}>
        <span className="blog-card-media">
          <img
            src={getArticleCover(article)}
            alt={article.coverAlt}
            loading="lazy"
            onError={(event) => {
              if (event.currentTarget.src.endsWith(BLOG_FALLBACK_COVER)) return;
              event.currentTarget.src = BLOG_FALLBACK_COVER;
            }}
          />
        </span>
        <span className="blog-card-body">
          <span className="blog-category-chip">{article.categoryLabel}</span>
          <strong>{article.title}</strong>
          <span className="blog-card-excerpt">{article.excerpt}</span>
          <span className="blog-card-meta">
            <Clock aria-hidden="true" /> {article.readingTimeMinutes} мин четене
          </span>
          <span className="blog-card-read">
            Прочети статията <ArrowRight aria-hidden="true" />
          </span>
        </span>
      </Link>
    </article>
  );
}
