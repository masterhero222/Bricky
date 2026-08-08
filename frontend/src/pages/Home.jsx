import { createElement } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import useDocumentMeta from '../hooks/useDocumentMeta';

const steps = [
  {
    icon: ClipboardList,
    title: 'Опишете ремонта',
    text: 'Добавете ясна заявка и снимки. Данните минават през проверка преди публикуване.',
  },
  {
    icon: UserCheck,
    title: 'Сравнете кандидатите',
    text: 'Вие избирате майстор по профил, реални обекти, рейтинг и кандидатура.',
  },
  {
    icon: Wrench,
    title: 'Проследете работата',
    text: 'Заявката има ясни етапи от потвърждението до завършването и ревюто.',
  },
];

export default function Home() {
  useDocumentMeta({
    title: 'Bricky | Майстори и ремонтни заявки на едно място',
    description:
      'Създайте ремонтна заявка, сравнете проверени профили и проследете работата до нейното завършване.',
    canonicalPath: '/',
    image: '/media_files/deal_client.png',
  });

  return (
    <div className="bg-[#07111f] text-white">
      <section className="relative flex min-h-[calc(100vh-118px)] items-center overflow-hidden border-b border-slate-400/15">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/assets/worker-banners/v1/blueprint-general.webp"
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        >
          <source src="/media_files/loop.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[#030912]/80" />

        <div className="bricky-container relative z-10 py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 border-l-2 border-emerald-400 bg-black/35 px-4 py-2 text-sm font-bold text-emerald-200">
              <BadgeCheck size={18} /> 30 дни безплатен достъп при публичния
              старт
            </div>
            <h1 className="mt-7 text-5xl font-extrabold leading-tight sm:text-6xl lg:text-7xl">
              Bricky
            </h1>
            <p className="mt-5 max-w-2xl text-xl leading-8 text-slate-200 sm:text-2xl">
              Ремонтни заявки, проверени профили и ясен процес от първата снимка
              до завършения обект.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/auth/register?role=client"
                className="bricky-button-primary"
              >
                Създай заявка <ArrowRight size={19} />
              </Link>
              <Link to="/workers" className="bricky-button-secondary">
                Разгледай майстори
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-400">
              Без платежна карта и без автоматично таксуване през стартовия
              период.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="how-it-works-title">
        <div className="bricky-container">
          <div className="max-w-2xl">
            <p className="font-bold text-emerald-300">Как работи</p>
            <h2
              id="how-it-works-title"
              className="mt-2 text-3xl font-extrabold sm:text-4xl"
            >
              Вие избирате. Bricky пази процеса подреден.
            </h2>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {steps.map(({ icon, title, text }, index) => (
              <article key={title} className="bricky-card rounded-lg p-6">
                <div className="flex items-center justify-between">
                  {createElement(icon, {
                    className: 'text-cyan-300',
                    size: 27,
                  })}
                  <span className="text-sm font-extrabold text-slate-500">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-7 text-xl font-extrabold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
