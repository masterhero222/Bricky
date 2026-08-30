import { BLOG_CATEGORIES } from "../../data/blogArticles";
import { Link } from 'react-router-dom';
import { blogRubricPath } from '../../data/blogRubrics';

export default function BlogCategoryFilter({ selectedCategory, counts }) {
  return (
    <nav className="blog-filter" aria-label="Рубрики в блога">
      {BLOG_CATEGORIES.map((category) => (
        <Link
          key={category.key}
          to={blogRubricPath(category.key)}
          className={selectedCategory === category.key ? "is-active" : ""}
          aria-current={selectedCategory === category.key ? 'page' : undefined}
        >
          {category.label} <span className="blog-rubric-count">{counts[category.key] || 0}</span>
        </Link>
      ))}
    </nav>
  );
}
