import BlogArticleCard from "./BlogArticleCard";

export default function BlogRelatedArticles({ articles }) {
  if (!articles?.length) return null;

  return (
    <section className="blog-related">
      <div className="blog-section-heading">
        <p>Още Bricky съвети</p>
        <h2>Свързани теми</h2>
      </div>
      <div className="blog-card-grid blog-card-grid-related">
        {articles.map((article) => (
          <BlogArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
