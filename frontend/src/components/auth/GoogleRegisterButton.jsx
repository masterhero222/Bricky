import { useEffect, useRef } from 'react';

const GOOGLE_SCRIPT_ID = 'google-identity-services';
const DEV_MOCK_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_USE_DEV_MOCK !== 'false';

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google), {
        once: true,
      });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function GoogleRegisterButton({
  disabled = false,
  loading = false,
  onCredential,
  onError,
}) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;
  const clientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

  useEffect(() => {
    if (DEV_MOCK_ENABLED || disabled || !clientId || !containerRef.current) {
      return undefined;
    }

    let active = true;
    loadGoogleIdentity()
      .then((google) => {
        if (!active || !containerRef.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => callbackRef.current(response.credential),
          cancel_on_tap_outside: true,
        });
        containerRef.current.replaceChildren();
        google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signup_with',
          shape: 'rectangular',
          width: 400,
          locale: 'bg',
        });
      })
      .catch(() => {
        if (active) onError?.('Google регистрацията не можа да се зареди.');
      });

    return () => {
      active = false;
    };
  }, [clientId, disabled, onError]);

  if (DEV_MOCK_ENABLED) {
    return (
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => onCredential('mock-google-credential')}
        className="w-full rounded border border-gray-500 bg-white p-3 font-bold text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Свързване...' : 'Регистрация с Google (mock)'}
      </button>
    );
  }

  if (!clientId) return null;

  if (disabled || loading) {
    return (
      <button
        type="button"
        disabled
        className="w-full rounded border border-gray-500 bg-white p-3 font-bold text-gray-500 opacity-50"
      >
        {loading ? 'Свързване...' : 'Регистрация с Google'}
      </button>
    );
  }

  return <div ref={containerRef} className="flex min-h-11 justify-center" />;
}
