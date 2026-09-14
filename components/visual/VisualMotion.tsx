"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("pisao-reveal", visible && "is-visible", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export interface MarqueePhoto {
  src: string;
  alt: string;
  label: string;
}

export function ImageMarquee({ photos }: { photos: MarqueePhoto[] }) {
  const items = [...photos, ...photos];

  return (
    <div className="pisao-marquee-shell" aria-label="Selección visual de PISÁO">
      <div className="pisao-marquee-track">
        {items.map((photo, index) => (
          <div
            key={`${photo.src}-${index}`}
            className="group relative h-44 w-56 shrink-0 overflow-hidden rounded-[1.5rem] border border-pisao-gold/10 bg-pisao-noche sm:h-56 sm:w-72"
            aria-hidden={index >= photos.length}
          >
            <Image
              src={photo.src}
              alt={index < photos.length ? photo.alt : ""}
              fill
              sizes="(min-width: 640px) 288px, 224px"
              className="object-cover transition duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent" />
            <p className="font-display absolute right-5 bottom-4 left-5 text-xl text-pisao-cream sm:text-2xl">
              {photo.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
