import React, { useEffect, useState } from "react";
import { Bell, Box, LogOut, Menu, UserRound, X } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../../services/api";

const navClass = ({ isActive }) =>
  `relative flex min-h-[78px] items-center px-4 font-bold transition-colors ${
    isActive
      ? "text-green-300 after:absolute after:inset-x-4 after:bottom-0 after:h-[3px] after:rounded-full after:bg-gradient-to-r after:from-green-500 after:to-green-300"
      : "text-slate-300 hover:text-white"
  }`;

const mobileLinkClass =
  "rounded-xl border border-slate-600/30 bg-[#17243a] px-4 py-3.5 transition-colors hover:bg-[#1d2d47]";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const profilePath = role === "admin" ? "/admin" : role === "client" ? "/client/profile" : "/worker/profile";
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  useEffect(() => {
    if (!role || role === "admin") return;
    apiGet("/notifications/me")
      .then((response) => setNotifications(Array.isArray(response.data) ? response.data : []))
      .catch(() => setNotifications([]));
  }, [role]);

  const markNotificationRead = async (item) => {
    if (item.isRead) return;
    await apiPost(`/notifications/${item.id}/read`, {}).catch(() => null);
    setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setOpen(false);
    navigate("/auth/login", { replace: true });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-[78px] border-b border-slate-400/15 bg-[#08111f] shadow-lg shadow-black/20">
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
          {role === "worker" && <NavLink to="/repair-map" className={navClass}>Карта</NavLink>}
          {role === "admin" && <NavLink to="/admin" className={navClass}>Admin</NavLink>}
          <NavLink to="/about" className={navClass}>За нас</NavLink>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!role ? (
            <>
              <button onClick={() => navigate("/auth/login")} className="min-h-11 rounded-xl border border-slate-400/15 bg-slate-800/70 px-5 font-bold text-slate-100 hover:bg-slate-700/80">Вход</button>
              <button onClick={() => navigate("/auth/register")} className="bricky-button-secondary !min-h-11">Регистрация</button>
            </>
          ) : (
            <>
              {role !== "admin" && <div className="relative">
                <button onClick={() => setNotificationsOpen((value) => !value)} className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-400/15 bg-slate-800/70 text-slate-100" aria-label="Известия">
                  <Bell size={19} />
                  {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-center text-xs font-black text-white">{unreadCount}</span>}
                </button>
                {notificationsOpen && <div className="absolute right-0 top-14 w-96 overflow-hidden rounded-xl border border-slate-600/40 bg-[#101b2d] shadow-2xl">
                  <p className="border-b border-slate-600/40 px-4 py-3 font-extrabold text-white">Известия</p>
                  <div className="max-h-80 overflow-y-auto">{notifications.length ? notifications.slice(0, 10).map((item) => <button key={item.id} onClick={() => markNotificationRead(item)} className={`block w-full border-b border-slate-700/50 px-4 py-3 text-left text-sm ${item.isRead ? "text-slate-400" : "bg-cyan-400/5 text-slate-100"}`}>{item.message}</button>) : <p className="px-4 py-5 text-sm text-slate-400">Няма известия.</p>}</div>
                </div>}
              </div>}
              <Link className="bricky-button-primary !min-h-11" to={profilePath}>
                <UserRound size={19} /> Моят профил
              </Link>
              <button onClick={handleLogout} className="grid h-11 w-11 place-items-center rounded-xl border border-red-400/25 bg-red-500/10 text-red-200" aria-label="Изход"><LogOut size={19} /></button>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((value) => !value)}
          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-400/15 bg-slate-800/70 text-white md:hidden"
          aria-expanded={open}
          aria-label={open ? "Затвори менюто" : "Отвори менюто"}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-[78px] border-t border-slate-600/40 bg-[#101b2d] px-5 py-5 shadow-[0_24px_55px_rgba(0,0,0,0.65)] md:hidden">
          <nav className="flex flex-col gap-2 font-bold text-slate-100" aria-label="Мобилна навигация">
            <Link to="/" onClick={() => setOpen(false)} className={mobileLinkClass}>Начало</Link>
            <Link to="/workers" onClick={() => setOpen(false)} className={mobileLinkClass}>Майсторите</Link>
            {role === "worker" && <Link to="/repair-map" onClick={() => setOpen(false)} className={mobileLinkClass}>Карта</Link>}
            {role === "admin" && <Link to="/admin" onClick={() => setOpen(false)} className={mobileLinkClass}>Admin</Link>}
            <Link to="/about" onClick={() => setOpen(false)} className={mobileLinkClass}>За нас</Link>

            {!role ? (
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-600/40 pt-4">
                <button onClick={() => { setOpen(false); navigate("/auth/login"); }} className="rounded-xl border border-slate-400/15 bg-slate-800 px-4 py-3">Вход</button>
                <button onClick={() => { setOpen(false); navigate("/auth/register"); }} className="bricky-button-secondary">Регистрация</button>
              </div>
            ) : (
              <div className="mt-3 grid gap-2 border-t border-slate-600/40 pt-4">
                <Link onClick={() => setOpen(false)} to={profilePath} className="bricky-button-primary">
                  <UserRound size={19} /> Моят профил
                </Link>
                <button onClick={handleLogout} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/15 px-4 font-bold text-red-200 transition-colors hover:bg-red-500/25">
                  <LogOut size={19} /> Изход
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
