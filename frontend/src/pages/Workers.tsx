// @ts-nocheck
import { useState } from "react";
import axios from "axios";



export default function WorkerRegister() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    city: "",
    skills: [] as string[],
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const skillsList = ["ВиК", "Електро", "Шпакловка и боя", "Зидария", "Плочки"];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleSkillToggle = (skill: string) => {
    setForm((prev) => {
      const skills = prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill];
      return { ...prev, skills };
    });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1) Локална проверка на паролите
    if (form.password !== form.confirmPassword) {
      setError("❌ Паролите не съвпадат!");
      return;
    }

    // 2) Задължителни полета
    if (
      !form.fullName ||
      !form.email ||
      !form.password ||
      !form.phone ||
      !form.city ||
      !form.skills.length
    ) {
      setError("❌ Моля, попълни всички задължителни полета.");
      return;
    }

    // 3) Payload към бекенда – БЕЗ confirmPassword
    const payload = {
      fullName: form.fullName,
      email: form.email,
      password: form.password,
      phone: form.phone,
      city: form.city,
      skills: form.skills, // това е string[]
    };

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/workers`, payload);

      setSuccess("✅ Успешна регистрация! Ще се свържем с теб след преглед.");
      setError("");

      setForm({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        city: "",
        skills: [],
      });
    } catch (err: any) {
      console.error("Worker registration error:", err?.response?.data || err);
      // по желание можеш да покажеш по-конкретно:
      // setError(err?.response?.data?.message || "⚠️ Възникна грешка при регистрацията.");
      setError("⚠️ Възникна грешка при регистрацията.");
      setSuccess("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-8 rounded-2xl w-full max-w-lg space-y-4 shadow-xl"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">
          Регистрация на майстор
        </h2>

        <input
          name="fullName"
          value={form.fullName}
          placeholder="Трите имена"
          onChange={handleChange}
          className="w-full p-3 rounded bg-gray-700 focus:ring-2 focus:ring-orange-400 outline-none"
          required
        />
        <input
          name="email"
          type="email"
          value={form.email}
          placeholder="Имейл"
          onChange={handleChange}
          className="w-full p-3 rounded bg-gray-700 focus:ring-2 focus:ring-orange-400 outline-none"
          required
        />
        <input
          name="password"
          type="password"
          value={form.password}
          placeholder="Парола"
          onChange={handleChange}
          className="w-full p-3 rounded bg-gray-700 focus:ring-2 focus:ring-orange-400 outline-none"
          required
        />
        <input
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          placeholder="Потвърди паролата"
          onChange={handleChange}
          className="w-full p-3 rounded bg-gray-700 focus:ring-2 focus:ring-orange-400 outline-none"
          required
        />
        <input
          name="phone"
          value={form.phone}
          placeholder="Телефон"
          onChange={handleChange}
          className="w-full p-3 rounded bg-gray-700 focus:ring-2 focus:ring-orange-400 outline-none"
          required
        />
        <input
          name="city"
          value={form.city}
          placeholder="Населено място"
          onChange={handleChange}
          className="w-full p-3 rounded bg-gray-700 focus:ring-2 focus:ring-orange-400 outline-none"
          required
        />

        <div>
          <p className="font-semibold mb-2">Специалности:</p>
          <div className="flex flex-wrap gap-3">
            {skillsList.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => handleSkillToggle(skill)}
                className={`px-4 py-2 rounded-full border transition ${
                  form.skills.includes(skill)
                    ? "bg-blue-600 border-blue-600"
                    : "border-gray-600 hover:border-blue-500"
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
        {success && (
          <p className="text-green-400 text-sm text-center">{success}</p>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded font-bold mt-4"
        >
          Регистрация
        </button>
      </form>
    </div>
  );
}
