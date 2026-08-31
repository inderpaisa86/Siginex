# Despliegue de SIGINEX en la VM Oracle Cloud (pruebas)

Guía para levantar SIGINEX en una VM **Oracle Cloud Free Tier — Always Free
Ampere (ARM)** con Docker. La app es fullstack (frontend + API) y usa
PostgreSQL 16 en un contenedor.

> Resultado orientativo del producto aparte: esta guía es solo para el
> despliegue técnico en pruebas.

## 1. Preparar la VM

En el panel de Oracle Cloud:

1. Crea una instancia **VM.Standard.A1.Flex** (Ampere, Always Free): 1–4 OCPU,
   6–24 GB RAM. Sistema operativo: Ubuntu 22.04 (o similar).
2. En la **VCN / Security List** (o Network Security Group), abre el ingreso:
   - Puerto **3000** TCP (la app) — o 80/443 si pones Nginx delante.
   - El puerto **5432** NO debe abrirse al exterior (Postgres queda interno).
3. Conéctate por SSH a la VM.

En Ubuntu, además del Security List, abre el puerto en el firewall local:

```bash
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
# (o ufw allow 3000/tcp, según la config de la VM)
```

## 2. Instalar Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker            # o cierra y reabre la sesión SSH
docker --version
docker compose version
```

## 3. Obtener el código

```bash
git clone https://github.com/inderpaisa86/Siginex.git
cd Siginex
```

## 4. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Ajusta **como mínimo** una contraseña fuerte y que `DATABASE_URL` apunte al
servicio `db` de Docker (host `db`):

```
DATABASE_URL="postgres://siginex:UNA_CLAVE_FUERTE@db:5432/siginex"
POSTGRES_DB="siginex"
POSTGRES_USER="siginex"
POSTGRES_PASSWORD="UNA_CLAVE_FUERTE"
```

> `DATABASE_URL` usa `@db:5432` (nombre del servicio en la red de Docker), no
> `localhost`. Las tres variables de contraseña deben coincidir.

## 5. Levantar, migrar y sembrar

```bash
# Construye y levanta db + web
docker compose up -d --build

# Aplica el esquema (tablas, enums, RLS, vista, seed de kb_version)
docker compose run --rm migrate

# Crea el primer tenant + API key (imprime la API key UNA sola vez)
docker compose run --rm seed
```

Guarda la salida del seed: `X-Tenant-Id` y `X-Api-Key`. La key no se puede
recuperar después (solo se guarda su hash).

## 6. Verificar

```bash
# Health check (público): debe responder {"status":"ok","db":"up"}
curl http://localhost:3000/api/health

# Un endpoint de negocio (usa las credenciales del seed)
curl -H "X-Api-Key: sgx_..." -H "X-Tenant-Id: <uuid>" \
  http://localhost:3000/api/diagnosticos
```

Desde tu navegador: `http://<IP_PUBLICA_DE_LA_VM>:3000`.

## 7. Flujo de prueba de punta a punta (opcional)

```bash
API="-H \"X-Api-Key: sgx_...\" -H \"X-Tenant-Id: <uuid>\" -H \"Content-Type: application/json\""

# Crear organización
curl -X POST http://localhost:3000/api/organizaciones \
  -H "X-Api-Key: sgx_..." -H "X-Tenant-Id: <uuid>" -H "Content-Type: application/json" \
  -d '{"nombre":"Empresa Demo","sector":"Manufactura","tamano":"mediana"}'

# Con el id devuelto: crear diagnóstico, registrar respuestas y calcular
# POST /api/diagnosticos            {"organizacion_id":"..."}
# PUT  /api/diagnosticos/{id}/respuestas   {"respuestas":[{"pregunta_id":"sst-1.1.1","valor":"2"}]}
# POST /api/diagnosticos/{id}/calcular
```

## 8. Operación

```bash
docker compose logs -f web       # ver logs de la app
docker compose ps                # estado de los servicios
docker compose down              # detener (conserva el volumen de datos)
docker compose up -d --build     # actualizar tras un git pull
```

Tras un `git pull` con cambios de schema, vuelve a aplicar migraciones:

```bash
git pull
docker compose up -d --build
docker compose run --rm migrate
```

## Notas

- **Persistencia:** los datos viven en el volumen `siginex_pgdata`. `docker
  compose down` NO lo borra; `docker compose down -v` SÍ (cuidado).
- **HTTPS / dominio:** para producción, poné un Nginx o Caddy delante del
  puerto 3000 con certificado TLS. Fuera del alcance de esta guía de pruebas.
- **Backups:** `docker compose exec db pg_dump -U siginex siginex > backup.sql`.
