import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

export default function RequestPhotoCarousel({ photos, getUrl }) {
  const trackRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const track = trackRef.current;
    if (!track) return;
    setCanLeft(track.scrollLeft > 4);
    setCanRight(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
  };

  useEffect(() => {
    const frame = requestAnimationFrame(updateArrows);
    const track = trackRef.current;
    if (!track) return () => cancelAnimationFrame(frame);
    const observer = new ResizeObserver(updateArrows);
    observer.observe(track);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [photos]);

  const scroll = (direction) => {
    trackRef.current?.scrollBy({ left: direction * 340, behavior: "smooth" });
  };

  if (!Array.isArray(photos) || photos.length === 0) {
    return (
      <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-slate-400/20 bg-slate-950/25 text-center text-slate-500">
        <div><ImageIcon className="mx-auto mb-2" /><span className="text-sm">Няма добавени снимки</span></div>
      </div>
    );
  }

  return (
    <div className="relative min-w-0">
      <div ref={trackRef} onScroll={updateArrows} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {photos.map((photo, index) => (
          <a key={photo.id || `${getUrl(photo)}-${index}`} href={getUrl(photo)} target="_blank" rel="noreferrer" className="block h-32 w-44 shrink-0 snap-start overflow-hidden rounded-[14px] border border-slate-400/15 bg-slate-950/40 shadow-xl shadow-black/20">
            <img src={getUrl(photo)} alt={photo.name || `Снимка ${index + 1} към заявката`} className="h-full w-full object-cover transition duration-200 hover:scale-105" />
          </a>
        ))}
      </div>

      {photos.length > 4 && (
        <>
          <button type="button" onClick={() => scroll(-1)} disabled={!canLeft} aria-label="Предишни снимки" className="absolute -left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-slate-300/20 bg-slate-950/90 text-white shadow-xl disabled:pointer-events-none disabled:opacity-0"><ChevronLeft size={20} /></button>
          <button type="button" onClick={() => scroll(1)} disabled={!canRight} aria-label="Следващи снимки" className="absolute -right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-slate-300/20 bg-slate-950/90 text-white shadow-xl disabled:pointer-events-none disabled:opacity-0"><ChevronRight size={20} /></button>
        </>
      )}
    </div>
  );
}
