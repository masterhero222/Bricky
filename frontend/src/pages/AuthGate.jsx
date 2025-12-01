// src/pages/AuthGate.jsx
import { useNavigate } from "react-router-dom";

export default function AuthGate() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white px-6">

      <h1 className="text-4xl font-bold mb-12 text-center">
        Вход или Регистрация
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl">

        {/* CLIENT BLOCK */}
        <div
          className="bg-gray-900 border border-gray-700 rounded-2xl p-10 
                     flex flex-col items-center shadow-xl gap-6
                     hover:shadow-2xl hover:border-blue-500 transition cursor-pointer"
          onClick={() => navigate("/client/login")}
        >

          {/* IMAGE */}
          <img
            src="/media_files/deal_client.png"
            alt="Client"
            className="w-48 h-48 object-contain rounded-xl"
          />

          <h2 className="text-2xl font-bold">Клиенти</h2>

          <div className="flex flex-col gap-4 w-full max-w-xs mt-4">
            <button
              onClick={(e) => { e.stopPropagation(); navigate("/client/login"); }}
              className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold"
            >
              Вход клиент
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); navigate("/client/register"); }}
              className="p-3 bg-gray-700 hover:bg-gray-800 rounded-lg font-bold"
            >
              Регистрация клиент
            </button>
          </div>
        </div>


        {/* WORKER BLOCK */}
        <div
          className="bg-gray-900 border border-gray-700 rounded-2xl p-10 
                     flex flex-col items-center shadow-xl gap-6
                     hover:shadow-2xl hover:border-green-500 transition cursor-pointer"
          onClick={() => navigate("/worker/login")}
        >

          {/* IMAGE */}
          <img
            src="/media_files/deal_worker.png"
            alt="Worker"
            className="w-48 h-48 object-contain rounded-xl"
          />

          <h2 className="text-2xl font-bold">Майстори</h2>

          <div className="flex flex-col gap-4 w-full max-w-xs mt-4">
            <button
              onClick={(e) => { e.stopPropagation(); navigate("/worker/login"); }}
              className="p-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold"
            >
              Вход майстор
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); navigate("/worker/register"); }}
              className="p-3 bg-gray-700 hover:bg-gray-800 rounded-lg font-bold"
            >
              Регистрация майстор
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
