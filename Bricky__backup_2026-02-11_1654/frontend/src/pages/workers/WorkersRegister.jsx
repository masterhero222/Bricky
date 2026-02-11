import { useState } from "react";
import axios from "axios";

export default function WorkersRegister() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    city: "",
    skills: [],
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const skillsList = ["ВиК", "Електро", "Шпакловка и боя", "Зидария", "Плочки"];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSkillToggle = (skill) => {
    setForm((prev) => {
      const skills = prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill];
      return { ...prev, skills };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError("❌ Паролите не съвпадат!");
      return;
    }

    if (!form.fullName || !form.email || !form.phone || !form.city || !form.skills.length) {
      setError("❌ Всички полета са задължителни.");
      return;
    }

    const payload = {
      fullName: form.fullName,
      email: form.email,
      password: form.password,
      phone: form.phone,
      city: form.city,
      skills: form.skills,
    };

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/workers`, payload);
      setSuccess("Успешна регистрация!");
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
    } catch (err) {
      setError("Грешка при регистрацията");
      setSuccess("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-24 pb-24 px-6 flex flex-col items-center">

      <form onSubmit={handleSubmit}
        className="bg-gray-800 p-8 rounded-2xl w-full max-w-xl shadow-xl space-y-4">

        <h2 className="text-2xl font-bold text-center">Регистрация на майстор</h2>

        <input name="fullName" value={form.fullName} placeholder="Трите имена"
               onChange={handleChange} className="w-full p-3 rounded bg-gray-700" required />

        <input name="email" value={form.email} placeholder="Имейл"
               onChange={handleChange} className="w-full p-3 rounded bg-gray-700" required />

        <input name="password" type="password" placeholder="Парола"
               onChange={handleChange} className="w-full p-3 rounded bg-gray-700" required />

        <input name="confirmPassword" type="password" placeholder="Потвърди паролата"
               onChange={handleChange} className="w-full p-3 rounded bg-gray-700" required />

        <input name="phone" value={form.phone} placeholder="Телефон"
               onChange={handleChange} className="w-full p-3 rounded bg-gray-700" required />

        <input name="city" value={form.city} placeholder="Населено място"
               onChange={handleChange} className="w-full p-3 rounded bg-gray-700" required />

        <div>
          <p className="font-semibold mb-2">Специалности:</p>
          <div className="flex flex-wrap gap-3">
            {skillsList.map((s) => (
              <button key={s} type="button"
                onClick={() => handleSkillToggle(s)}
                className={`px-4 py-2 rounded-full border ${
                  form.skills.includes(s) ? "bg-blue-600 border-blue-600" : "border-gray-600"
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400">{error}</p>}
        {success && <p className="text-green-400">{success}</p>}

        <button type="submit"
                className="w-full bg-blue-600 py-3 rounded font-bold">
          Регистрация
        </button>

      </form>
    </div>
  );
}
