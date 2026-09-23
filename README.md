# PISÁO Gastrobar — pisaogastrobar.com

Sitio web de PISÁO Gastrobar (Módulo TR4, Terraza Panorámica, C.C. Mall Plaza
Cartagena): vitrina de marca, canal transaccional (pedidos, reservas, pagos)
y panel administrativo.

## Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Backend:** API routes de Next.js
- **Base de datos:** PostgreSQL vía Prisma ORM
- **Autenticación admin:** NextAuth (Auth.js v5), roles `ADMIN` / `CAJERO` / `COCINA`
- **Estado del carrito:** Zustand con persistencia local
- **Producción canónica:** Render (Next.js + API routes) + Render PostgreSQL

## Producción canónica

PISÁO mantiene una sola ruta de producción:

```text
GitHub: VladPhil92/pisao-gastrobar (main)
        |
        v
Render Web Service: pisao-gastrobar
        |
        +--> https://pisaogastrobar.com
        +--> https://www.pisaogastrobar.com
        |
        v
Render PostgreSQL: pisao-gastrobar-db
```

El repositorio `VladPhil92/pisao-gastrobar` es la única fuente de verdad para producción.
No se debe crear ni mantener un segundo deployment productivo de este repositorio en Vercel
u otro proveedor salvo una migración deliberada. El repositorio histórico `PISAO-WEB`
quedó sustituido por este repositorio y no debe recibir nuevo desarrollo.

Antes de un cambio de infraestructura se debe validar `/api/health?strict=1`, reservas,
panel administrativo, Concierge, menú y assets públicos desde el dominio canónico.


## Estructura del proyecto

```
app/
  (site)/            Rutas públicas (usan Header/Footer/WhatsApp/Carrito)
    page.tsx          Inicio
    nosotros/
    menu/              Menú + ficha de producto ([slug])
    pedidos/           Checkout (carrito → entrega → pago → confirmación)
    reservas/
    eventos/           Listado + detalle ([slug])
    cripto-beneficios/
    galeria/
    contacto/
    legal/
  admin/
    login/             Login del panel (Credentials + NextAuth)
    (protected)/        Rutas protegidas por sesión + rol
      dashboard/ pedidos/ menu/ reservas/ reportes/
  api/
    auth/[...nextauth]/     Handlers de NextAuth
    pedidos/                Crear pedido (POST) / consultar (GET [id])
    reservas/               Crear reserva
    pagos/qr/comprobante/   Subida de comprobante de transferencia
    pagos/cripto/webhook/   Webhook del gateway cripto
    pagos/tarjeta/webhook/  Webhook único (Wompi/PayU/ePayco vía conector)
    admin/pedidos/[id]/verificar/  Aprobar/rechazar pago QR (staff)
components/
  layout/     Header sticky, Footer, WhatsAppButton
  cart/       CartDrawer
  menu/       MenuCard, CategoryFilter
  checkout/   CheckoutSteps, CheckoutWizard, steps/ (uno por método de pago)
  admin/      AdminSidebar, VerificarPagoButtons, SignOutButton
  ui/         Button, Container, PageHero
lib/
  cart/       Store de carrito (Zustand)
  orders/     Cálculo de totales + creación de pedidos
  payments/
    types.ts             Contrato común (CardPaymentProvider)
    providers/            Wompi / PayU / ePayco — intercambiables por env var
    crypto.ts             Gateway cripto + descuento automático configurable
    qr-transferencia.ts   Datos bancarios / QR
  auth/       Config de NextAuth + roles del panel
  prisma.ts   Cliente Prisma singleton
prisma/
  schema.prisma   Usuario, Categoria, Producto, Pedido, ItemPedido, Pago, Reserva, Evento
  seed.ts         Usuario admin + categorías/producto de ejemplo
```

## Métodos de pago

### Operación vigente — septiembre de 2026

El checkout productivo acepta **QR oficial de PISÁO, Llave Bre-B y transferencia
directa a Bancolombia**. El beneficiario mostrado es **Grupo PISÁO Food & Drinks
S.A.S.** El QR oficial está versionado en `public/QR/QRTransferencia.jpeg`.

Flujo:

