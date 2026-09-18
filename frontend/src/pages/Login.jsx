import { useState } from 'react';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiPost } from '../services/api';
import { AuthShell } from '../components/registration/RegistrationShell';
import { FormField, PasswordInput } from '../components/registration/RegistrationControls';
import '../styles/auth.css';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [devLoading, setDevLoading] = useState('');
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const finishLogin = (data) => {
    localStorage.setItem('token', data.token); localStorage.setItem('role', data.user.role); localStorage.setItem('userName', data.user.name || '');
    const destination = data.user.role === 'client' ? '/client/profile' : ['admin', 'super_admin'].includes(data.user.role) ? '/admin' : '/worker/profile';
    window.location.href = destination;
  };
  const finishDevLoginOffline = (role) => finishLogin({ token: `local-dev-token-${role}`, user: { id: role === 'client' ? 1 : 2, role, name: role === 'client' ? 'Dev Client' : 'Dev Worker', email: `${role}.dev@bricky.local` } });
  const submit = async (event) => {
    event.preventDefault(); setError('');
    try { const response = await apiPost('/auth/login', form); finishLogin(response.data); }
    catch (err) {
      if (!err.response) { console.error('NETWORK ERROR:', err); setError('Няма връзка с backend API. Провери дали backend работи на localhost:3000.'); return; }
      const message = err.response?.data?.message; console.error('LOGIN ERROR:', err.response?.data || err); setError(Array.isArray(message) ? message.join(', ') : message || 'Грешен имейл или парола.');
    }
  };
  const devLogin = async (role) => {
    setError(''); setDevLoading(role);
    try { const response = await apiPost('/auth/dev-login', { role }); finishLogin(response.data); }
    catch (err) { console.error('DEV LOGIN ERROR:', err?.response?.data || err.message); finishDevLoginOffline(role); }
    finally { setDevLoading(''); }
  };
  return (
    <AuthShell mode="login" role="login" pageClass="registration-login-page" surfaceClass="registration-login-surface">
      <form className="registration-form-panel registration-login-panel" onSubmit={submit}>
        <div className="registration-login-content">
          <span className="registration-login-icon"><LockKeyhole size={28} /></span>
          <div className="registration-form-heading"><div><h1>Вход в Bricky</h1><p>Въведете данните си, за да продължите към своя профил.</p></div></div>
          <div className="registration-login-fields">
            <FormField label="Имейл"><div className="registration-input-with-icon"><Mail size={18} /><input type="email" name="email" value={form.email} onChange={change} autoComplete="email" required /></div></FormField>
            <FormField label="Парола"><PasswordInput name="password" value={form.password} onChange={change} /></FormField>
          </div>
          <div className="registration-login-options"><span /><Link to="/reset-password">Забравена парола?</Link></div>
          {error && <p className="registration-notice" role="alert">{error}</p>}
          <button type="submit" className="registration-primary-action registration-login-submit">Вход <ArrowRight size={19} /></button>
          <p className="registration-login-register">Нямате профил? <Link to="/auth/register">Регистрация</Link></p>
          {import.meta.env.DEV && <div className="registration-dev-login"><span>Локално тестване</span><div>{[['client', 'Клиент'], ['worker', 'Майстор'], ['super_admin', 'Админ']].map(([role, label]) => <button type="button" onClick={() => devLogin(role)} disabled={Boolean(devLoading)} key={role}>{devLoading === role ? 'Влизане...' : label}</button>)}</div></div>}
        </div>
      </form>
    </AuthShell>
  );
}
