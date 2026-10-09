import { ArrowLeft, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <section className="flex min-h-[calc(100vh-78px)] items-center justify-center bg-[#07111f] px-6 py-16 text-white">
      <div className="w-full max-w-xl border border-slate-700 bg-[#0b1b2b] p-8 text-center shadow-2xl sm:p-12">
        <p className="text-sm font-bold uppercase text-emerald-400">
          Грешка 404
        </p>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">
          Тази страница не съществува
        </h1>
        <p className="mt-4 text-slate-300">
          Адресът може да е променен или страницата вече да не е достъпна.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 border border-slate-500 px-5 py-3 font-bold text-white hover:bg-slate-800"
          >
            <ArrowLeft size={18} /> Назад
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-emerald-500 px-5 py-3 font-bold text-[#03140e] hover:bg-emerald-400"
          >
            <Home size={18} /> Към началото
          </Link>
        </div>
      </div>
    </section>
  );
}
