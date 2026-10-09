import { ArrowDown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function BlogHero() {
  return (
    <section className="blog-hero">
      <img
        className="blog-hero-art"
        src="/assets/worker-banners/v1/blueprint-full-renovation.webp"
        alt=""
        aria-hidden="true"
      />
      <div className="blog-hero-content">
        <p className="blog-eyebrow">Bricky Съвети</p>
        <h1>Практични съвети за по-спокоен ремонт</h1>
        <p>
          Разгледайте идеи, основни стъпки и полезни ориентири, преди да започнете следващия ремонт.
        </p>
        <div className="blog-hero-actions">
          <Link className="blog-primary-link" to="/requests">
            Изчисли ориентировъчна цена <ArrowRight aria-hidden="true" />
          </Link>
          <a className="blog-secondary-link" href="#blog-topics">
            Разгледай темите <ArrowDown aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
