import { createElement, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
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
  ['Не знам откъде да започна.', 'Виж ремонта стъпка по стъпка.', 'Ясни ръководства и правилен ред на етапите.'],
  ['Не знам какво трябва да се направи.', 'Разбери дейностите зад конкретния проблем.', 'Проблем, нужни стъпки и целта на всяка от тях.'],
  ['Не знам кое е правилно.', 'Ползвай надеждна база за решенията си.', 'Проверена информация без майсторски митове.'],
  ['Не знам колко трябва да струва.', 'Изчисли ориентировъчен бюджет.', 'Разбивка по труд, материали, количества и сценарии.'],
  ['Не разбирам защо офертата е скъпа.', 'Виж какво реално влиза в цената.', 'Всеки етап и разход са показани отделно.'],
  ['Не знам откъде да намеря изпълнител.', 'Открий майстори за конкретната работа.', 'Специализация, район, профил и реални обекти.'],
  ['Не знам на кого да се доверя.', 'Работи с майстори по общи правила.', 'Проверки, сигнали и последователни мерки при нарушения.'],
  ['Не знам как да сравня офертите.', 'Сравни съдържанието, не само сумата.', 'Дейности, материали, срок и ясни изключения.'],
  ['Не знам какво да попитам.', 'Подготви се преди разговора.', 'Checklist с важните въпроси за конкретния ремонт.'],
  ['Не мога да си представя резултата.', 'Виж концептуална AI визуализация.', 'Реалистична посока, ясно означена като концепция.'],
  ['Страх ме е работата да бъде направена зле.', 'Следи как напредва изпълнението.', 'Снимки по етапи, статус, история, оценки и сигнали.'],
  ['Страх ме е бюджетът да излезе извън контрол.', 'Следи началната оферта и промените.', 'Функция в развитие за ясно проследяване на бюджета.'],
  ['Губя важните уговорки в разговори.', 'Дръж процеса на едно място.', 'Подредена комуникация и история на действията.'],
  ['Не знам какво следва.', 'Виж следващата ясна стъпка.', 'Статуси от заявката до завършването и отзива.'],
  ['Не искам да измислям всичко от нулата.', 'Използвай готова структура за ремонта.', 'По-малко догадки и повече информирани решения.'],
].map(([problem, solution, proof], index) => ({ id: index + 1, problem, solution, proof }));

export default function Home() {
  const roadmapRef = useRef(null);
  const [roadmapStep, setRoadmapStep] = useState(1);

  function moveRoadmap(direction) {
    const track = roadmapRef.current;
    if (!track) return;
    const card = track.querySelector('.client-roadmap-card');
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
    track.scrollBy({ left: direction * ((card?.offsetWidth || 360) + gap), behavior: 'smooth' });
  }

  function updateRoadmapStep() {
    const track = roadmapRef.current;
    const card = track?.querySelector('.client-roadmap-card');
    if (!track || !card) return;
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
    const atEnd = track.scrollWidth - track.clientWidth - track.scrollLeft < 2;
    setRoadmapStep(atEnd ? clientRoadmap.length : Math.min(clientRoadmap.length, Math.max(1, Math.round(track.scrollLeft / (card.offsetWidth + gap)) + 1)));
  }

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
            <div className="client-roadmap-controls" aria-label="Управление на roadmap">
              <span><strong>{String(roadmapStep).padStart(2, '0')}</strong> / {clientRoadmap.length}</span>
              <button type="button" onClick={() => moveRoadmap(-1)} aria-label="Предишна стъпка" title="Предишна стъпка"><ChevronLeft size={21} /></button>
              <button type="button" onClick={() => moveRoadmap(1)} aria-label="Следваща стъпка" title="Следваща стъпка"><ChevronRight size={21} /></button>
            </div>
          </div>
          <div className="client-roadmap-line" aria-hidden="true" />
          <div ref={roadmapRef} onScroll={updateRoadmapStep} className="client-roadmap-track" tabIndex="0" aria-label="Пътят на клиента през ремонта">
            {clientRoadmap.map(item => (
              <article className="client-roadmap-card" key={item.id}>
                <span className="client-roadmap-number">{String(item.id).padStart(2, '0')}</span>
                <div className="client-roadmap-copy">
                  <p className="client-roadmap-label">Проблем</p>
                  <h3>„{item.problem}“</h3>
                  <p className="client-roadmap-label">Решението на Bricky</p>
                  <strong>{item.solution}</strong>
                  <p className="client-roadmap-proof"><BadgeCheck size={18} /> {item.proof}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="client-roadmap-hint">Плъзни, за да продължиш</p>
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
