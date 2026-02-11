// src/pages/AuthGate.jsx
import { useNavigate } from "react-router-dom";

export default function AuthGate() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white px-6">

      <h1 className="text-4xl font-bold mb-12 text-center">
        Вход или Регистрация
      </h1>

      <div className="flex gap-6">

        {/* ВХОД */}
        <button
          onClick={() => navigate("/auth/login")}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xl"
        >
          Вход
        </button>

        {/* РЕГИСТРАЦИЯ */}
        <button
          onClick={() => navigate("/auth/register")}
          className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl"
        >
          Регистрация
        </button>

      </div>

    </div>
  );
}
