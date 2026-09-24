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


## V2 — Coexistence

PISÁO soporta el flujo de Embedded Signup para usuarios que ya operan el mismo
número en WhatsApp Business App.

### Principios

- No se llama `/{phone-number-id}/register` durante Coexistence.
- El token BISU que devuelve Embedded Signup se cifra con AES-256-GCM antes de
  persistirse.
- `smb_message_echoes` activa un handoff humano temporal para evitar que el
  Concierge responda encima de una persona que escribió desde la app.
- `history` y `smb_app_state_sync` se reconocen y se acusan, pero V2 no
  persiste historial de chats ni libreta de contactos. Esto reduce exposición
  de datos hasta que exista una necesidad operacional explícita.
- La idempotencia de mensajes y echoes se persiste en PostgreSQL.

### Admin

`/admin/whatsapp` muestra el estado de preparación y contiene el launcher de
Embedded Signup. El botón solo se habilita cuando existen:

```text
NEXT_PUBLIC_META_APP_ID
NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID
WHATSAPP_META_APP_SECRET
WHATSAPP_TOKEN_ENCRYPTION_KEY
```

### Embedded Signup

El launcher usa explícitamente:

```text
featureType = whatsapp_business_app_onboarding
sessionInfoVersion = 3
```

para solicitar el flujo de Coexistence. Al finalizar:

1. El navegador obtiene un authorization code.
2. Meta comunica el `waba_id` mediante el evento `WA_EMBEDDED_SIGNUP`.
3. El backend intercambia el code por un token de negocio.
4. Enumera el número de la WABA.
5. Suscribe la app a la WABA.
6. Cifra y persiste el token.
7. Cloud API pasa a usar estas credenciales antes del fallback por variables de entorno.

### Gate humano pendiente

Antes de lanzar Embedded Signup desde PISÁO, Meta debe habilitar la app como
Tech Provider/Embedded Signup y emitir un Configuration ID válido. El App Secret
se configura exclusivamente en Render y nunca se copia al navegador.


## V4 — Production Activation Gate

La activación de respuestas automáticas ya no depende de un redeploy de Render.

### Verificación

Desde `/admin/whatsapp`, un ADMIN o SUPER_ADMIN puede ejecutar
`Verificar conexión`. El backend valida, sin exponer secretos:

- Meta App ID;
- Meta App Secret server-side;
- webhook verify token;
- Token Vault;
- Embedded Signup Configuration ID;
- integración ACTIVE cifrada en PostgreSQL;
- acceso real de ese token al `Phone Number ID` mediante Graph API.

El resultado del probe persiste únicamente estado técnico y un código saneado.
Nunca se persisten tokens ni respuestas crudas de Meta.

### Activación

Solo SUPER_ADMIN puede activar o pausar el runtime. Al intentar activar, PISÁO
ejecuta nuevamente el probe; si falla cualquier gate, la activación se rechaza.

Una vez administrado desde el dashboard, el estado persistido reemplaza a
`WHATSAPP_WEBHOOK_ENABLED`. Para una parada de emergencia existe:

```text
WHATSAPP_WEBHOOK_FORCE_DISABLED=true
```

Ese kill switch server-side tiene prioridad sobre cualquier estado del panel.

### Certificación

El gate de producción de WhatsApp exige:

1. configuración servidor completa;
2. integración Meta ACTIVE;
3. probe exitoso contra Graph API;
4. runtime activado;
5. mensaje inbound procesado;
6. respuesta IA registrada.

Solo entonces el canal puede pasar a CERTIFICADA.


## V5 — Operations Console & Fail-safe

El backoffice de WhatsApp incorpora una consola operacional sin almacenar
transcripciones ni números de clientes.

### Telemetría persistente

Cada evento procesable mantiene exclusivamente:

- tipo de evento;
- estado `RECEIVED | PROCESSED | FAILED`;
- número de intentos;
- código técnico de fallo saneado;
- timestamps de recepción, procesamiento o fallo;
- Phone Number ID del activo comercial, no el número del cliente.

No se almacena el cuerpo del mensaje, el payload de Meta ni el teléfono del cliente.

### Auto-pausa

Los fallos de mensajes entrantes se cuentan dentro de una ventana deslizante.
Los defaults son:

```text
WHATSAPP_FAILURE_AUTOPAUSE_THRESHOLD=5
WHATSAPP_FAILURE_AUTOPAUSE_WINDOW_MINUTES=10
```

Al alcanzar el umbral, PISÁO pone `runtimeEnabled=false` automáticamente y
registra el momento y la razón del fail-safe. El SUPER_ADMIN debe revisar el
panel, corregir la causa, ejecutar `Verificar conexión` y reactivar el canal.

### Handoff humano

Las conversaciones se muestran mediante alias derivados del HMAC ya existente.
No se exponen teléfonos. ADMIN/SUPER_ADMIN pueden liberar manualmente un handoff
cuando el equipo termina la atención humana, permitiendo que el Concierge retome
el siguiente mensaje.

### Observabilidad

`/admin/whatsapp` muestra:

- eventos recibidos/procesados/fallidos en 24 h;
- fallos de los últimos 10 minutos;
- tasa de éxito;
- latencia p95 de procesamiento;
- handoffs humanos activos;
- último evento;
- última auto-pausa;
- códigos de fallos recientes;
- conversaciones recientes pseudonimizadas.
