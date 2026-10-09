import { useEffect, useState } from 'react';
import { CheckCircle2, MailCheck, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import useDocumentMeta from '../hooks/useDocumentMeta';
import { apiPost } from '../services/api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState(token ? 'loading' : 'error');
  const [message, setMessage] = useState(
    token ? 'Потвърждаваме имейла ви...' : 'Липсва код за потвърждение.',
  );

  useDocumentMeta({
    title: 'Потвърждение на имейл | Bricky',
    description: 'Защитено потвърждение на имейл адрес за Bricky профил.',
    canonicalPath: '/verify-email',
    robots: 'noindex,nofollow',
  });

  useEffect(() => {
    if (!token) return;
    let active = true;
    apiPost('/auth/email-verification/confirm', { token })
      .then((response) => {
        if (!active) return;
        setState('success');
        setMessage(response.data?.message || 'Имейлът е потвърден успешно.');
      })
      .catch((error) => {
        if (!active) return;
        setState('error');
        setMessage(
          error?.response?.data?.message || 'Линкът е невалиден или е изтекъл.',
        );
      });
    return () => {
      active = false;
    };
  }, [token]);

  const Icon =
    state === 'success'
      ? CheckCircle2
      : state === 'error'
        ? XCircle
        : MailCheck;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-78px)] max-w-xl items-center px-5 py-12">
      <section className="bricky-card w-full rounded-lg p-8 text-center">
        <Icon
          className={`mx-auto h-12 w-12 ${state === 'error' ? 'text-red-300' : 'text-emerald-300'}`}
        />
        <h1 className="mt-5 text-3xl font-extrabold">Потвърждение на имейл</h1>
        <p className="mt-3 text-slate-300">{message}</p>
        {state !== 'loading' && (
          <Link
            to="/auth/login"
            className="bricky-button-primary mt-7 justify-center"
          >
            Към вход
          </Link>
        )}
      </section>
    </div>
  );
}
