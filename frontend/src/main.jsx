import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './styles/theme.css';
import { AuthModalProvider } from './context/AuthModalContext';
import AppErrorBoundary from './components/AppErrorBoundary';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Липсва <div id="root"></div> в index.html');
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <AuthModalProvider>
          <App />
        </AuthModalProvider>
      </AppErrorBoundary>
    </React.StrictMode>,
  );
}
