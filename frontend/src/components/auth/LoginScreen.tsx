import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../../store/authStore';
import './login.css';

export default function LoginScreen() {
  const auth = useAuthStore((s) => s.auth);
  const doLogin = useAuthStore((s) => s.doLogin);
  const goRecover = useAuthStore((s) => s.goRecover);
  const goLogin = useAuthStore((s) => s.goLogin);
  const sendRecover = useAuthStore((s) => s.sendRecover);
  const recoverSent = useAuthStore((s) => s.recoverSent);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function onSubmitLogin(e: FormEvent) {
    e.preventDefault();
    doLogin(email);
  }

  function onSubmitRecover(e: FormEvent) {
    e.preventDefault();
    sendRecover();
  }

  return (
    <div className="login-screen">
      <div className="login-wrap">
        <div className="login-brand">
          <div className="login-logo">
            <span />
            <span className="dim" />
            <span className="dim" />
            <span />
          </div>
          <span className="login-brand-name">Tableros</span>
        </div>

        {auth !== 'recover' ? (
          <form className="login-card pop-in" onSubmit={onSubmitLogin}>
            <h1>Iniciar sesión</h1>
            <p className="login-sub">Entra para ver tus tableros y actividades.</p>
            <div className="field">
              <label htmlFor="email">Correo</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@empresa.com" />
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-accent btn-block">
              Entrar
            </button>
            <button type="button" className="login-link" onClick={goRecover}>
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        ) : (
          <form className="login-card pop-in" onSubmit={onSubmitRecover}>
            <h1>Recuperar contraseña</h1>
            <p className="login-sub">Te enviamos un enlace para crear una contraseña nueva.</p>
            <div className="field">
              <label htmlFor="recover-email">Correo</label>
              <input id="recover-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@empresa.com" />
            </div>
            {recoverSent && <p className="login-notice">Si el correo existe, recibirás el enlace en unos minutos.</p>}
            <button type="submit" className="btn btn-accent btn-block">
              Enviar enlace
            </button>
            <button type="button" className="login-link" onClick={goLogin}>
              Volver a iniciar sesión
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
