import { ArrowRight, Calculator } from "lucide-react";
import { Link } from "react-router-dom";
import { requestCalculatorPath } from "../../utils/blog";

export default function BlogCalculatorCta({ categoryKey, variant = "inline" }) {
  return (
    <aside className={`blog-calculator-cta blog-calculator-cta-${variant}`}>
      <div className="blog-calculator-cta-icon" aria-hidden="true">
        <Calculator />
      </div>
      <div>
        <h2>Искаш ориентир за своя ремонт?</h2>
        <p>Използвай калкулатора на Bricky и опиши какво планираш, без да гадаеш от случайни цени.</p>
      </div>
      <Link className="blog-primary-link" to={requestCalculatorPath(categoryKey)}>
        Изчисли ориентировъчна цена <ArrowRight aria-hidden="true" />
      </Link>
    </aside>
  );
}
