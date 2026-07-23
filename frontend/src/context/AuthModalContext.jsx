import { createContext, useContext, useState } from "react";

const AuthModalContext = createContext();

export function AuthModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("login"); // login | register

  const showLogin = () => {
    setMode("login");
    setOpen(true);
  };

  const showRegister = () => {
    setMode("register");
    setOpen(true);
  };

  const hide = () => setOpen(false);

  return (
    <AuthModalContext.Provider value={{ open, mode, showLogin, showRegister, hide }}>
      {children}
    </AuthModalContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthModal = () => useContext(AuthModalContext);
