# PISÁO WhatsApp Core V1

## Objetivo

Conectar WhatsApp Business Platform con el PISÁO Concierge existente sin duplicar
la lógica de IA. El webhook recibe eventos de Meta, valida la firma, deriva una
identidad anónima estable por remitente y reutiliza el endpoint actual del Concierge.

## Endpoint

```text
GET/POST https://pisaogastrobar.com/api/whatsapp/webhook
```

- `GET`: handshake de verificación de Meta mediante
  `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- `POST`: exige `X-Hub-Signature-256` válida usando
  `WHATSAPP_META_APP_SECRET`.
- El procesamiento del Concierge se agenda con `after()` para responder a Meta
  inmediatamente y evitar reintentos por latencia de OpenAI.

## Variables de entorno

```text
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_META_APP_SECRET=
WHATSAPP_WEBHOOK_ENABLED=false
WHATSAPP_CLOUD_API_TOKEN=
WHATSAPP_CLOUD_PHONE_NUMBER_ID=
WHATSAPP_CLOUD_GRAPH_VERSION=v25.0
```

Mantener `WHATSAPP_WEBHOOK_ENABLED=false` hasta que App Secret, token Cloud API y
Phone Number ID estén configurados. El handshake GET puede verificarse mientras el
flag está desactivado.

## Flujo

```text
Cliente -> WhatsApp -> Meta webhook -> /api/whatsapp/webhook
       -> PISÁO Concierge -> OpenAI/tools -> Cloud API -> Cliente
```

La identidad del remitente se transforma mediante HMAC; el adaptador no persiste el
número telefónico ni transcripciones nuevas.

## Limitaciones V1

- La conversación de texto e interacciones simples se enruta al Concierge.
- El estado estructurado ya existente del Concierge (perfil y comercio) se conserva
  con claves estables derivadas del remitente.
- Acciones que requieren confirmación visual en la web (carrito o confirmación final
  de reserva) se derivan temporalmente a pisaogastrobar.com. La ejecución
  transaccional completamente nativa dentro de WhatsApp queda para V2.
- El deduplicado de eventos es en memoria del proceso. La persistencia distribuida
  de idempotencia queda para V2/n8n si se habilitan varias instancias.

## Activación en Meta

1. Configurar la URL de devolución:
   `https://pisaogastrobar.com/api/whatsapp/webhook`.
2. Usar el mismo valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
3. Verificar y guardar.
4. Configurar `WHATSAPP_META_APP_SECRET`, `WHATSAPP_CLOUD_API_TOKEN` y
   `WHATSAPP_CLOUD_PHONE_NUMBER_ID` en Render.
5. Suscribir el campo `messages`.
6. Cambiar `WHATSAPP_WEBHOOK_ENABLED=true`.
7. Probar un mensaje entrante antes de publicar el flujo al público.
