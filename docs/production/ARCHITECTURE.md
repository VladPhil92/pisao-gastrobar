# Arquitectura de producción — PISÁO Gastrobar

## Fuente de verdad

- Repositorio canónico: `VladPhil92/pisao-gastrobar`
- Rama de producción: `main`
- Servicio web: Render `pisao-gastrobar`
- Base de datos: Render PostgreSQL `pisao-gastrobar-db`
- Dominio canónico: `https://pisaogastrobar.com`
- Dominio alterno: `https://www.pisaogastrobar.com`

## Flujo único

```text
GitHub / main
     |
     | auto deploy
     v
Render / pisao-gastrobar
     |
     +---- Next.js 16
     +---- API Routes
     +---- Auth.js
     +---- Prisma
     |
     v
Render PostgreSQL / pisao-gastrobar-db
```

No debe existir un segundo deployment productivo de PISÁO en otro proveedor mientras
esta arquitectura sea la vigente. Esto evita builds duplicados, variables de entorno
divergentes, webhooks atendidos por dos runtimes y migraciones ejecutadas desde más de
un origen.

Vercel queda explícitamente deshabilitado desde `vercel.json` mediante
`git.deploymentEnabled=false`. Mientras el proyecto antiguo exista en la cuenta de
Vercel, no debe volver a producir builds automáticos desde Git.

## Consolidación de repositorios

`PISAO-WEB` fue el repositorio histórico original. El repositorio
`pisao-gastrobar` nació a partir de un snapshot de ese código y luego se convirtió
en la línea activa de desarrollo. El snapshot inicial de `pisao-gastrobar` coincide
con el árbol Git del commit `f5dc75f7b412a7ee29fc118f0838b3aa906acd35` de
`PISAO-WEB`.

La línea `pisao-gastrobar` contiene el desarrollo posterior de experiencia visual,
CTG One, Concierge IA, telemetría, operaciones de reservas y endurecimiento de
producción. Por eso es el repositorio que se conserva.

## Arranque y migraciones

Render Free no ejecuta comandos de pre-deploy. Por esa razón el proceso de arranque
productivo usa `scripts/render-bootstrap.mjs`: intenta `prisma migrate deploy`
antes de iniciar Next.js y continúa en modo seguro si la base de datos está
temporalmente inaccesible. Esto evita depender de una capacidad de pre-deploy que el
plan actual no ejecuta y mantiene disponible la web estática incluso ante una caída
transitoria de PostgreSQL.

Cuando el servicio web se migre a un plan que soporte pre-deploy, la migración puede
volver a ejecutarse allí y retirarse el bootstrap de runtime.

## Gates de producción

Antes de retirar infraestructura antigua o después de un cambio en producción:

1. Confirmar que Render reporta el último commit de `main` como `live`.
2. Confirmar HTTP 200 en la URL primaria de Render.
3. Confirmar `GET /api/health?strict=1` con base de datos disponible.
4. Validar menú, reservas, administración, autenticación y Concierge.
5. Confirmar que `DATABASE_URL` apunta a la base activa de Render.
6. Confirmar que el dominio canónico ya resuelve a Render antes de borrar el proyecto antiguo de Vercel.

## Nota sobre la base de datos

La aplicación debe usar una única `DATABASE_URL` de producción. Si una base antigua
es reemplazada, hay que actualizar la variable antes de retirar el servicio anterior.
Nunca se debe dejar una URL de un host PostgreSQL eliminado o expirado.
