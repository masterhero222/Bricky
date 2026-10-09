import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { BLOG_FALLBACK_COVER } from "../../data/blogArticles";
import { articlePath, getArticleCover } from "../../utils/blog";

export default function BlogFeaturedCard({ article }) {
  if (!article) return null;

  return (
    <article className="blog-featured-card">
      <Link to={articlePath(article)} className="blog-featured-media" aria-label={`Прочети препоръчаната тема: ${article.title}`}>
        <img
          src={getArticleCover(article)}
          alt={article.coverAlt}
          loading="eager"
          onError={(event) => {
            if (event.currentTarget.src.endsWith(BLOG_FALLBACK_COVER)) return;
            event.currentTarget.src = BLOG_FALLBACK_COVER;
          }}
        />
      </Link>
      <div className="blog-featured-copy">
        <span className="blog-featured-badge">
          <Sparkles aria-hidden="true" /> Препоръчана тема
        </span>
        <span className="blog-category-chip">{article.categoryLabel}</span>
        <h2>{article.title}</h2>
        <p>{article.excerpt}</p>
        <span className="blog-card-meta">
          <Clock aria-hidden="true" /> {article.readingTimeMinutes} мин четене
        </span>
        <Link className="blog-text-link" to={articlePath(article)}>
          Прочети статията <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
