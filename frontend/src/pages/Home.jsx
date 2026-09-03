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
import './Home.css';

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
    image: '/assets/home/bricky-home-v2-1536.webp',
  });

  return (
    <div className="bg-[#07111f] text-white">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-art" aria-hidden="true">
          <img src="/assets/home/bricky-home-v2-1536.webp" srcSet="/assets/home/bricky-home-v2-960.webp 960w, /assets/home/bricky-home-v2-1536.webp 1536w" sizes="(max-width: 767px) 440px, (max-width: 1200px) 700px, 1200px" width="1536" height="1024" alt="" fetchPriority="high" decoding="async" />
        </div>

        <div className="bricky-container home-hero-content">
          <div className="home-hero-copy">
            <div className="home-hero-trial">
              <BadgeCheck size={18} /> 30 дни безплатен достъп при публичния
              старт
            </div>
            <h1 id="home-title">
              Bricky
            </h1>
            <p className="home-hero-description">
              Ремонтни заявки, проверени профили и ясен процес от първата снимка
              до завършения обект.
            </p>
            <div className="home-hero-actions">
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
            <p className="home-hero-note">
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
