"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function SpatialExperience() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const updateScrollProgress = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollable = Math.max(
          1,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
        root.style.setProperty("--pisao-scroll-progress", progress.toFixed(4));
      });
    };

    const updatePointer = (event: PointerEvent) => {
      if (!finePointer.matches || reducedMotion.matches) return;
      root.style.setProperty("--pisao-pointer-x", `${event.clientX}px`);
      root.style.setProperty("--pisao-pointer-y", `${event.clientY}px`);
    };

    updateScrollProgress();
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("resize", updateScrollProgress, { passive: true });
    window.addEventListener("pointermove", updatePointer, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("resize", updateScrollProgress);
      window.removeEventListener("pointermove", updatePointer);
    };
  }, [pathname]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[35]" aria-hidden="true">
      <div className="pisao-spatial-glow absolute inset-0" />
      <div className="pisao-scroll-progress absolute inset-x-0 top-0 h-px bg-pisao-gold shadow-[0_0_18px_rgba(199,154,58,.55)]" />
    </div>
  );
}
