"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { GalleryPhoto } from "@/lib/gallery/photos";

const filtros = [
  { value: "todas", label: "Todas" },
  { value: "comida", label: "Comida" },
  { value: "terraza", label: "Terraza" },
] as const;

export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [filtro, setFiltro] =
    useState<(typeof filtros)[number]["value"]>("todas");

  const visibles =
    filtro === "todas" ? photos : photos.filter((p) => p.categoria === filtro);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFiltro(f.value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              filtro === f.value
                ? "border-pisao-gold bg-pisao-gold text-pisao-carbon"
                : "border-pisao-gold/30 text-pisao-cream-muted hover:border-pisao-gold",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visibles.map((photo) => (
          <a
            key={photo.slug}
            href={`/gallery/${photo.slug}.jpg`}
            target="_blank"
            rel="noreferrer"
            className="group bg-pisao-carbon-soft relative block aspect-square overflow-hidden rounded-lg"
          >
            <Image
              src={`/gallery/${photo.slug}.jpg`}
              alt={photo.alt}
              fill
              sizes="(min-width: 1024px) 24vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
