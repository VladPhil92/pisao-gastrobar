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
- **Hosting objetivo:** Vercel (frontend) + Postgres gestionado (Supabase / Neon / Railway)

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

## Métodos de pago (checkout abstraído por proveedor)

El checkout (`/pedidos`) tiene 3 métodos, cada uno como paso independiente:

1. **QR / Transferencia bancaria** — se muestran los datos de la cuenta y un
   QR; el cliente sube una imagen/PDF como evidencia. El pedido queda en
   `PENDIENTE_VERIFICACION` hasta que un admin/cajero lo aprueba o rechaza
   desde `/admin/pedidos`.
2. **Criptomonedas** — aplica un descuento automático configurable
   (`CRYPTO_DISCOUNT_PERCENTAGE`), muestra la dirección/checkout del gateway
   y se confirma por estado on-chain vía webhook; el `txHash` queda
   asociado al pedido.
3. **Tarjeta crédito/débito** — genera un link de pago con el proveedor
   activo (`PAYMENT_GATEWAY_PROVIDER=WOMPI|PAYU|EPAYCO`). Todo el resto del
   código depende únicamente de la interfaz `CardPaymentProvider`
   (`lib/payments/types.ts`), así que cambiar de pasarela es solo cuestión
   de variables de entorno.

Ningún conector tiene credenciales reales ni lógica de firma/checkout
completa: son implementaciones de referencia con `TODO`s explícitos donde
va la integración real de cada API.

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
| QR / transferencia   | `BANK_TRANSFER_*`                                                                                                                  |
| Comprobantes de pago | `UPLOADS_*` (bucket externo; el filesystem de Vercel es efímero)                                                                   |
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
- Subida de comprobantes a un bucket real (`lib/uploads/evidencia.ts`).
- Feed de Instagram y Google Analytics.
- Contenido final (fotografía, textos de marca, menú real).