1. El cliente crea el pedido y ve el QR/datos de transferencia.
2. Realiza el pago y carga una imagen o PDF del comprobante.
3. El backend valida tipo, firma real del archivo, tamaño y SHA-256.
4. La evidencia se persiste en Render PostgreSQL; nunca en el filesystem efímero.
5. El equipo de pagos recibe el resumen en el canal configurado. Sin API externa,
   la web abre WhatsApp al **+57 318 642 8218** con el mensaje prellenado.
6. ADMIN/CAJERO abre la evidencia desde `/admin/pedidos` y aprueba o rechaza.
7. Solo al aprobar, el pedido pasa a `CONFIRMADO`.

El backend admite además un webhook de automatización y Meta WhatsApp Cloud API.
Si cualquiera se configura, el comprobante puede notificarse automáticamente sin
depender del click-to-chat.

### Métodos futuros

- **Tarjeta / PSE:** código preparado detrás de feature flags; permanece bloqueado
  hasta habilitar la pasarela productiva.
- **Criptomonedas:** permanece bloqueado por feature flag mientras no se habilite
  expresamente una integración productiva.

Los endpoints también aplican las feature flags en servidor, por lo que ocultar el
método en UI no es la única barrera.

## Revenue Attribution & AI Sales Intelligence

Los pedidos nuevos pueden enlazarse a la sesión first-party efímera de Behavioral
Intelligence. El navegador únicamente envía el `sessionId`; el backend consulta
`eventos_analiticos` y resuelve qué asistencias ocurrieron antes del pedido dentro
de una ventana de 12 horas.

Superficies observadas:

- `CONCIERGE` — interacción/propuesta/acción de PISÁO Concierge.
- `PLAN` — Modo Plan.
- `VISUAL_TABLE` — Mesa Visual.
- `WHATSAPP` — intención o handoff hacia WhatsApp.

La relación se guarda en `revenue_attributions`. Es **multi-touch y descriptiva**:
una asistencia significa que la superficie participó en el recorrido, no que haya
causado la venta. Los pedidos históricos no se reconstruyen retrospectivamente.

`/admin/reportes` muestra ingreso pagado asistido, ingreso asociado al Concierge,
ticket promedio asistido vs. directo, cobertura de atribución y desglose multi-touch.
Revenue IA recibe estas métricas con la misma advertencia de no inferir causalidad.

### Integridad de precio

El backend no confía en el precio recibido desde el navegador. Antes de crear un
pedido vuelve a leer PostgreSQL, exige que cada producto exista y esté disponible,
y compara el precio vigente. Si la carta cambió, el checkout devuelve conflicto y
el cliente debe actualizar su mesa. Esto evita que ingresos y atribución se basen
en totales manipulados desde el frontend.

## Revenue Action Engine V2

La capa de atribución responde qué superficies participaron antes de una venta; el
Revenue Action Engine convierte esas señales en un ciclo comercial gobernado:

```text
OBSERVAR -> PROPONER -> APROBAR/RECHAZAR -> EJECUTAR -> MEDIR
```

El motor usa reglas determinísticas y muestras mínimas. No permite que el modelo
genere por sí solo una mutación de negocio. Las propuestas se persisten en
`revenue_actions` con evidencia, prioridad, riesgo, métrica objetivo, responsable
de decisión, responsable de ejecución y resultado observado.

Acciones implementadas:

- `FEATURE_PRODUCT`: propone destacar un producto con ventas pagadas suficientes.
  Tras aprobación ADMIN, el sistema puede marcarlo `destacado=true` sin tocar
  precio, disponibilidad o descuentos.
- `CONCIERGE_PAIRING`: detecta combinaciones que aparecen juntas en pedidos
  pagados. Tras aprobación y ejecución, Concierge puede usar esa afinidad como
  sugerencia contextual durante 30 días. Nunca crea promociones ni descuentos.
- `PAYMENT_FRICTION_REVIEW`, `RESERVATION_FRICTION_REVIEW` y
  `ATTRIBUTION_COVERAGE_REVIEW`: acciones operativas que requieren intervención
  humana.
- `CONCIERGE_DISCOVERY`: propone una prueba controlada cuando el ticket observado
  en sesiones asistidas supera al de sesiones directas con muestra mínima; la
  diferencia se trata como asociación, no como causalidad.

El centro operativo está en `/admin/acciones`. Solo ADMIN puede generar, aprobar,
rechazar, ejecutar o actualizar mediciones.

