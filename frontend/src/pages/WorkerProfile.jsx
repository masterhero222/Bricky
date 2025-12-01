// src/pages/WorkerProfile.jsx
// @ts-nocheck
import React, { useState } from "react";
import axios from "axios";

// Същата базова таблица за материали – тук трудът идва от майстора
const PRICE_TABLE = {
  "Баня": { material: 140 },
  "Шпакловка и боя": { material: 18 },
  "Плочки": { material: 40 },
  "ВиК": { material: 55 },
};

export default function WorkerProfile() {
  const [profile, setProfile] = useState({
    fullName: "",
    city: "",
    description: "",
    experience: "",
    equipment: "",
    images: [],
    avatar: null,
  });

  const [previewImages, setPreviewImages] = useState([]);
  const [previewAvatar, setPreviewAvatar] = useState("");
  const [saving, setSaving] = useState(false);

  // Калкулатор за оферта
  const [calc, setCalc] = useState({
    type: "",
    area: "",
    laborPerM2: "",
    materials: 0,
    labor: 0,
    total: 0,
  });

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewAvatar(URL.createObjectURL(file));
    setProfile((prev) => ({ ...prev, avatar: file }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const previews = files.map((f) => URL.createObjectURL(f));
    setPreviewImages((prev) => [...prev, ...previews]);
    setProfile((prev) => ({ ...prev, images: [...prev.images, ...files] }));
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const saveProfile = async () => {
    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("fullName", profile.fullName);
      formData.append("city", profile.city);
      formData.append("description", profile.description);
      formData.append("experience", profile.experience);
      formData.append("equipment", profile.equipment);

      if (profile.avatar) {
        formData.append("avatar", profile.avatar);
      }

      profile.images.forEach((img) => formData.append("images", img));

      // TODO: реален workerId, когато имаш auth
      await axios.put(
        `${import.meta.env.VITE_API_URL}/workers/profile/1`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      alert("Профилът е обновен!");
    } catch (err) {
      console.error(err);
      alert("Грешка при запазването на профила.");
    } finally {
      setSaving(false);
    }
  };

  const updateCalc = (field, value) => {
    const next = { ...calc, [field]: value };
    const areaNum = parseFloat(next.area) || 0;
    const laborNum = parseFloat(next.laborPerM2) || 0;
    const conf = PRICE_TABLE[next.type] || null;

    if (!conf || !areaNum) {
      next.materials = 0;
      next.labor = 0;
      next.total = 0;
    } else {
      next.materials = Math.round(areaNum * conf.material);
      next.labor = Math.round(areaNum * laborNum);
      next.total = next.materials + next.labor;
    }

    setCalc(next);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Моят профил</h1>

        {/* Avatar */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold">Профилна снимка</h2>
          <div className="flex items-center gap-6 mt-4">
            <img
              src={previewAvatar || "/media_files/Snejan.jpg"}
              className="w-32 h-32 rounded-full border-4 border-red-500 object-cover"
            />
            <input type="file" accept="image/*" onChange={handleAvatarUpload} />
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <input
            name="fullName"
            value={profile.fullName}
            onChange={handleChange}
            placeholder="Трите имена / име на фирмата"
            className="p-3 rounded bg-gray-800 w-full outline-none"
          />
          <input
            name="city"
            value={profile.city}
            onChange={handleChange}
            placeholder="Град"
            className="p-3 rounded bg-gray-800 w-full outline-none"
          />
        </div>

        <textarea
          name="description"
          value={profile.description}
          onChange={handleChange}
          placeholder="Кратко описание на фирмата / дейността"
          className="mt-4 w-full p-3 bg-gray-800 rounded h-28 outline-none"
        />

        <textarea
          name="experience"
          value={profile.experience}
          onChange={handleChange}
          placeholder="Опит – години, специализации, тип обекти..."
          className="mt-4 w-full p-3 bg-gray-800 rounded h-24 outline-none"
        />

        <textarea
          name="equipment"
          value={profile.equipment}
          onChange={handleChange}
          placeholder="Оборудване, техника, екип..."
          className="mt-4 w-full p-3 bg-gray-800 rounded h-24 outline-none"
        />

        {/* Image gallery uploader */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold">Снимки от ремонти</h2>

          <div className="flex gap-4 overflow-x-auto mt-3 pb-2">
            {previewImages.map((src, i) => (
              <img
                key={i}
                src={src}
                className="w-40 h-28 rounded object-cover border border-gray-700"
              />
            ))}
          </div>

          <input
            type="file"
            accept="image/*"
            multiple
            className="mt-4"
            onChange={handleImageUpload}
          />
        </div>

        {/* Bricky Калкулатор за оферта */}
        <div className="mt-10 bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4">
          <h2 className="text-2xl font-bold mb-2">Bricky Калкулатор за оферта</h2>
          <p className="text-sm text-gray-300">
            Това е ориентировъчен калкулатор за първоначална оферта към клиента.
            Не се записва в базата засега, служи ти за бърза сметка пред клиента.
          </p>

          <select
            value={calc.type}
            onChange={(e) => updateCalc("type", e.target.value)}
            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none mb-3"
          >
            <option value="">Тип ремонт</option>
            <option value="Баня">Баня</option>
            <option value="Шпакловка и боя">Шпакловка и боя</option>
            <option value="Плочки">Плочки</option>
            <option value="ВиК">ВиК</option>
          </select>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="number"
              min="0"
              step="0.1"
              value={calc.area}
              onChange={(e) => updateCalc("area", e.target.value)}
              placeholder="Площ (кв.м)"
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none"
            />
            <input
              type="number"
              min="0"
              step="1"
              value={calc.laborPerM2}
              onChange={(e) => updateCalc("laborPerM2", e.target.value)}
              placeholder="Цена за труд на кв.м (лв)"
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none"
            />
          </div>

          <div className="bg-gray-900 p-4 rounded-xl space-y-2 text-sm mt-4">
            <div className="flex justify-between">
              <span className="text-gray-300">Материали (приблизително):</span>
              <span className="font-semibold text-blue-300">
                {calc.materials.toLocaleString("bg-BG")} лв
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Труд (по твоя ставка):</span>
              <span className="font-semibold text-blue-300">
                {calc.labor.toLocaleString("bg-BG")} лв
              </span>
            </div>
            <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between">
              <span className="text-gray-200 font-semibold">Общо оферта:</span>
              <span className="font-bold text-green-400 text-lg">
                {calc.total.toLocaleString("bg-BG")} лв
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            На следващ етап ще вържем тези стойности с реални данни от заявки и
            ще се калибрират автоматично.
          </p>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="mt-8 bg-red-600 hover:bg-red-700 disabled:bg-red-900 px-6 py-3 rounded text-lg font-bold"
        >
          {saving ? "Запазване..." : "Запази промените"}
        </button>
      </div>
    </div>
  );
}
