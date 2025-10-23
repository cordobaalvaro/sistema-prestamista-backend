## Autenticación: Access Token + Refresh Token

Se implementó un flujo moderno de autenticación:

- Access Token (corto, por defecto 10 minutos): se devuelve en la respuesta y debe enviarse en `Authorization: Bearer <token>` para acceder a rutas protegidas.
- Refresh Token (largo, por defecto 7 días): se guarda en una Cookie `HttpOnly` y `Secure` (en producción), utilizada solo en el endpoint de refresco.

### Endpoints

- POST `/api/auth/login`
  - body: `{ "usuarioLogin": "...", "contraseña": "..." }`
  - respuesta: `{ token, data: { usuario } }` y setea cookie de refresh.

- POST `/api/auth/refresh`
  - usa cookie `rtoken` automáticamente; devuelve `{ token, data: { usuario } }` y rota cookie.

- POST `/api/auth/logout`
  - limpia la cookie de refresh.

Las rutas protegidas deben usar el middleware `auth` y enviar el Access Token en el header `Authorization` con esquema Bearer.

### Variables de entorno

```
JWT_ACCESS_SECRET=supersecreto_access
JWT_REFRESH_SECRET=supersecreto_refresh
ACCESS_TOKEN_TTL=10m
REFRESH_TOKEN_TTL=7d
REFRESH_COOKIE_NAME=rtoken
NODE_ENV=production # para activar Secure+SameSite=None en cookies
```

> Nota: se mantiene compatibilidad con el header `auth` para tokens antiguos, pero se recomienda migrar a `Authorization: Bearer`.

# Backend

Node.js + Express + MongoDB backend para gestión de clientes, préstamos, zonas, cobradores y tablas de cobro.

## Requisitos

- Node.js 18+
- MongoDB (Atlas o local)

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las variables necesarias:

```
PORT=5000
MONGO_ACCESS=mongodb+srv://<usuario>:<password>@<cluster>/<db>?retryWrites=true&w=majority
JWT_SECRET=tu_secreto_seguro
# Opcional: si usas Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
# Opcional: override del cron (por defecto cada 30 minutos)
PRESTAMOS_CRON=*/30 * * * *
```

## Instalación

1. Instala dependencias:
```
npm install
```

2. Ejecuta en desarrollo:
```
npm run dev
```

3. Ejecuta en producción / Render:
```
npm start
```

## Endpoints base

- Prefijo: `/api`
- Rutas principales:
  - `/usuarios` (login, CRUD)
  - `/clientes` (CRUD, resumen)
  - `/prestamos` (CRUD, estado, etc.)
  - `/zona`, `/cobradores`, `/notificaciones`, `/documentosClientes`

La autorización utiliza un header `auth` con un JWT. Ejemplo:
```
Authorization: (header personalizado) auth: <TOKEN_JWT>
```

## Autenticación

- Login emite un JWT con expiración de 1 hora.
- Endpoint de renovación: `POST /usuarios/renovar-token` (usa el header `auth` con el token actual). Devuelve un token nuevo.

## Cron de préstamos

El archivo `src/utils/prestamos.cron.js` ejecuta la tarea de actualización de préstamos cada 30 minutos por defecto.

- Ajuste por variable de entorno: `PRESTAMOS_CRON` (formato crontab de 5 campos, ej.: `0 0 * * *` diario a medianoche).

## Despliegue en Render

- Build Command: `npm install`
- Start Command: `npm start`
- Node version: 18+
- Env Vars: `PORT`, `MONGO_ACCESS`, `JWT_SECRET`, y las demás opcionales.

Asegúrate de habilitar Web Service e indicar el puerto `${PORT}`.

## Estructura básica

```
index.js
src/
  controllers/
  services/
  models/
  routes/
  db/
  utils/
```

## Licencia

MIT
