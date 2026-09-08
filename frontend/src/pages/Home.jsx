import { createElement, useEffect, useRef, useState } from 'react';
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

const clientRoadmap = [
  {
    problem: 'Не знам откъде да започна.',
    solution: 'Разбери ремонта, преди да започнеш.',
    proof: 'Ръководства и информационна база, които обясняват ремонта лесно, стъпка по стъпка.',
    href: '/knowledge',
  },
  {
    problem: 'Не знам колко трябва да струва.',
    solution: 'Виж откъде идва крайната цена.',
    proof: 'Bricky Калкулатор разбива ремонта по етапи, труд и материали.',
    href: '/requests',
  },
  {
    problem: 'Не знам на кого да се доверя.',
    solution: 'Виж кой стои зад профила, преди да го поканиш в дома си.',
    proof: 'Специализация, портфолио, история и правила за работа в Bricky.',
    href: '/workers',
  },
  {
    problem: 'Не знам как да сравня офертите.',
    solution: 'Сравнявай какво получаваш, не само крайната цена.',
    proof: 'Дейности, труд, материали и срок - подредени по един и същ начин.',
  },
  {
    problem: 'Страх ме е ремонтът да не излезе извън контрол.',
    solution: 'Знай какво се случва по време на ремонта.',
    proof: 'Статусите и историята на заявката остават на едно място.',
  },
].map((item, index) => ({ id: index + 1, image: null, ...item }));

export default function Home() {
  const roadmapRef = useRef(null);
  const [roadmapStep, setRoadmapStep] = useState(1);

  useEffect(() => {
    const cards = roadmapRef.current?.querySelectorAll('.client-roadmap-card');
    if (!cards?.length) return undefined;
    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (visible) setRoadmapStep(Number(visible.target.dataset.step));
    }, { rootMargin: '-28% 0px -48% 0px', threshold: [0, 0.2, 0.5, 0.8] });
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, []);

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

      <section className="client-roadmap" aria-labelledby="client-roadmap-title">
        <div className="bricky-container">
          <div className="client-roadmap-header">
            <div>
              <p className="client-roadmap-eyebrow">ТВОЯТ РЕМОНТ, ПОДРЕДЕН</p>
              <h2 id="client-roadmap-title">От първия въпрос до завършения обект</h2>
              <p>Разгледай как Bricky превръща несигурността в ясна следваща стъпка.</p>
            </div>
          </div>
          <div ref={roadmapRef} className="client-roadmap-layout">
            <aside className="client-roadmap-progress" aria-label={`Стъпка ${roadmapStep} от ${clientRoadmap.length}`}>
              <span><strong>{String(roadmapStep).padStart(2, '0')}</strong> / {clientRoadmap.length}</span>
              <div aria-hidden="true"><i style={{ '--roadmap-progress': `${(roadmapStep / clientRoadmap.length) * 100}%` }} /></div>
              <p>{clientRoadmap[roadmapStep - 1].solution}</p>
            </aside>
            <div className="client-roadmap-steps" aria-label="Пътят на клиента през ремонта">
              {clientRoadmap.map(item => (
                <article className="client-roadmap-card" data-step={item.id} key={item.id}>
                  <div className="client-roadmap-copy">
                    <span className="client-roadmap-number">{String(item.id).padStart(2, '0')}</span>
                    <p className="client-roadmap-label">Проблем</p>
                    <h3>„{item.problem}“</h3>
                    <p className="client-roadmap-label">Решението на Bricky</p>
                    <strong>{item.solution}</strong>
                    {item.href ? (
                      <Link className="client-roadmap-proof client-roadmap-link" to={item.href}>
                        <BadgeCheck size={18} /> <span>{item.proof}</span> <ArrowRight size={17} />
                      </Link>
                    ) : (
                      <p className="client-roadmap-proof"><BadgeCheck size={18} /> {item.proof}</p>
                    )}
                  </div>
                  <div className="client-roadmap-media" aria-label={`Илюстрация към стъпка ${item.id}`}>
                    {item.image ? <img src={item.image} alt="" /> : <span aria-hidden="true">{String(item.id).padStart(2, '0')}</span>}
                  </div>
                </article>
              ))}
            </div>
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
