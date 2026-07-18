"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-pisao-carbon border-pisao-gold/20 relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl border p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="text-pisao-cream-muted hover:text-pisao-cream absolute top-3 right-3"
        >
          <X className="h-5 w-5" />
        </button>
        {title && (
          <h3 className="font-display text-pisao-cream mb-4 pr-8 text-lg">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
