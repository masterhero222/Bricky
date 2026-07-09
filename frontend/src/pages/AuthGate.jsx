import { useNavigate } from "react-router-dom";

export default function AuthGate() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-6 text-white">
      <h1 className="mb-12 text-center text-4xl font-bold">Вход или регистрация</h1>

      <div className="flex gap-6">
        <button
          onClick={() => navigate("/auth/login")}
          className="rounded-xl bg-blue-600 px-8 py-4 text-xl text-white hover:bg-blue-700"
        >
          Вход
        </button>

        <button
          onClick={() => navigate("/auth/register")}
          className="rounded-xl bg-green-600 px-8 py-4 text-xl text-white hover:bg-green-700"
        >
          Регистрация
        </button>
      </div>
    </div>
  );
}
