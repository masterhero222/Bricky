import { Link } from "react-router-dom";
import useDocumentMeta from "../../hooks/useDocumentMeta";
import "./Blog.css";

export default function BlogNotFound() {
  useDocumentMeta({
    title: "Статията не е намерена | Bricky",
    description: "Тази Bricky статия не беше намерена.",
    canonicalPath: "/blog",
  });

  return (
    <div className="blog-root">
      <div className="blog-container">
        <section className="blog-not-found">
          <p className="blog-eyebrow">Bricky Съвети</p>
          <h1>Тази статия не беше намерена.</h1>
          <p>Върни се към всички Bricky съвети и избери друга тема за ремонт.</p>
          <Link className="blog-primary-link" to="/blog">
            Назад към блога
          </Link>
        </section>
      </div>
    </div>
  );
}
