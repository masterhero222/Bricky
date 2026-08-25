import { Link } from 'react-router-dom';

const links = [
  ['/terms', 'Условия'],
  ['/privacy', 'Поверителност'],
  ['/moderation-rules', 'Правила'],
  ['/support', 'Поддръжка'],
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-400/15 bg-[#060e19] text-slate-300">
      <div className="bricky-container flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-extrabold text-white">Bricky</p>
          <p className="mt-1 text-sm text-slate-400">
            Ремонти с ясни правила и проверени профили.
          </p>
        </div>
        <nav
          className="flex flex-wrap gap-x-5 gap-y-3 text-sm"
          aria-label="Правна информация"
        >
          {links.map(([to, label]) => (
            <Link key={to} to={to} className="hover:text-emerald-300">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
