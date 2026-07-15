import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases y resuelve conflictos de Tailwind (ej. un componente
 * que ya trae `inline-flex` en su base y un consumidor que necesita
 * pisarlo con `hidden sm:inline-flex`). Sin twMerge, ambas clases
 * conviven en el HTML y gana la que Tailwind generó después en el CSS
 * final — no necesariamente la que aparece última en el className.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = "COP") {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

const DIACRITICS_REGEX = /[̀-ͯ]/g;

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
