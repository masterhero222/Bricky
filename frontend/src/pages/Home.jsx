import React from "react";
import { motion } from "framer-motion";
import { Wrench, CheckCircle, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="relative bg-gray-950 text-white min-h-screen flex flex-col overflow-hidden">
      {/* 🎥 VIDEO BACKGROUND */}
      <video autoPlay loop muted playsInline className="absolute w-full h-full object-cover">
        <source src="/src/media_files/loop.mp4" type="video/mp4" />
      </video>

      {/* 🔳 DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      {/* 🧱 HERO SECTION */}
      <section className="relative z-10 flex flex-col items-center justify-center flex-1 text-center px-6 py-16">
        <motion.h1
          className="text-4xl md:text-6xl font-bold mb-4"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Добре дошъл в <span className="text-blue-500">Bricky</span>
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-gray-300 max-w-2xl mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Свързваме клиенти и майстори — бързо, лесно и надеждно. Без излишни обаждания и хаос.
        </motion.p>

        <motion.div
          className="flex flex-col md:flex-row gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <button
            onClick={() => navigate("/requests")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl text-lg font-semibold transition"
          >
            Създай заявка 🧱
          </button>

          {/* ✅ FIX: не към /workers, а към регистрация като worker */}
          <button
            onClick={() => navigate("/auth/register?role=worker")}
            className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-xl text-lg font-semibold transition"
          >
            Стани майстор 🔧
          </button>
        </motion.div>
      </section>

      {/* ⚙️ HOW IT WORKS */}
      <section className="relative z-10 bg-gray-900/80 py-16">
        <div className="max-w-5xl mx-auto text-center px-6">
          <h2 className="text-3xl font-bold mb-10">Как работи?</h2>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                icon: <Mail size={40} className="text-blue-400 mb-4" />,
                title: "Изпращаш заявка",
                desc: "Клиентът описва ремонта и оставя контакт.",
              },
              {
                icon: <Wrench size={40} className="text-green-400 mb-4" />,
                title: "Намираме майстор",
                desc: "Bricky избира подходящия специалист за задачата.",
              },
              {
                icon: <CheckCircle size={40} className="text-yellow-400 mb-4" />,
                title: "Проследяваш процеса",
                desc: "Получаваш обратна връзка и сигурност до завършването.",
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                className="bg-gray-800/80 p-8 rounded-2xl shadow-lg hover:shadow-blue-500/20 transition"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
              >
                <div className="flex flex-col items-center">
                  {step.icon}
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-400">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ⚒️ FOOTER */}
      <footer className="relative z-10 bg-gray-950/90 border-t border-gray-800 py-6 text-center text-gray-400 text-sm">
        © {new Date().getFullYear()} Bricky — Свързваме клиенти и майстори с доверие.
      </footer>
    </div>
  );
}
