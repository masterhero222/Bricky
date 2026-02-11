import { useAuthModal } from "../context/AuthModalContext";
import Login from "../pages/Login";
import Register from "../pages/Register";

export default function AuthModal() {
  const { open, mode, hide, showLogin, showRegister } = useAuthModal();

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
      
      <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-lg shadow-lg relative">
        
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl"
          onClick={hide}
        >
          ×
        </button>

        <div className="flex justify-center gap-6 mb-6 text-lg font-bold">
          <button
            onClick={showLogin}
            className={`${mode === "login" ? "text-blue-400" : "text-gray-400"}`}
          >
            Вход
          </button>

          <button
            onClick={showRegister}
            className={`${mode === "register" ? "text-blue-400" : "text-gray-400"}`}
          >
            Регистрация
          </button>
        </div>

        {mode === "login" && <Login insideModal={true} />}
        {mode === "register" && <Register insideModal={true} />}
      </div>
    </div>
  );
}
