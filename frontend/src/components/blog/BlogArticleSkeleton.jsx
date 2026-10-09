export default function BlogArticleSkeleton() {
  return (
    <div className="blog-skeleton-list" aria-hidden="true">
      {[1, 2, 3].map((item) => (
        <div className="blog-skeleton-card" key={item}>
          <span />
          <strong />
          <p />
        </div>
      ))}
    </div>
  );
}
