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
