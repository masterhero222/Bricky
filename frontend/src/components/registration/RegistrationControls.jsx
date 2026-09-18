import { Check, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export function FormField({ label, error, helper, children, className = '' }) {
  return (
    <label className={`registration-field ${className}`}>
      <span>{label}</span>
      {children}
      {error ? <small className="registration-field-error">{error}</small> : helper ? <small>{helper}</small> : null}
    </label>
  );
}

export function PasswordInput({ name, value, onChange, describedBy, invalid }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="registration-password-wrap">
      <input
        id={name}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={name === 'password' ? 'new-password' : 'new-password'}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        maxLength={128}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Скрий паролата' : 'Покажи паролата'}
      >
        {visible ? <EyeOff size={19} /> : <Eye size={19} />}
      </button>
    </span>
  );
}

export function PasswordRequirements({ password }) {
  const checks = [
    ['Поне 6 символа', password.length >= 6],
    ['Главна буква', /[A-Z]/.test(password)],
    ['Цифра', /\d/.test(password)],
  ];
  return (
    <ul className="registration-password-rules" id="registration-password-rules">
      {checks.map(([label, passed]) => (
        <li className={passed ? 'is-passed' : ''} key={label}>
          <Check size={14} /> {label}
        </li>
      ))}
    </ul>
  );
}

export function SelectableCardGroup({ legend, value, options, onChange }) {
  return (
    <fieldset className="registration-card-group">
      <legend>{legend}</legend>
      <div>
        {options.map(({ value: optionValue, label, description, icon: Icon }) => (
          <label className={value === optionValue ? 'is-selected' : ''} key={optionValue}>
            <input
              type="radio"
              name={legend}
              value={optionValue}
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
            />
            {Icon && <Icon size={24} />}
            <span><strong>{label}</strong>{description && <small>{description}</small>}</span>
            <i aria-hidden="true" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SummaryRow({ label, value }) {
  return <div className="registration-summary-row"><span>{label}</span><strong>{value || 'Не е добавено'}</strong></div>;
}