La medición posterior registra resultados observados después de ejecutar acciones
de producto/maridaje, pero los etiqueta expresamente como
`observed_after_execution_not_causal`. Esto evita atribuir incremento a una
acción sin experimento o grupo de control.

## Revenue Experimentation & Next Best Action V3

PISÁO puede convertir una acción de maridaje ya aprobada y ejecutada en un
experimento controlado antes de adoptarla como política comercial general.

Diseño actual:

```text
Revenue Action ejecutada
        |
        v
Experimento DRAFT
        |
        v
ADMIN inicia prueba
        |
        +--> CONTROL
        |
        +--> TREATMENT -> Next Best Action contextual
        |
        v
Revenue Attribution enlaza pagos aprobados
        |
        v
Conversión pagada + ticket + afinidad de cesta
        |
        v
Resultado: muestra insuficiente / inconcluso / treatment superior / control superior
```

La unidad experimental es la `sessionId` first-party efímera ya usada por
Behavioral Intelligence y Revenue Attribution. La asignación es estable por sesión
y se persiste en `revenue_experiment_assignments`; no contiene nombre, teléfono,
correo ni transcript.

Reglas de gobierno:

- Split por defecto 50/50.
- Mínimo 30 sesiones asignadas por grupo antes de interpretar dirección.
- Solo un experimento Concierge puede estar `RUNNING` al mismo tiempo.
- CONTROL nunca recibe la regla experimental.
- TREATMENT solo recibe la Next Best Action cuando el turno es elegible.
- Se registran elegibilidad y exposición para auditar contaminación.
- Precio, descuento, inventario, disponibilidad y pagos siguen fuera de la
  autoridad experimental.
- Un maridaje bajo experimento queda fuera del playbook general.
- Tras completar la prueba, solo vuelve al playbook general si la muestra está
  lista y el resultado guardado es `TREATMENT_OBSERVED_HIGHER`.
- Un resultado inconcluso o favorable a control no se promociona automáticamente.

La métrica primaria es conversión pagada por sesión asignada
(intention-to-treat). El ticket promedio y la frecuencia del par son métricas
secundarias. El panel muestra un intervalo normal aproximado del 95% para la
diferencia de conversión; esto no sustituye revisión estadística cuando el volumen
o la decisión económica sea material.

El laboratorio administrativo está en `/admin/experimentos`. Allí ADMIN puede
preparar experimentos desde acciones ejecutadas, iniciar, pausar, medir y cerrar
una prueba. Gerencia IA y Revenue IA reciben los resultados con reglas explícitas
para no convertir correlaciones observacionales en afirmaciones causales.

## Recipe & Inventory Intelligence V6

V6 extiende la rentabilidad V5 desde producto terminado hacia insumos y recetas,
manteniendo una separación estricta entre **conteo físico**, **consumo teórico**
y **decisiones comerciales**.

- `/admin/inventario` es ADMIN-only y concentra insumos, conteos, movimientos
  físicos, costos de compra, stock mínimo y recetario.
- Los insumos usan una unidad base explícita: `GRAMO`, `MILILITRO` o
  `UNIDAD`. V6 no hace conversiones implícitas entre unidades.
- El costo por unidad base se deriva únicamente cuando existen costo y cantidad
  de compra válidos. Los costos faltantes siguen siendo desconocidos.
- Cada receta especifica cantidad por producto y porcentaje de merma. El costo
  teórico solo se publica internamente cuando toda la receta tiene cobertura de
  costos.
- El stock físico solo cambia mediante movimientos ADMIN auditables:
  `CONTEO`, `ENTRADA`, `SALIDA`, `MERMA` o `AJUSTE`.
- Cada movimiento conserva stock anterior, stock posterior, delta, motivo,
  usuario y fecha.
- Los pedidos `ENTREGADO` alimentan una señal de consumo teórico para estimar
  demanda diaria y días de cobertura. Esa señal **no descuenta stock**.
- `Producto.inventarioBajoReceta` se calcula a partir del conteo actual,
  stock mínimo y receta. Se mantiene separado de `inventarioBajo`, que sigue
  siendo la decisión manual de V5.
- Carta, Modo Plan, Concierge, Revenue Action Engine y políticas adaptativas
  usan como guardrail proactivo el riesgo efectivo
  `inventarioBajo || inventarioBajoReceta`.
- Un producto con riesgo puede seguir comprándose directamente si
  `disponible=true`; V6 evita empujarlo proactivamente.
