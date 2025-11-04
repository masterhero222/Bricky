import React from "react";
import { motion } from "framer-motion";
import { Wrench, ClipboardList, Users } from "lucide-react";
const Button = ({ children, className, ...props }) => (
  <button
    className={`px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-xl transition ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-red-600 text-white px-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mt-20"
      >
        <h1 className="text-5xl font-bold mb-4">Добре дошли в <span className="text-yellow-300">Bricky</span></h1>
        <p className="text-lg text-white/90 max-w-2xl mx-auto">
          Платформа, която свързва хора и майстори с доверие.  
          Бързо, сигурно и без изненади.
        </p>
      </motion.div>

      {/* Buttons Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="flex flex-wrap justify-center gap-6 mt-10"
      >
        <Button
          className="bg-yellow-300 text-black text-lg px-8 py-6 rounded-2xl shadow-lg hover:bg-yellow-400 transition"
          onClick={() => (window.location.href = "/requests")}
        >
          🧱 Търся майстор
        </Button>
        <Button
          className="bg-white text-red-600 text-lg px-8 py-6 rounded-2xl shadow-lg hover:bg-gray-100 transition"
          onClick={() => (window.location.href = "/workers")}
        >
          🔧 Станете майстор
        </Button>
      </motion.div>

      {/* How It Works Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl"
      >
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center shadow-lg">
          <ClipboardList className="mx-auto mb-4 text-yellow-300" size={48} />
          <h3 className="text-xl font-semibold mb-2">1. Създай заявка</h3>
          <p className="text-white/80">Опиши какво трябва да се направи – от ВиК до боядисване.</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center shadow-lg">
          <Users className="mx-auto mb-4 text-yellow-300" size={48} />
          <h3 className="text-xl font-semibold mb-2">2. Bricky намира подходящ майстор</h3>
          <p className="text-white/80">Подбираме проверени специалисти според твоя ремонт.</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center shadow-lg">
          <Wrench className="mx-auto mb-4 text-yellow-300" size={48} />
          <h3 className="text-xl font-semibold mb-2">3. Ремонтът започва</h3>
          <p className="text-white/80">Свързваме те с майстора и следим процеса до завършване.</p>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="mt-20 mb-10 text-center text-white/70 text-sm">
        © {new Date().getFullYear()} <span className="text-yellow-300 font-semibold">Bricky</span> | Свързвай хора и майстори с доверие.
      </footer>
    </div>
  );
}
