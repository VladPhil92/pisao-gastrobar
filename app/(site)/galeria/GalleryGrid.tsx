"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { GalleryPhoto } from "@/lib/gallery/photos";

const filtros = [
  { value: "todas", label: "Todo PISÁO" },
  { value: "comida", label: "Sabores" },
  { value: "terraza", label: "Terraza" },
] as const;

export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [filtro, setFiltro] =
    useState<(typeof filtros)[number]["value"]>("todas");

  const visibles =
    filtro === "todas" ? photos : photos.filter((p) => p.categoria === filtro);

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 border-y border-pisao-gold/10 bg-pisao-carbon/90 px-4 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-full sm:border sm:px-5">
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filtros.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltro(f.value)}
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
            {visibles.length} fotografías
          </span>
        </div>
      </div>

      <div className="mt-8 columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {visibles.map((photo, index) => (
          <a
            key={photo.slug}
            href={`/gallery/${photo.file}`}
            target="_blank"
            rel="noreferrer"
            className="group mb-3 block break-inside-avoid overflow-hidden rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft sm:mb-4"
          >
            <div
              className="relative overflow-hidden"
              style={{ aspectRatio: photo.width / photo.height }}
            >
              <Image
                src={`/gallery/${photo.file}`}
                alt={photo.alt}
                fill
                priority={index < 2}
                sizes="(min-width: 1024px) 24vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition duration-700 group-hover:scale-[1.035]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute right-0 bottom-0 left-0 translate-y-2 p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <p className="text-xs leading-relaxed font-medium text-pisao-cream">
                  {photo.alt}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
