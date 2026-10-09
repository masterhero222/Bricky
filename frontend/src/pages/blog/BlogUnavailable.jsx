import { Link } from 'react-router-dom';
import { BookOpen, Calculator, UsersRound } from 'lucide-react';
import useDocumentMeta from '../../hooks/useDocumentMeta';

export default function BlogUnavailable() {
  useDocumentMeta({
    title: 'Bricky съвети | Подготвяме редакционния раздел',
    description:
      'Редакционният раздел на Bricky се подготвя с проверени практически материали.',
    canonicalPath: '/blog',
    robots: 'noindex,nofollow',
  });

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-4xl items-center px-5 py-16">
      <section className="w-full border-y border-slate-400/15 py-12 text-center">
        <BookOpen className="mx-auto text-cyan-300" size={38} />
        <h1 className="mt-5 text-3xl font-extrabold text-white sm:text-4xl">
          Bricky съвети се подготвя
        </h1>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">
          Подготвяме проверени практически материали за планиране на ремонт,
          избор на майстор и контрол на изпълнението.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/workers" className="bricky-button-primary">
            <UsersRound size={18} /> Разгледай майсторите
          </Link>
          <Link to="/" className="bricky-button-secondary">
            <Calculator size={18} /> Към началната страница
          </Link>
        </div>
      </section>
    </main>
  );
}
