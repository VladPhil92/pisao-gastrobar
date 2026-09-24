# Meta App Review — PISÁO Concierge

Estado de preparación para revisión de Meta.

## URLs públicas

- Servicio: https://pisaogastrobar.com/concierge
- Política de privacidad: https://pisaogastrobar.com/privacidad
- Términos: https://pisaogastrobar.com/legal
- Instrucciones de eliminación: https://pisaogastrobar.com/eliminacion-datos
- Callback de eliminación: https://pisaogastrobar.com/api/meta/data-deletion
- Webhook WhatsApp: https://pisaogastrobar.com/api/whatsapp/webhook

## Permisos y evidencia

### whatsapp_business_messaging
Evidencia sugerida:
1. mostrar un mensaje entrante de prueba;
2. mostrar recepción en el webhook;
3. mostrar respuesta enviada por PISÁO Concierge;
4. mostrar recepción de la respuesta en WhatsApp.

### whatsapp_business_management
Evidencia sugerida:
1. mostrar el Business Portfolio autorizado;
2. mostrar la WABA seleccionada;
3. mostrar que PISÁO recibe WABA ID y Phone Number ID mediante Embedded Signup;
4. mostrar la conexión guardada como ACTIVE en el dashboard.

### business_management
Evidencia sugerida:
- mostrar selección/autorización del Business Portfolio dentro del flujo de Meta.

### manage_app_solution
Evidencia sugerida:
- mostrar que PISÁO Concierge aparece como app asignada al usuario/negocio y que se utiliza para administrar la solución tecnológica.

## Flujo de revisión recomendado

1. Completar Access Verification.
2. Crear Configuration ID de Embedded Signup v4.
3. Conectar la WABA de PISÁO.
4. Ejecutar "Verificar conexión" en /admin/whatsapp.
5. Activar Concierge.
6. Ejecutar un mensaje inbound/outbound real.
7. Capturar video corto y continuo para cada permiso solicitado.
8. En App Review describir exactamente qué pantalla y acción demuestra cada permiso.
9. No incluir tokens, App Secret, credenciales ni números personales en videos o textos.

## Eliminación de datos

Meta puede invocar POST /api/meta/data-deletion con signed_request.
PISÁO valida HMAC-SHA256 con el App Secret, no almacena el user_id de Facebook en claro y devuelve:

- url de confirmación pública;
- confirmation_code.

El sitio también publica instrucciones de eliminación directa para usuarios.

## Nota de privacidad

La memoria persistente de PISÁO Concierge no conserva transcripciones completas.
La consola operacional de WhatsApp usa identificadores pseudónimos y metadatos técnicos, no teléfonos ni cuerpos de mensajes.
