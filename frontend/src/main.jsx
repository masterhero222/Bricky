import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthModalProvider } from "./context/AuthModalContext";

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error('❌ Не е намерен <div id="root"></div> в index.html');
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <AuthModalProvider>
        <App />
      </AuthModalProvider>
    </React.StrictMode>
  );
}
