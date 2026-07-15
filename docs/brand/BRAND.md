# Manual de identidad de PISÁO — La Casa del Patacón

Fuente: manual de marca compartido por el cliente (ver `manual-paleta-colores.png`
y `manual-tipografia.png` en esta carpeta). Estos son los valores **oficiales**;
`app/globals.css` los implementa como tokens `--color-pisao-*` y no deben
divergir de aquí.

## Logo

- `public/brand/pisao-logo.png` — lockup completo (palma + "PISÁO" +
  "La Casa del Patacón"), fondo transparente. Pensado para fondos oscuros.
- `public/brand/pisao-mark.png` — solo la palma, recortada del lockup
  original, para usos compactos (ej. junto al wordmark en el header).
- `app/favicon.ico` / `public/brand/pisao-icon-512.png` — generados desde
  la palma sobre fondo Negro Carbón.

El archivo entregado es un PNG rasterizado, no un vector. Si el cliente
provee un `.svg` o `.ai` del logo, reemplazar estos archivos manteniendo
los mismos nombres.

## Paleta de colores

| Nombre           | Hex       | Uso                                         | Token CSS                   |
| ---------------- | --------- | ------------------------------------------- | --------------------------- |
| Verde Plátano    | `#5A6F2E` | Frescura, naturaleza, tradición             | `--color-pisao-green`       |
| Arena Caribe     | `#E8DFC5` | Calidez, tierra, hospitalidad (texto claro) | `--color-pisao-cream`       |
| Dorado Atardecer | `#C79A3A` | Pasión, energía, sabor (acento/CTA)         | `--color-pisao-gold`        |
| Negro Carbón     | `#111111` | Fuerza, elegancia, profundidad (fondo)      | `--color-pisao-carbon`      |
| Madera Tostada   | `#3A2A1A` | Artesanal, rústico, acogedor (superficies)  | `--color-pisao-carbon-soft` |

Tonos derivados (no vienen del manual, calculados para estados hover/muted):

- `--color-pisao-gold-light` — variante clara de Dorado Atardecer.
- `--color-pisao-gold-dark` — variante oscura de Dorado Atardecer.
- `--color-pisao-cream-muted` — Arena Caribe atenuado, para texto secundario.

## Tipografía

- **Playfair Display** — tipografía principal (títulos, logotipo).
- **Montserrat** — tipografía secundaria (cuerpo, menús, UI).

Implementadas vía `next/font/google` en `app/layout.tsx` y expuestas como
`--font-display` / `--font-sans` en `app/globals.css`.
