import {
  ArrowLeft,
  Box,
  BriefcaseBusiness,
  Check,
  ClipboardCheck,
  FileImage,
  KeyRound,
  LogIn,
  Search,
  Send,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const VALUE_COPY = {
  gate: {
    title: (
      <>
        Ремонтите започват с <strong>ясен избор</strong>
      </>
    ),
    benefits: [
      [Search, 'Намери подходящ майстор', 'Разгледай профили, реални обекти и оценки от клиенти.'],
      [BriefcaseBusiness, 'Развий своята дейност', 'Получавай подходящи заявки и изгради репутация.'],
      [ShieldCheck, 'Работи с ясен процес', 'Следи всяка поръчка от заявката до финалното ревю.'],
    ],
  },
  login: {
    title: (
      <>
        Продължи оттам, <strong>докъдето стигна</strong>
      </>
    ),
    benefits: [
      [LogIn, 'Един вход за целия профил', 'Bricky разпознава автоматично дали си клиент, майстор или администратор.'],
      [ClipboardCheck, 'Заявките ти са на едно място', 'Продължи работа по активните заявки и историята си.'],
      [KeyRound, 'Защитен достъп', 'Паролата се предава сигурно и не се пази в браузъра.'],
    ],
  },
  worker: {
    title: (
      <>
        Изгради профил, който <strong>работи за теб</strong>
      </>
    ),
    benefits: [
      [FileImage, 'Покажи реалните си обекти', 'Добави примери от работата си и спечели доверие.'],
      [Send, 'Кандидатствай по подходящи заявки', 'Получавай заявки според уменията и града си.'],
      [ShieldCheck, 'Изгради проверима репутация', 'Събирай оценки от реално завършени ремонти.'],
    ],
  },
  client: {
    title: (
      <>
        Не избирай майстор <strong>на сляпо</strong>
      </>
    ),
    benefits: [
      [ClipboardCheck, 'Опиши реалната задача', 'Събери важната информация на едно място.'],
      [Search, 'Сравни профили и кандидатури', 'Виж опит, специалности и реални оценки.'],
      [Star, 'Проследи работата до ревю', 'Завърши ремонта с ясен процес и обратна връзка.'],
    ],
  },
};

export function BrickyRegistrationBrand() {
  return (
    <Link to="/" className="registration-brand" aria-label="Bricky начало">
      <span className="registration-brand-mark">
        <Box size={24} strokeWidth={2.2} />
      </span>
      <span>Bricky</span>
    </Link>
  );
}

export function RegistrationHeader({ compact = false, mode = 'register' }) {
  if (compact) return null;

  return (
    <header className="registration-header">
      <div className="registration-header-inner">
        <BrickyRegistrationBrand />
        <Link to="/" className="registration-back-link">
          <ArrowLeft size={18} />
          <span>Назад към началото</span>
        </Link>
        {mode === 'gate' ? <span className="registration-header-spacer" /> : (
          <div className="registration-login-prompt">
            <span>{mode === 'login' ? 'Нямаш профил?' : 'Вече имаш профил?'}</span>
            <Link to={mode === 'login' ? '/auth/register' : '/auth/login'} className="registration-login-button">
              {mode === 'login' ? 'Регистрация' : 'Вход'}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export function RegistrationValuePanel({ role }) {
  const copy = VALUE_COPY[role];

  return (
    <aside className="registration-value-panel" aria-label="Предимства на Bricky">
      <div className="registration-value-blueprint" aria-hidden="true" />
      <h1>{copy.title}</h1>
      <ul>
        {copy.benefits.map(([icon, title, description]) => {
          const BenefitIcon = icon;
          return (
            <li key={title}>
              <span className="registration-benefit-icon"><BenefitIcon size={27} /></span>
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="registration-beta-note">
        <ShieldCheck size={21} /> {role === 'login' ? 'Сигурен достъп до твоя Bricky профил' : role === 'gate' ? 'Един профил за целия Bricky процес' : 'Безплатно по време на beta периода'}
      </p>
    </aside>
  );
}

export function AuthShell({ children, compact = false, mode = 'register', role = 'client', surfaceClass = '', pageClass = '' }) {
  return (
    <div className={`registration-page ${pageClass} ${compact ? 'is-modal' : ''}`.trim()}>
      <RegistrationHeader compact={compact} mode={mode} />
      <main className="registration-main">
        <section className={`registration-surface ${surfaceClass}`.trim()}>
          <RegistrationValuePanel role={role} />
          {children}
        </section>
      </main>
    </div>
  );
}

export function RoleSelector({ role, onChange }) {
  return (
    <fieldset className="registration-role-selector">
      <legend className="sr-only">Избери вид профил</legend>
      <button
        type="button"
        className={role === 'client' ? 'is-selected' : ''}
        onClick={() => onChange('client')}
        aria-pressed={role === 'client'}
      >
        <Search size={28} />
        <span><strong>Клиент</strong><small>Търся майстор за проект</small></span>
        {role === 'client' && <Check className="role-check" size={18} />}
      </button>
      <button
        type="button"
        className={role === 'worker' ? 'is-selected' : ''}
        onClick={() => onChange('worker')}
        aria-pressed={role === 'worker'}
      >
        <BriefcaseBusiness size={28} />
        <span><strong>Майстор</strong><small>Предлагам ремонтни услуги</small></span>
        {role === 'worker' && <Check className="role-check" size={18} />}
      </button>
    </fieldset>
  );
}

export function RegistrationStepper({ steps, currentStep }) {
  return (
    <div className="registration-stepper" aria-label={`Стъпка ${currentStep} от ${steps.length}`}>
      {steps.map((label, index) => {
        const number = index + 1;
        const state = number < currentStep ? 'complete' : number === currentStep ? 'current' : 'future';
        return (
          <div className={`registration-step is-${state}`} key={label}>
            <span>{state === 'complete' ? <Check size={15} /> : number}</span>
            <strong>{label}</strong>
          </div>
        );
      })}
      <div
        className="registration-progress-track"
        aria-hidden="true"
        style={{ '--registration-progress': `${((currentStep - 1) / Math.max(steps.length - 1, 1)) * 100}%` }}
      />
    </div>
  );
}