- V6 no crea órdenes de compra, no modifica precios, no altera automáticamente
  el costo manual V5 y no tiene autoridad autónoma de abastecimiento.

Esta fase crea la infraestructura necesaria para una futura conciliación entre
consumo teórico y stock físico. El descuento automático de insumos por producción
debe ser idempotente y vincularse a un evento operacional explícito antes de
activarse.

## Profit-Aware Revenue Optimization V5

V5 agrega una capa financiera y operativa sobre V2–V4 sin convertir PISÁO en un
ERP ficticio. La unidad económica inicial es el producto terminado.

- `Producto.costoUnitario` es opcional y solo lo configura ADMIN.
- Ningún costo faltante se estima o inventa.
- Cada `ItemPedido` guarda `costoUnitarioSnapshot` al crear el pedido, usando
  exclusivamente el costo vigente del catálogo en servidor.
- Los pedidos anteriores o ítems sin snapshot quedan fuera de las métricas de
  contribución; nunca se extrapola rentabilidad sobre cobertura incompleta.
- `disponible=false` sigue siendo el hard gate de venta.
- `inventarioBajo=true` permite venta directa pero bloquea merchandising y
  Next Best Actions proactivas.
- Una política adaptativa activa se pausa automáticamente si cualquiera de sus
  productos deja de estar disponible o pasa a inventario bajo.
- La reactivación después de una pausa de inventario vuelve a exigir una acción
  explícita de ADMIN.
- El margen de contribución solo es un ajuste secundario de ranking. Relevancia
  contextual, evidencia experimental y guardrails conservan prioridad.
- V5 no puede cambiar precio, costo, descuento, disponibilidad, inventario ni
  pagos por decisión autónoma de la IA.

La consola de costos y disponibilidad vive en `/admin/menu`. El centro de
políticas `/admin/politicas` muestra, cuando hay snapshots completos, margen
de contribución observado por SERVE y HOLDOUT.

La primera versión de inventario es deliberadamente operativa a nivel de
producto. Recetas, insumos, rendimientos, mermas y stock por ingrediente quedan
fuera de V5 y deben incorporarse en una fase posterior antes de automatizar
abastecimiento o producción.

## Adaptive Revenue Optimization V4

V4 promueve únicamente experimentos V3 completados con `sampleReady=true` e
`interpretation=TREATMENT_OBSERVED_HIGHER` a políticas adaptativas de
producción.

```text
Revenue Action aprobada
        |
        v
Experimento V3 CONTROL / TREATMENT
        |
        v
Resultado favorable + muestra suficiente
        |
        v
Política V4 DRAFT
        |
        v
ADMIN activa
        |
        +--> 90% SERVE -> Next Best Action contextual
        |
        +--> 10% HOLDOUT -> comportamiento normal
        |
        v
Pagos aprobados + Revenue Attribution
        |
        v
Guardrail periódico
        |
        +--> saludable / inconcluso -> continúa
        |
        +--> daño con IC 95% más allá del margen -> AUTO ROLLBACK
```

Principios de seguridad y gobierno:

- La activación inicial sigue requiriendo un ADMIN.
- Solo pueden existir hasta tres políticas `ACTIVE` al mismo tiempo.
- La selección contextual usa intención del turno, coincidencia con productos,
  lift experimental previo y prioridad de la acción.
- La asignación `SERVE/HOLDOUT` es estable por sesión first-party.
- El holdout se preserva incluso después de promover una política para detectar
  degradación en producción.
- El guardrail se evalúa como máximo una vez cada 15 minutos por política cuando
  existe tráfico.
- Antes de interpretar daño exige al menos 40 sesiones SERVE y 20 HOLDOUT.
- El rollback automático se dispara solo cuando el límite superior del intervalo
  normal aproximado del 95% para la diferencia de conversión está por debajo de
  -2 puntos porcentuales.
- Un rollback retira la política del Concierge y la mantiene fuera del playbook
  general.
- Un experimento V3 elegible tiene precedencia sobre V4 para evitar contaminación
  entre capas.
- V4 nunca obtiene autoridad sobre precio, descuento, reembolso, inventario,
  disponibilidad ni pagos.
- Kev recibe eventos de observación del ciclo de políticas, pero continúa sin
  autoridad de mutación.

