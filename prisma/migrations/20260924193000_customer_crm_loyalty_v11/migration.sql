CREATE TABLE "crm_customer_profiles" (
  "id" TEXT NOT NULL,
  "identityKey" VARCHAR(220) NOT NULL,
  "nombre" VARCHAR(120) NOT NULL,
  "emailNormalized" VARCHAR(180),
  "phoneNormalized" VARCHAR(32),
  "source" VARCHAR(24) NOT NULL DEFAULT 'GUEST',
  "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accountClienteId" TEXT,

  CONSTRAINT "crm_customer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_customer_profiles_identityKey_key"
  ON "crm_customer_profiles"("identityKey");
CREATE UNIQUE INDEX "crm_customer_profiles_accountClienteId_key"
  ON "crm_customer_profiles"("accountClienteId");
CREATE INDEX "crm_customer_profiles_emailNormalized_idx"
  ON "crm_customer_profiles"("emailNormalized");
CREATE INDEX "crm_customer_profiles_phoneNormalized_idx"
  ON "crm_customer_profiles"("phoneNormalized");
CREATE INDEX "crm_customer_profiles_lastActivityAt_idx"
  ON "crm_customer_profiles"("lastActivityAt");

ALTER TABLE "crm_customer_profiles"
  ADD CONSTRAINT "crm_customer_profiles_accountClienteId_fkey"
  FOREIGN KEY ("accountClienteId") REFERENCES "clientes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pedidos" ADD COLUMN "customerProfileId" TEXT;
ALTER TABLE "reservas" ADD COLUMN "customerProfileId" TEXT;

CREATE INDEX "pedidos_customerProfileId_createdAt_idx"
  ON "pedidos"("customerProfileId", "createdAt");
CREATE INDEX "reservas_customerProfileId_fecha_idx"
  ON "reservas"("customerProfileId", "fecha");

ALTER TABLE "pedidos"
  ADD CONSTRAINT "pedidos_customerProfileId_fkey"
  FOREIGN KEY ("customerProfileId") REFERENCES "crm_customer_profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reservas"
  ADD CONSTRAINT "reservas_customerProfileId_fkey"
  FOREIGN KEY ("customerProfileId") REFERENCES "crm_customer_profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "customer_loyalty_entries" (
  "id" TEXT NOT NULL,
  "customerProfileId" TEXT NOT NULL,
  "eventKey" VARCHAR(180) NOT NULL,
  "event" VARCHAR(48) NOT NULL,
  "points" INTEGER NOT NULL,
  "amountCop" DECIMAL(12,2),
  "referenceType" VARCHAR(32),
  "referenceId" VARCHAR(96),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_loyalty_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_loyalty_entries_eventKey_key"
  ON "customer_loyalty_entries"("eventKey");
CREATE INDEX "customer_loyalty_entries_customerProfileId_createdAt_idx"
  ON "customer_loyalty_entries"("customerProfileId", "createdAt");
CREATE INDEX "customer_loyalty_entries_event_createdAt_idx"
  ON "customer_loyalty_entries"("event", "createdAt");

ALTER TABLE "customer_loyalty_entries"
  ADD CONSTRAINT "customer_loyalty_entries_customerProfileId_fkey"
  FOREIGN KEY ("customerProfileId") REFERENCES "crm_customer_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Cuentas PISÁO existentes: identidad primaria por correo normalizado.
INSERT INTO "crm_customer_profiles" (
  "id", "identityKey", "nombre", "emailNormalized", "phoneNormalized",
  "source", "lastActivityAt", "createdAt", "updatedAt", "accountClienteId"
)
SELECT
  'crm_' || md5('email:' || lower(trim(c."email"))),
  'email:' || lower(trim(c."email")),
  left(c."nombre", 120),
  lower(trim(c."email")),
  NULLIF(regexp_replace(COALESCE(c."telefono", ''), '[^0-9+]', '', 'g'), ''),
  'ACCOUNT',
  COALESCE(c."lastLoginAt", c."updatedAt", c."createdAt"),
  c."createdAt",
  CURRENT_TIMESTAMP,
  c."id"
FROM "clientes" c
ON CONFLICT ("identityKey") DO UPDATE SET
  "accountClienteId" = EXCLUDED."accountClienteId",
  "source" = 'ACCOUNT',
  "updatedAt" = CURRENT_TIMESTAMP;

-- Pedidos con correo.
INSERT INTO "crm_customer_profiles" (
  "id", "identityKey", "nombre", "emailNormalized", "phoneNormalized",
  "source", "lastActivityAt", "createdAt", "updatedAt"
)
SELECT DISTINCT ON (lower(trim(p."clienteEmail")))
  'crm_' || md5('email:' || lower(trim(p."clienteEmail"))),
  'email:' || lower(trim(p."clienteEmail")),
  left(p."clienteNombre", 120),
  lower(trim(p."clienteEmail")),
  NULLIF(regexp_replace(COALESCE(p."clienteTelefono", ''), '[^0-9+]', '', 'g'), ''),
  'ORDER',
  p."createdAt",
  p."createdAt",
  CURRENT_TIMESTAMP
FROM "pedidos" p
WHERE p."clienteEmail" IS NOT NULL AND trim(p."clienteEmail") <> ''
ORDER BY lower(trim(p."clienteEmail")), p."createdAt" DESC
ON CONFLICT ("identityKey") DO UPDATE SET
  "lastActivityAt" = GREATEST("crm_customer_profiles"."lastActivityAt", EXCLUDED."lastActivityAt"),
  "updatedAt" = CURRENT_TIMESTAMP;

-- Pedidos sin correo: identidad por teléfono.
INSERT INTO "crm_customer_profiles" (
  "id", "identityKey", "nombre", "phoneNormalized",
  "source", "lastActivityAt", "createdAt", "updatedAt"
)
SELECT DISTINCT ON (regexp_replace(p."clienteTelefono", '[^0-9+]', '', 'g'))
  'crm_' || md5('phone:' || regexp_replace(p."clienteTelefono", '[^0-9+]', '', 'g')),
  'phone:' || regexp_replace(p."clienteTelefono", '[^0-9+]', '', 'g'),
  left(p."clienteNombre", 120),
  regexp_replace(p."clienteTelefono", '[^0-9+]', '', 'g'),
  'ORDER',
  p."createdAt",
  p."createdAt",
  CURRENT_TIMESTAMP
FROM "pedidos" p
WHERE (p."clienteEmail" IS NULL OR trim(p."clienteEmail") = '')
  AND regexp_replace(p."clienteTelefono", '[^0-9+]', '', 'g') <> ''
ORDER BY regexp_replace(p."clienteTelefono", '[^0-9+]', '', 'g'), p."createdAt" DESC
ON CONFLICT ("identityKey") DO UPDATE SET
  "lastActivityAt" = GREATEST("crm_customer_profiles"."lastActivityAt", EXCLUDED."lastActivityAt"),
  "updatedAt" = CURRENT_TIMESTAMP;

-- Reservas con correo.
INSERT INTO "crm_customer_profiles" (
  "id", "identityKey", "nombre", "emailNormalized", "phoneNormalized",
  "source", "lastActivityAt", "createdAt", "updatedAt"
)
SELECT DISTINCT ON (lower(trim(r."email")))
  'crm_' || md5('email:' || lower(trim(r."email"))),
  'email:' || lower(trim(r."email")),
  left(r."nombre", 120),
  lower(trim(r."email")),
  NULLIF(regexp_replace(COALESCE(r."telefono", ''), '[^0-9+]', '', 'g'), ''),
  'RESERVATION',
  r."createdAt",
  r."createdAt",
  CURRENT_TIMESTAMP
FROM "reservas" r
WHERE r."email" IS NOT NULL AND trim(r."email") <> ''
ORDER BY lower(trim(r."email")), r."createdAt" DESC
ON CONFLICT ("identityKey") DO UPDATE SET
  "lastActivityAt" = GREATEST("crm_customer_profiles"."lastActivityAt", EXCLUDED."lastActivityAt"),
  "updatedAt" = CURRENT_TIMESTAMP;

-- Reservas sin correo: identidad por teléfono.
INSERT INTO "crm_customer_profiles" (
  "id", "identityKey", "nombre", "phoneNormalized",
  "source", "lastActivityAt", "createdAt", "updatedAt"
)
SELECT DISTINCT ON (regexp_replace(r."telefono", '[^0-9+]', '', 'g'))
  'crm_' || md5('phone:' || regexp_replace(r."telefono", '[^0-9+]', '', 'g')),
  'phone:' || regexp_replace(r."telefono", '[^0-9+]', '', 'g'),
  left(r."nombre", 120),
  regexp_replace(r."telefono", '[^0-9+]', '', 'g'),
  'RESERVATION',
  r."createdAt",
  r."createdAt",
  CURRENT_TIMESTAMP
FROM "reservas" r
WHERE (r."email" IS NULL OR trim(r."email") = '')
  AND regexp_replace(r."telefono", '[^0-9+]', '', 'g') <> ''
ORDER BY regexp_replace(r."telefono", '[^0-9+]', '', 'g'), r."createdAt" DESC
ON CONFLICT ("identityKey") DO UPDATE SET
  "lastActivityAt" = GREATEST("crm_customer_profiles"."lastActivityAt", EXCLUDED."lastActivityAt"),
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "pedidos" p
SET "customerProfileId" = cp."id"
FROM "crm_customer_profiles" cp
WHERE (
  p."clienteEmail" IS NOT NULL
  AND trim(p."clienteEmail") <> ''
  AND cp."identityKey" = 'email:' || lower(trim(p."clienteEmail"))
) OR (
  (p."clienteEmail" IS NULL OR trim(p."clienteEmail") = '')
  AND cp."identityKey" = 'phone:' || regexp_replace(p."clienteTelefono", '[^0-9+]', '', 'g')
);

UPDATE "reservas" r
SET "customerProfileId" = cp."id"
FROM "crm_customer_profiles" cp
WHERE (
  r."email" IS NOT NULL
  AND trim(r."email") <> ''
  AND cp."identityKey" = 'email:' || lower(trim(r."email"))
) OR (
  (r."email" IS NULL OR trim(r."email") = '')
  AND cp."identityKey" = 'phone:' || regexp_replace(r."telefono", '[^0-9+]', '', 'g')
);

-- Reconstruye actividad más reciente después del enlace.
UPDATE "crm_customer_profiles" cp
SET "lastActivityAt" = GREATEST(
  cp."lastActivityAt",
  COALESCE((SELECT MAX(p."createdAt") FROM "pedidos" p WHERE p."customerProfileId" = cp."id"), cp."lastActivityAt"),
  COALESCE((SELECT MAX(r."createdAt") FROM "reservas" r WHERE r."customerProfileId" = cp."id"), cp."lastActivityAt")
);

-- Fidelización histórica: 1 punto por cada COP 1.000 de pedidos entregados y pagados.
-- La redención queda deshabilitada en V11.
INSERT INTO "customer_loyalty_entries" (
  "id", "customerProfileId", "eventKey", "event", "points",
  "amountCop", "referenceType", "referenceId", "createdAt"
)
SELECT
  'loy_' || md5('order:' || p."id" || ':delivered'),
  p."customerProfileId",
  'order:' || p."id" || ':delivered',
  'ORDER_DELIVERED',
  GREATEST(floor(p."total" / 1000)::int, 1),
  p."total",
  'Pedido',
  p."id",
  COALESCE(p."entregadoAt", p."updatedAt")
FROM "pedidos" p
JOIN "pagos" pg ON pg."pedidoId" = p."id"
WHERE p."customerProfileId" IS NOT NULL
  AND p."estado" = 'ENTREGADO'
  AND pg."estado" = 'APROBADO'
ON CONFLICT ("eventKey") DO NOTHING;
