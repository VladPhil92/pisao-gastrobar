# Kev Control Plane V1

PISÁO integra Kev mediante dos canales separados y gobernados.

## 1. PISÁO -> Kev: Governance Bridge

Los eventos operativos se envían a `KEV_GOVERNANCE_BRIDGE_URL` firmados con
`KEV_GOVERNANCE_BRIDGE_SECRET`.

Headers:

- `X-Pisao-Timestamp`
- `X-Pisao-Signature: sha256=<hmac>`

La firma usa `HMAC_SHA256(secret, timestamp + "." + rawBody)`.

## 2. Kev -> PISÁO: Advisory Ingress

Endpoint:

`POST /api/integrations/kev/recommendations`

Está deshabilitado por defecto. Requiere:

- `KEV_GOVERNANCE_INBOUND_ENABLED=true`
- `KEV_GOVERNANCE_INBOUND_SECRET` con mínimo 32 caracteres.

Headers:

- `X-Kev-Timestamp`: epoch seconds
- `X-Kev-Signature: sha256=<hmac>`

La firma usa `HMAC_SHA256(inboundSecret, timestamp + "." + rawBody)` y acepta
un desfase máximo de 5 minutos.

Payload:

```json
{
  "idempotency_key": "kev-unique-recommendation-id",
  "title": "Reforzar visibilidad de un producto",
  "rationale": "La señal operativa observada justifica una revisión comercial.",
  "recommended_action": "Validar la recomendación con gerencia antes de aplicarla.",
  "objective_metric": "paid_conversion_rate",
  "priority_score": 72,
  "risk_level": "MEDIUM",
  "evidence": {
    "sampleSize": 48,
    "sourceWindow": "7d"
  }
}
```

El endpoint **no ejecuta cambios**. Crea una `RevenueAction` con tipo
`KEV_ADVISORY`, estado `PENDING` y modo `MANUAL`. La administración decide
aprobar o rechazar desde `/admin/acciones`.

## 3. Control Plane

`/admin/kev` muestra:

- estado del bridge;
- entregas exitosas y fallidas;
- propuestas entrantes;
- capacidades activas;
- evidencia técnica reciente.

`GET /api/admin/kev/status` expone la misma fotografía a administradores autenticados.

## Principio de seguridad

Kev puede observar, analizar y proponer. La ejecución sensible continúa bajo control
humano y las credenciales nunca se exponen al cliente.
