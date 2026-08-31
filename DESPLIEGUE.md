# Despliegue de SIGINEX

Ruta principal: **Vercel** (app) + **Neon** (PostgreSQL), ambos con free tier y
sin tarjeta. Despliegue automático desde GitHub. Al final hay una sección con la
alternativa **Docker** (local o VM propia).

> Resultado orientativo del producto aparte: esta guía es solo para el
> despliegue técnico.

---

## Parte A — Base de datos en Neon

1. Entra a **https://neon.tech** y crea cuenta (puedes usar tu GitHub).
2. **Create project**: nombre `siginex`, región la más cercana, PostgreSQL 16.
3. En **Dashboard → Connection Details**, copia la **connection string**. Se ve
   así (con `-pooler` para el pool serverless, recomendado para Vercel):

   ```
   postgres://usuario:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
   ```

   Guárdala: es tu `DATABASE_URL`.

### Aplicar el schema y sembrar (desde tu PC, una sola vez)

Con Node instalado y en la carpeta `Siginex/`:

```bash
# Crea .env con la DATABASE_URL de Neon
cp .env.example .env
# edita .env y pega DATABASE_URL="postgres://...neon.tech/...?sslmode=require"

npm install
npm run db:migrate      # aplica tablas, enums, RLS, vista y seed de kb_version
npm run db:seed         # crea un tenant + API key (imprime la key UNA vez)
```

Guarda de la salida del seed el `X-Tenant-Id` y la `X-Api-Key`.

---

## Parte B — App en Vercel

1. Entra a **https://vercel.com** y crea cuenta con tu **GitHub**.
2. **Add New → Project** → importa el repositorio **`inderpaisa86/Siginex`**.
3. Vercel detecta Next.js solo. **Root Directory:** déjalo en la raíz del repo
   (donde está `package.json`, es decir la carpeta del proyecto).
4. **Environment Variables** — añade:
   - `DATABASE_URL` = la connection string de Neon (la misma del `.env`).
5. **Deploy.** Vercel construye y publica. Te da una URL tipo
   `https://siginex.vercel.app`.

Cada `git push` a `main` vuelve a desplegar automáticamente.

---

## Parte C — Verificar

```bash
# Health (público)
curl https://TU-APP.vercel.app/api/health        # {"status":"ok","db":"up"}

# Endpoint de negocio (con las credenciales del seed)
curl -H "X-Api-Key: sgx_..." -H "X-Tenant-Id: <uuid>" \
  https://TU-APP.vercel.app/api/diagnosticos
```

Flujo completo de prueba:

```bash
BASE=https://TU-APP.vercel.app
H=(-H "X-Api-Key: sgx_..." -H "X-Tenant-Id: <uuid>" -H "Content-Type: application/json")

# 1. Crear organización
curl -X POST "$BASE/api/organizaciones" "${H[@]}" \
  -d '{"nombre":"Empresa Demo","sector":"Manufactura","tamano":"mediana"}'

# 2. Crear diagnóstico (usa el id devuelto arriba)
curl -X POST "$BASE/api/diagnosticos" "${H[@]}" \
  -d '{"organizacion_id":"<org-id>"}'

# 3. Registrar respuestas
curl -X PUT "$BASE/api/diagnosticos/<diag-id>/respuestas" "${H[@]}" \
  -d '{"respuestas":[{"pregunta_id":"sst-1.1.1","valor":"2"}]}'

# 4. Calcular
curl -X POST "$BASE/api/diagnosticos/<diag-id>/calcular" "${H[@]}"
```

---

## Notas

- **Migraciones tras cambios de schema:** cuando cambie `src/lib/db/schema.ts`,
  genera y aplica: `npm run db:generate && npm run db:migrate` (contra Neon).
  Vercel NO corre migraciones solo; se ejecutan desde tu PC o un job aparte.
- **Driver:** el cliente detecta Neon por la URL y usa `neon-serverless`
  (WebSocket, con transacciones para la RLS). Con una URL local usa `postgres.js`.
- **Free tier:** Neon da 0.5 GB; Vercel, hosting hobby. Suficiente para pruebas.

---

## Alternativa — Docker (local o VM propia)

El repo trae `Dockerfile` y `docker-compose.yml` para correr todo el stack
(app + Postgres) sin depender de Vercel/Neon:

```bash
cp .env.example .env            # ajusta POSTGRES_PASSWORD y DATABASE_URL (host db)
docker compose up -d --build
docker compose run --rm migrate
docker compose run --rm seed
curl http://localhost:3000/api/health
```

Útil para desarrollo local o para desplegar en una VM (p. ej. si más adelante
Oracle Cloud libera capacidad Ampere). Para la VM: instalar Docker, abrir el
puerto 3000, y seguir los mismos comandos.
