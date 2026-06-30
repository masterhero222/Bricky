export default function RequestInfoRow({ icon, label, value, accent = false }) {
  return (
    <div className="grid min-h-11 grid-cols-[40px_1fr] items-center gap-x-4 gap-y-1 sm:grid-cols-[40px_150px_1fr]">
      <span className={`row-span-2 grid h-10 w-10 place-items-center rounded-xl border ${accent ? "border-green-400/20 bg-green-400/10 text-green-300" : "border-slate-400/10 bg-slate-400/10 text-slate-300"}`}>
        {icon}
      </span>
      <span className="font-extrabold text-slate-100">{label}</span>
      <span className={`min-w-0 text-sm leading-6 sm:text-base ${accent ? "font-extrabold text-green-300" : "text-slate-300"}`}>{value}</span>
    </div>
  );
}
