import { BLOG_CATEGORIES } from "../../data/blogArticles";

export default function BlogCategoryFilter({ selectedCategory, onChange }) {
  return (
    <div className="blog-filter" aria-label="Филтър по категория">
      {BLOG_CATEGORIES.map((category) => (
        <button
          key={category.key}
          type="button"
          className={selectedCategory === category.key ? "is-active" : ""}
          aria-pressed={selectedCategory === category.key}
          onClick={() => onChange(category.key)}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}
