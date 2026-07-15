import type { SVGProps } from "react";

/**
 * lucide-react no incluye logos de marcas (Instagram, Facebook, etc.) por
 * motivos de licenciamiento; se definen aquí como SVG inline minimalistas.
 */
export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      {...props}
    >
      <path d="M15 8h2V4h-2a4 4 0 0 0-4 4v2H9v4h2v6h3v-6h2.2l.8-4H14V8a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
