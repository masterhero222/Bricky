import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, details) {
    console.error('Bricky UI error', error, details);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-5 text-white">
        <section className="bricky-card w-full max-w-xl rounded-lg p-8 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-300" />
          <h1 className="mt-5 text-3xl font-extrabold">
            Страницата не можа да се зареди
          </h1>
          <p className="mt-3 text-slate-300">
            Данните ви не са изтрити. Опитайте да презаредите или се върнете в
            началото.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bricky-button-primary"
            >
              <RefreshCw size={18} /> Презареди
            </button>
            <a href="/" className="bricky-button-secondary">
              <Home size={18} /> Начало
            </a>
          </div>
        </section>
      </main>
    );
  }
}
