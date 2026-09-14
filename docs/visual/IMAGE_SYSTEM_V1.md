# PISÁO — Image System & Visual Language v1

## Objetivo
Usar la fotografía como herramienta de conversión y marca, no como decoración. Cada imagen debe cumplir una función comercial clara: provocar antojo, explicar producto, mostrar experiencia o reforzar identidad.

## Proporciones
- Hero / cabeceras: 16:9 o composición editorial responsive.
- Cards de producto: 4:5.
- Detalle de producto: 4:5.
- Galería: mezcla controlada de 4:5, 1:1 y 16:9.
- Campañas verticales: 9:16.

## Reglas de carga
- `priority` solo para la imagen LCP o una visual crítica por página.
- El resto de imágenes deben usar carga diferida por defecto mediante `next/image`.
- Declarar siempre `sizes` de acuerdo con el layout real.
- Mantener `object-cover` y un contenedor con proporción fija para evitar layout shift.
- No duplicar archivos para cada viewport: el pipeline de `scripts/optimize-images.mjs` genera variantes WebP estáticas.

## Tratamiento editorial
- Producto: encuadre cerrado, comida dominante, sin texto sobre la foto original.
- Ambiente: terraza, mesa, personas o bebidas; nunca sustituye la foto específica de un producto.
- Cuando falta fotografía de producto, usar `MenuImageFallback`: pieza de marca explícitamente identificada como imagen editorial en preparación. No usar una foto de otro plato como sustituto.
- Evitar el texto visible “Sin imagen”.

## Jerarquía de marca
- Negro carbón y noche como base.
- Dorado solo para señales de valor: badges, precio, CTA y microtítulos.
- Playfair / `font-display` para titulares y nombres de productos.
- Montserrat / `font-sans` para información funcional.
- Cards con esquinas amplias y borde dorado de baja opacidad.

## Copy visual
- Hablar desde el antojo y la experiencia, no desde la interfaz.
- Evitar frases meta como “navega”, “haz clic” o “esta web”.
- Mantener textos cortos, sensoriales y concretos.
- IA: experiencia cálida, pero siempre identificada como asistencia de IA cuando corresponda.

## Próxima evolución
1. Completar fotografía original de coctelería.
2. Registrar `object-position` por foto cuando el encuadre requiera ajuste fino.
3. Medir conversión y add-to-cart por producto para priorizar fotografía de los productos de mayor impacto.
4. Incorporar imágenes de ambiente y consumo real a reservas, eventos y home.
