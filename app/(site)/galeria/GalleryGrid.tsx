"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GalleryPhoto } from "@/lib/gallery/photos";

const filtros = [
  { value: "todas", label: "Todo PISÁO" },
  { value: "comida", label: "Sabores" },
  { value: "terraza", label: "Terraza" },
] as const;

export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [filtro, setFiltro] = useState<(typeof filtros)[number]["value"]>("todas");
  const [selected, setSelected] = useState<number | null>(null);

  const visibles = useMemo(
    () => (filtro === "todas" ? photos : photos.filter((p) => p.categoria === filtro)),
    [filtro, photos],
  );

  useEffect(() => {
    if (selected === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowRight") setSelected((current) => (current === null ? null : (current + 1) % visibles.length));
      if (event.key === "ArrowLeft") setSelected((current) => (current === null ? null : (current - 1 + visibles.length) % visibles.length));
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [selected, visibles.length]);

  const current = selected === null ? null : visibles[selected];

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 border-y border-pisao-gold/10 bg-pisao-carbon/90 px-4 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-full sm:border sm:px-5">
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filtros.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setFiltro(f.value);
                setSelected(null);
              }}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition-all",
                filtro === f.value
                  ? "border-pisao-gold bg-pisao-gold text-pisao-carbon"
                  : "border-pisao-gold/20 text-pisao-cream-muted hover:border-pisao-gold/60 hover:text-pisao-cream",
              )}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto hidden shrink-0 text-[10px] font-semibold tracking-[0.16em] text-pisao-cream-muted uppercase sm:block">
            {visibles.length} fotografías · toca para entrar
          </span>
        </div>
      </div>

      <div key={filtro} className="mt-8 columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {visibles.map((photo, index) => (
          <button
            key={photo.slug}
            type="button"
            onClick={() => setSelected(index)}
            className="pisao-image-lift group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft text-left sm:mb-4"
            style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
            aria-label={`Ampliar ${photo.alt}`}
          >
            <div className="relative overflow-hidden" style={{ aspectRatio: photo.width / photo.height }}>
              <Image
                src={`/gallery/${photo.file}`}
                alt={photo.alt}
                fill
                priority={index < 2}
                sizes="(min-width: 1024px) 24vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition duration-700 group-hover:scale-[1.045]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="border-pisao-gold/20 bg-pisao-carbon/70 text-pisao-gold absolute top-3 right-3 flex size-9 items-center justify-center rounded-full border opacity-0 backdrop-blur-xl transition group-hover:opacity-100">
                <Expand className="size-4" />
              </span>
              <div className="absolute right-0 bottom-0 left-0 translate-y-1 p-4 transition-transform duration-300 group-hover:translate-y-0">
                <p className="text-xs leading-relaxed font-medium text-pisao-cream">{photo.alt}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {current && selected !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/94 p-3 backdrop-blur-xl sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelected(null);
          }}
        >
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="border-pisao-gold/20 bg-pisao-carbon/80 text-pisao-cream absolute top-5 right-5 z-20 flex size-11 items-center justify-center rounded-full border backdrop-blur-xl transition hover:border-pisao-gold/60"
            aria-label="Cerrar galería"
          >
            <X className="size-5" />
          </button>

          <button
            type="button"
            onClick={() => setSelected((selected - 1 + visibles.length) % visibles.length)}
            className="border-pisao-gold/20 bg-pisao-carbon/75 text-pisao-gold absolute left-3 z-20 flex size-11 items-center justify-center rounded-full border backdrop-blur-xl transition hover:bg-pisao-gold hover:text-pisao-carbon sm:left-6"
            aria-label="Fotografía anterior"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="relative flex h-[86svh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-pisao-gold/15 bg-pisao-noche shadow-2xl sm:h-[88svh]">
            <div className="relative min-h-0 flex-1">
              <Image
                src={`/gallery/${current.file}`}
                alt={current.alt}
                fill
                sizes="96vw"
                className="object-contain"
                priority
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-pisao-carbon via-pisao-carbon/55 to-transparent" />
            </div>
            <div className="relative z-10 flex items-end justify-between gap-6 border-t border-pisao-gold/10 px-5 py-5 sm:px-8">
              <div>
                <p className="text-pisao-gold text-[9px] font-semibold tracking-[.22em] uppercase">
                  {current.categoria === "comida" ? "Sabores PISÁO" : "Terraza PISÁO"}
                </p>
                <p className="font-display mt-1 text-xl text-pisao-cream sm:text-3xl">{current.alt}</p>
              </div>
              <p className="text-pisao-cream-muted shrink-0 text-xs">{selected + 1} / {visibles.length}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelected((selected + 1) % visibles.length)}
            className="border-pisao-gold/20 bg-pisao-carbon/75 text-pisao-gold absolute right-3 z-20 flex size-11 items-center justify-center rounded-full border backdrop-blur-xl transition hover:bg-pisao-gold hover:text-pisao-carbon sm:right-6"
            aria-label="Fotografía siguiente"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
