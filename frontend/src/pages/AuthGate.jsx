import { ArrowRight, LogIn, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthShell } from '../components/registration/RegistrationShell';
import '../styles/auth.css';

export default function AuthGate() {
  return (
    <AuthShell mode="gate" role="gate" pageClass="registration-gate-page" surfaceClass="registration-gate-surface">
      <div className="registration-form-panel registration-gate-panel">
        <div className="registration-gate-content">
          <div className="registration-form-heading"><div><span className="registration-eyebrow">Добре дошли в Bricky</span><h1>Вход или регистрация</h1><p>Влезте в профила си, за да продължите, или създайте нов профил.</p></div></div>
          <div className="registration-gate-actions">
            <Link to="/auth/login" className="registration-gate-action"><span><LogIn size={30} /></span><div><strong>Вход</strong><small>Влезте в съществуващия си профил и продължете оттам, докъдето сте стигнали.</small></div><ArrowRight size={21} /></Link>
            <Link to="/auth/register" className="registration-gate-action is-primary"><span><UserPlus size={30} /></span><div><strong>Регистрация</strong><small>Създайте нов профил и използвайте Bricky като клиент или майстор.</small></div><ArrowRight size={21} /></Link>
          </div>
          <p className="registration-gate-note">Регистрацията е безплатна по време на beta периода.</p>
        </div>
      </div>
    </AuthShell>
  );
}
