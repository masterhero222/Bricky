import { createElement } from 'react';
import { BadgeCheck, Eye, ShieldCheck, Workflow } from 'lucide-react';
import useDocumentMeta from '../hooks/useDocumentMeta';

const principles = [
  [
    'Проверими профили',
    'Публичната информация и снимките минават през административна модерация.',
    BadgeCheck,
  ],
  [
    'Контрол върху контактите',
    'Телефонът и точният адрес се отключват само за потвърдения по заявката майстор.',
    ShieldCheck,
  ],
  [
    'Ясен lifecycle',
    'Клиентът и майсторът виждат следващото позволено действие във всеки етап.',
    Workflow,
  ],
  [
    'История и обратна връзка',
    'Завършените обекти, събитията и реалните отзиви оставят проследима история.',
    Eye,
  ],
];

export default function AboutUs() {
  useDocumentMeta({
    title: 'За Bricky | Ремонти с ясен процес',
    description:
      'Научете как Bricky свързва клиенти и майстори чрез проверени профили, модерирани заявки и проследим процес.',
    canonicalPath: '/about',
  });

  return (
    <div className="min-h-[calc(100vh-78px)] bg-[#07111f] px-5 py-14 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <p className="font-bold text-emerald-300">За Bricky</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">
            По-малко догадки. Повече яснота при ремонта.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Bricky подрежда комуникацията между клиент и майстор в един процес:
            заявка, модерация, кандидатури, избор, изпълнение и реален отзив.
          </p>
        </header>

        <section
          className="mt-12 grid gap-5 sm:grid-cols-2"
          aria-label="Принципи на Bricky"
        >
          {principles.map(([title, text, icon]) => (
            <article key={title} className="bricky-card rounded-lg p-6">
              {createElement(icon, { className: 'text-cyan-300', size: 28 })}
              <h2 className="mt-5 text-xl font-extrabold">{title}</h2>
              <p className="mt-3 leading-7 text-slate-400">{text}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 border-y border-slate-700/70 py-8">
          <h2 className="text-2xl font-extrabold">Публичен старт</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-300">
            Основните функции са безплатни за първите 30 дни от публичното
            пускане. Не изискваме платежна карта и няма автоматично таксуване.
            Платежните функции ще бъдат отделен, предварително обявен етап.
          </p>
        </section>
      </div>
    </div>
  );
}
