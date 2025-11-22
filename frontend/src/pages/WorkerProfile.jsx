// src/pages/WorkerProfile.jsx
// @ts-nocheck
import React, { useState } from "react";
import axios from "axios";

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

      // TODO: сложи реалния workerId, когато имаш auth
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
