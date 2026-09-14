# Visual Commerce V3 — Mesa Visual PISÁO

## Objetivo

Convertir la compra digital de PISÁO en una experiencia gastronómica visual, evitando el patrón genérico de catálogo + carrito. La interfaz debe ayudar al cliente a imaginar la mesa que está construyendo, mantener continuidad visual hasta el pago y reducir la fricción de decidir qué falta.

## Factor innovador: Mesa Visual

La Mesa Visual es una capa persistente de compra que aparece después de agregar el primer producto. Representa el pedido con fotografías reales y lo organiza en cuatro momentos simples:

1. Para compartir.
2. Plato fuerte.
3. Bebida.
4. Algo dulce.

El sistema no afirma que una combinación sea nutricionalmente completa ni usa IA para inventar maridajes. Detecta únicamente categorías ausentes y propone productos disponibles de la carta para completar la experiencia.

## Principios de diseño

- Fotografías reales antes que iconografía genérica.
- La acción principal cambia de “Agregar al carrito” a “A la mesa”.
- Cada card muestra si el producto ya está en la mesa y cuántas unidades hay.
- El carrito se presenta como “Tu mesa”, con miniaturas, cantidades y total visible.
- La composición visual continúa en checkout; no se pierde al avanzar al pago.
- La navegación de compra siempre permite volver a editar la mesa sin reiniciar el proceso.
- Las recomendaciones son determinísticas y basadas en categorías existentes.
- Productos sin foto usan el fallback editorial de marca; nunca se sustituye la foto de un producto por la de otro.

## Continuidad de estado

El checkout conserva una instantánea del carrito al crear el pedido. Esto evita que el resumen visual y el subtotal desaparezcan cuando el store se limpia después de generar el pedido, y mantiene coherentes los cálculos posteriores del flujo de pago.

## Performance

- Las miniaturas usan `next/image` con `sizes` pequeños y explícitos.
- La Mesa Visual reutiliza las imágenes optimizadas ya generadas por el pipeline existente.
- No se incorporan nuevas imágenes remotas, stock ni servicios de render dinámico.
- La interfaz permanece cliente-side sobre el store Zustand existente.

## Métricas recomendadas para fase analítica posterior

- Add-to-cart rate por producto.
- Aperturas de Mesa Visual por sesión.
- Productos sugeridos agregados desde Mesa Visual.
- Inicio de checkout / sesiones con carrito.
- Abandono por paso de checkout.
- Valor promedio del pedido antes y después de Mesa Visual.

## Seguridad comercial

Mesa Visual no inventa disponibilidad, promociones, descuentos, stock, ingredientes ni maridajes. El precio mostrado proviene del producto actualmente cargado en la carta y el total final sigue sujeto a las reglas del checkout y método de pago.
