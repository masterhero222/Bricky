// src/components/UI/WorkerPreview.jsx
import React, { useState } from "react";
import { ArrowLeft, ArrowRight, PhoneCall } from "lucide-react";

export default function WorkerPreview() {
  const workers = [
    {
      name: "Алекс Константинов Петров",
      skill: "Шпакловка",
      description: "Собственик на фирма за строителни ремонти",
      price: "Оферта към вас: 4000 лв",
      equipment:
        "Бригадата е напълно оборудвана за работа като гарантират срок от 7 до 10 дни (+2 дни ако има извънредни ситуации).",
      images: [
        "/media_files/banq.jpg",
        "/media_files/banq2.jpg",
        "/media_files/banq3.jpg",
      ],
      avatar: "/media_files/Snejan.jpg",
    },
    {
      name: "Ивайло Георгиев",
      skill: "Електро",
      description: "Фирмен електротехник с 12 години опит",
      price: "Оферта към вас: 3200 лв",
      equipment: "Работи с тествано оборудване. Срок: 5–7 дни.",
      images: ["/media_files/banq2.jpg", "/media_files/banq3.jpg"],
      avatar: "/media_files/Snejan.jpg",
    },
  ];

  const [index, setIndex] = useState(0);

  const next = () => setIndex((prev) => (prev + 1) % workers.length);
  const prev = () =>
    setIndex((prev) => (prev - 1 + workers.length) % workers.length);

  const w = workers[index];

  return (
    <div className="relative w-full flex justify-center mt-20 mb-28">
      {/* ЛЯВА ВЕРТИКАЛНА СТРЕЛКА */}
      <button
        onClick={prev}
        className="hidden md:flex flex-col items-center justify-center
                   h-40 w-14 rounded-2xl bg-red-600 text-white
                   absolute left-6 top-1/2 -translate-y-1/2
                   shadow-lg active:scale-95 transition"
      >
        <ArrowLeft size={26} />
      </button>

      {/* ДЯСНА ВЕРТИКАЛНА СТРЕЛКА */}
      <button
        onClick={next}
        className="hidden md:flex flex-col items-center justify-center
                   h-40 w-14 rounded-2xl bg-red-600 text-white
                   absolute right-6 top-1/2 -translate-y-1/2
                   shadow-lg active:scale-95 transition"
      >
        <ArrowRight size={26} />
      </button>

      {/* За мобилни – стрелки под картата, да не се чупи UI */}
      <div className="absolute -bottom-16 left-0 right-0 flex justify-center gap-6 md:hidden">
        <button
          onClick={prev}
          className="bg-red-600 text-white px-4 py-3 rounded-xl active:scale-95 transition"
        >
          <ArrowLeft size={22} />
        </button>
        <button
          onClick={next}
          className="bg-red-600 text-white px-4 py-3 rounded-xl active:scale-95 transition"
        >
          <ArrowRight size={22} />
        </button>
      </div>

      {/* ГЛАВНА КАРТА */}
      <div className="bg-white text-black shadow-xl rounded-3xl max-w-4xl w-full p-8 md:mx-32">
        {/* АВАТАР + СПЕЦИАЛНОСТ */}
        <div className="flex flex-col items-center mb-6">
          <img
            src={w.avatar}
            className="w-40 h-40 rounded-full object-cover border-4 border-red-500"
            alt={w.name}
          />
          <h2 className="text-3xl font-bold mt-4">{w.skill}</h2>
        </div>

        {/* ИНФО БЛОКОВЕ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ЛЯВ ПАНЕЛ */}
          <div className="bg-red-500 text-white p-6 rounded-2xl">
            <p className="text-xl font-semibold">{w.name}</p>
            <p className="mt-2">{w.description}</p>
            <p className="mt-4 text-lg font-bold">{w.price}</p>
          </div>

          {/* СНИМКИ */}
          <div className="bg-gray-100 p-4 rounded-2xl">
            <h3 className="text-xl font-bold text-center mb-3 text-red-600">
              Снимки
            </h3>
            <div className="flex gap-2 overflow-x-auto">
              {w.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  className="h-28 w-40 object-cover rounded-lg flex-shrink-0"
                  alt={`Снимка ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* ОБОРУДВАНЕ / СРОК */}
          <div className="bg-gray-100 p-6 rounded-2xl md:col-span-2">
            <h3 className="text-xl font-bold mb-3 text-red-600">
              Оборудване / Срок
            </h3>
            <p>{w.equipment}</p>
          </div>
        </div>

        {/* CTA БУТОН */}
        <button className="w-full bg-red-600 text-white py-4 mt-8 rounded-xl font-semibold flex items-center justify-center gap-2 text-lg active:scale-95 transition">
          <PhoneCall size={22} />
          Приемам обаждане от майстора
        </button>

        {/* ДОЛЕН ПЛЕЙСХОЛДЪР */}
        <div className="mt-6 text-center text-gray-400 text-sm">
          Слайдове за избиране на следващ профил (placeholder)
        </div>
      </div>
    </div>
  );
}
