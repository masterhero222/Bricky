import React, { useState } from "react";
import { Box, Menu, UserRound, X } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";

const navClass = ({ isActive }) =>
  `relative flex min-h-[78px] items-center px-4 font-bold transition-colors ${
    isActive ? "text-green-300 after:absolute after:inset-x-4 after:bottom-0 after:h-[3px] after:rounded-full after:bg-gradient-to-r after:from-green-500 after:to-green-300" : "text-slate-300 hover:text-white"
  }`;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const profilePath = role === "client" ? "/client/profile" : "/worker/profile";

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-[78px] border-b border-slate-400/15 bg-[#08111f]/85 backdrop-blur-xl">
      <div className="bricky-container flex h-full items-center justify-between gap-5">
        <Link to="/" className="flex items-center gap-3 text-xl font-extrabold text-white" aria-label="Bricky начало">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-green-400/20 bg-green-500/15 text-green-300 shadow-lg shadow-green-950/30">
            <Box size={24} strokeWidth={2.2} />
          </span>
          <span>Bricky</span>
        </Link>

        <nav className="hidden items-center md:flex" aria-label="Основна навигация">
          <NavLink to="/" end className={navClass}>Начало</NavLink>
          <NavLink to="/workers" className={navClass}>Майсторите</NavLink>
          <NavLink to="/about" className={navClass}>За нас</NavLink>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!role ? (
            <>
              <button onClick={() => navigate("/auth/login")} className="min-h-11 rounded-xl border border-slate-400/15 bg-slate-800/70 px-5 font-bold text-slate-100 hover:bg-slate-700/80">Вход</button>
              <button onClick={() => navigate("/auth/register")} className="bricky-button-secondary !min-h-11">Регистрация</button>
            </>
          ) : (
            <Link className="bricky-button-primary !min-h-11" to={profilePath}>
              <UserRound size={19} /> Моят профил
            </Link>
          )}
        </div>

        <button onClick={() => setOpen((value) => !value)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-400/15 bg-slate-800/70 text-white md:hidden" aria-label={open ? "Затвори менюто" : "Отвори менюто"}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-400/15 bg-[#08111f]/98 px-5 py-5 shadow-2xl md:hidden">
          <nav className="flex flex-col gap-1 font-bold text-slate-200">
            <Link to="/" onClick={() => setOpen(false)} className="rounded-lg px-4 py-3 hover:bg-slate-800">Начало</Link>
            <Link to="/workers" onClick={() => setOpen(false)} className="rounded-lg px-4 py-3 hover:bg-slate-800">Майсторите</Link>
            <Link to="/about" onClick={() => setOpen(false)} className="rounded-lg px-4 py-3 hover:bg-slate-800">За нас</Link>
            {!role ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button onClick={() => { setOpen(false); navigate("/auth/login"); }} className="rounded-xl border border-slate-400/15 bg-slate-800 px-4 py-3">Вход</button>
                <button onClick={() => { setOpen(false); navigate("/auth/register"); }} className="bricky-button-secondary">Регистрация</button>
              </div>
            ) : (
              <Link onClick={() => setOpen(false)} to={profilePath} className="bricky-button-primary mt-3"><UserRound size={19} /> Моят профил</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
