// src/components/UI/Navbar.jsx
import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const role = localStorage.getItem("role");

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-black/70 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
        {/* MOBILE MENU BUTTON */}
        <button onClick={() => setOpen(!open)} className="text-white md:hidden">
          {open ? <X size={30} /> : <Menu size={30} />}
        </button>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex gap-8 text-gray-300 font-medium">
          <Link to="/" className="hover:text-white transition">
            Начало
          </Link>

          {/* ✅ FIXED HERE */}
          <Link to="/workers" className="hover:text-white transition">
            Майсторите
          </Link>

          <Link to="/about" className="hover:text-white transition">
            За нас
          </Link>
        </nav>

        {/* DESKTOP AUTH BUTTONS */}
        <div className="hidden md:flex gap-4">
          {!role && (
            <>
              <button
                onClick={() => navigate("/auth/login")}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition"
              >
                Вход
              </button>

              <button
                onClick={() => navigate("/auth/register")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition"
              >
                Регистрация
              </button>
            </>
          )}

          {role && (
            <Link
              className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-white transition"
              to={role === "client" ? "/client/profile" : "/worker/profile"}
            >
              Моят профил
            </Link>
          )}
        </div>
      </div>

      {/* MOBILE MENU */}
      {open && (
        <div className="md:hidden bg-black/90 px-6 py-4 flex flex-col gap-4 text-gray-200 border-t border-gray-800">
          <Link to="/" onClick={() => setOpen(false)}>
            Начало
          </Link>

          {/* ✅ FIXED HERE TOO */}
          <Link to="/workers" onClick={() => setOpen(false)}>
            Майсторите
          </Link>

          <Link to="/about" onClick={() => setOpen(false)}>
            За нас
          </Link>

          {!role && (
            <>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/auth/login");
                }}
                className="px-4 py-2 bg-gray-800 rounded-lg mt-2"
              >
                Вход
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/auth/register");
                }}
                className="px-4 py-2 bg-blue-600 rounded-lg"
              >
                Регистрация
              </button>
            </>
          )}

          {role && (
            <Link
              onClick={() => setOpen(false)}
              to={role === "client" ? "/client/profile" : "/worker/profile"}
            >
              Моят профил
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