El centro administrativo está en `/admin/politicas`, donde ADMIN puede preparar
políticas desde experimentos exitosos, activar, pausar, medir y ejecutar rollback
manual. El motor también puede ejecutar rollback automático por guardrail.

La métrica de seguridad principal es conversión pagada por sesión elegible. El
holdout continuo es un mecanismo de monitoreo de producción y no debe tratarse
como sustituto del experimento A/B fijo original: la selección contextual y los
cambios en composición de tráfico pueden limitar la interpretación causal.

## Instalación

### Requisitos

- Node.js 20+
- Una base de datos PostgreSQL (local o gestionada)

### Pasos

```bash
npm install
cp .env.example .env   # completa las variables (ver abajo)

# Aplica el schema y genera el cliente de Prisma
npm run db:migrate

# (opcional) crea un usuario admin y datos de ejemplo
npm run db:seed

npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El panel administrativo
está en `/admin/login`.

> El sitio público (menú, home, etc.) usa datos de ejemplo en
> `lib/menu/placeholder-data.ts` y `lib/eventos/placeholder-data.ts` cuando
> no hay base de datos conectada, para poder desarrollar la interfaz sin
> depender de Postgres. Las páginas de `/admin` sí requieren
> `DATABASE_URL` para mostrar datos reales.

## Variables de entorno

Ver [`.env.example`](./.env.example) para la lista completa y comentada.
Resumen por categoría:

| Categoría            | Variables                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Base de datos        | `DATABASE_URL`                                                                                                                     |
| Auth (panel admin)   | `AUTH_SECRET`, `NEXTAUTH_URL`, `SEED_ADMIN_PASSWORD`                                                                               |
| Pasarela de tarjeta  | `PAYMENT_GATEWAY_PROVIDER`, `WOMPI_*`, `PAYU_*`, `EPAYCO_*`                                                                        |
| Gateway cripto       | `CRYPTO_GATEWAY_PROVIDER`, `CRYPTO_GATEWAY_API_KEY`, `CRYPTO_GATEWAY_WEBHOOK_SECRET`, `CRYPTO_DISCOUNT_PERCENTAGE`                 |
| QR / transferencia   | `NEXT_PUBLIC_BANK_TRANSFER_*`, `PAYMENT_ADMIN_WHATSAPP_NUMBER`                                                                    |
| Automatización pago  | `PAYMENT_ADMIN_NOTIFICATION_*`, `WHATSAPP_CLOUD_*`                                                                                 |
| Integraciones        | `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL`, `NEXT_PUBLIC_INSTAGRAM_TOKEN`, `NEXT_PUBLIC_GA_MEASUREMENT_ID` |

No se usan claves ni credenciales reales en este repositorio: todos los
valores en `.env.example` son placeholders.

## Scripts

| Comando              | Descripción                                |
| -------------------- | ------------------------------------------ |
| `npm run dev`        | Servidor de desarrollo                     |
| `npm run build`      | Build de producción                        |
| `npm run lint`       | ESLint                                     |
| `npm run format`     | Prettier (con orden de clases Tailwind)    |
| `npm run db:migrate` | Aplica migraciones de Prisma en desarrollo |
| `npm run db:seed`    | Crea usuario admin + datos de ejemplo      |
| `npm run db:studio`  | Abre Prisma Studio                         |

## Diseño

La paleta (`app/globals.css`, tokens `--color-pisao-*`) y el logo
(`public/brand/`) corresponden al manual de identidad oficial de PISÁO —
Negro Carbón, Madera Tostada, Dorado Atardecer, Verde Plátano y Arena
Caribe, con Playfair Display para títulos y Montserrat para cuerpo. El
detalle completo (hex exactos, uso de cada asset) está documentado en
[`docs/brand/BRAND.md`](./docs/brand/BRAND.md). El logo entregado es un
PNG rasterizado, no un vector; si el cliente provee un `.svg`/`.ai`,
reemplazar los archivos en `public/brand/` manteniendo los mismos nombres.

## Pendiente de integración real (fuera de alcance de este scaffold)

- Credenciales y lógica de firma completas de Wompi/PayU/ePayco y del
  gateway cripto elegido.
- Migrar comprobantes desde PostgreSQL a object storage cuando el volumen lo justifique.
- Feed de Instagram y Google Analytics.
- Contenido final (fotografía, textos de marca, menú real).
