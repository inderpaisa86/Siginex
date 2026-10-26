# Plan por fases: SIGINEX — Frontend en WebConcienTIC, Backend Java 25, Auth por empresa y seguridad de datos sensibles

**Proyecto:** SIGINEX
**Estado:** Propuesta / plan (sin implementar)
**Fecha:** 2026-10-26
**Autor:** Documentación generada con Kiro, a validar por el equipo

> Resultado orientativo. Este documento es un plan técnico; no sustituye una
> revisión de seguridad formal ni una auditoría por un especialista.

---

## 1. Objetivo y arquitectura objetivo

Reorganizar SIGINEX hacia esta arquitectura:

- **Frontend:** el front de SIGINEX **vive dentro de `concientic`** (repo
  WebConcienTIC) como rutas nativas de ese Next.js. Se **retira el proxy
  `/siginex`** (rewrite) que servía la app separada.
- **Backend:** **Java 25 + Spring Boot 4 + Spring Security 7**, dueño de la
  autenticación, la autorización y el acceso a datos sensibles. Expone API REST.
  Coherente con el backend hermano `concientic-catalog` (mismo stack).
- **Base de datos:** **Neon (PostgreSQL)** — la que SIGINEX ya usa. Se conserva,
  con su Row-Level Security por tenant.
- **Identidad:** acceso con **login por empresa**; cada empresa opera solo sobre
  sus datos (su tenant). Reemplaza el tenant fijado por `SIGINEX_TENANT_ID`.
- **Clean code:** principio transversal (ver §4), no una fase aparte.

Diagrama lógico:

```
Navegador
   │  (HTTPS)
   ▼
concientic (Next.js en Vercel)  ──►  rutas /siginex/* nativas (frontend SIGINEX)
   │  (API REST, cookie de sesión / token)
   ▼
Backend SIGINEX (Java 25, Spring Boot 4, Spring Security 7)
   │  (JDBC + pooler)
   ▼
Neon (PostgreSQL)  ──  RLS por tenant
```

---

## 2. Punto de partida (verificado en el código)

- **BD ya multi-tenant con RLS.** Cada tabla tiene `tenant_id`;
  `withTenant(tenantId, work)` fija `app.tenant_id` por transacción; la política
  RLS compara contra `current_tenant()`. El tenant no se acepta del cliente.
- **Tenant hoy por env:** `tenantActual()` lee `SIGINEX_TENANT_ID`. El propio
  código dice que en fase 2 vendrá del usuario autenticado.
- **Tablas existentes:** `tenant`, `organizacion` (FK a tenant), `diagnostico`,
  `respuesta`, `resultado_pilar`, `recomendacion`, `tarea_mejora`, `alerta`,
  `api_key` (credenciales programáticas, sin RLS, se consulta antes de fijar
  tenant), `evento_auditoria` (auditoría ya disponible).
- **No existe aún:** usuarios, contraseñas, sesiones, middleware, dependencia de
  auth.
- **Conexión actual a Neon:** SIGINEX usa `@neondatabase/serverless` (driver
  WebSocket para Node/edge). Un backend Java usará **JDBC estándar** contra Neon
  (soportado), preferiblemente a través del **pooler de Neon**; tener en cuenta
  el *cold start* de Neon en el diseño de conexiones/timeouts.
- **Stack ya en casa:** `concientic-catalog` corre Java 25 + Spring Boot 4.0 +
  Flyway + PostgreSQL. Migrar el backend de SIGINEX a ese stack es coherente.
- **Front de concientic:** Next.js con `src/app`, `src/components`
  (`layout`, `sections`, `ui`, `library`, `laboratorios`, ...), `src/content`,
  `src/lib`. El front de SIGINEX debe integrarse respetando esa organización.

### Decisión de modelado
- **M1 — Empresa = `tenant`** *(recomendado)*: el login resuelve un `tenant_id`
  y el RLS actual ya aísla todo. El plan asume M1.
- **M2 — Empresa = `organizacion`**: requiere segundo nivel de aislamiento;
  mayor complejidad.

---

## 3. Clasificación de datos sensibles

| Dato | Sensibilidad | Controles clave |
|------|--------------|-----------------|
| Contraseñas de usuario | Crítico | Hash argon2id; nunca en claro ni en logs |
| Respuestas de diagnóstico | Alto | RLS por tenant + cifrado en reposo (Neon) |
| Resultados, brechas, planes | Alto | RLS por tenant |
| Organización (NIT, sector) | Medio-alto | RLS por tenant |
| Identidad de usuario (email) | Medio | Minimización; acceso auditado |
| Vigilancia (normativa/mercado) | Bajo (global) | Sin datos de empresa |

Principio: **defensa en profundidad** — el aislamiento no depende solo de RLS;
se refuerza con autorización en la aplicación, sesiones robustas y auditoría.

---

## 4. Clean code (principios transversales a todas las fases)

Aplican tanto al frontend (concientic/Next.js) como al backend (Java 25):

**Generales**
- Nombres intencionales; funciones pequeñas con una sola responsabilidad.
- Sin duplicación (DRY); sin código muerto ni comentarios que narren lo obvio.
- Errores explícitos y tipados; nada de "tragar" excepciones en silencio.
- Pruebas acompañando el código (unitarias en lógica de dominio; de integración
  en auth y acceso a datos).
- Secretos fuera del repo; configuración por entorno.

**Frontend (concientic)**
- Respetar la estructura existente: rutas en `src/app`, componentes en
  `src/components/<dominio>`, utilidades en `src/lib`, textos en `src/content`.
- Componentes de servidor por defecto; `"use client"` solo cuando hay estado/UI
  interactiva (como el `Cuestionario`).
- Separar presentación (componentes) de acceso a datos (una capa `lib/siginex`
  que hable con el backend Java). Nada de `fetch` disperso en componentes.
- Tipos compartidos del contrato API en un solo lugar (p. ej. `lib/siginex/types`).

**Backend (Java 25 / Spring Boot 4)**
- Arquitectura por capas o hexagonal: `controller` (API) → `service` (dominio)
  → `repository` (datos). El dominio no depende del framework web.
- DTOs de entrada/salida separados de entidades de persistencia.
- Validación en el borde (Jakarta Validation); autorización en el servicio.
- Spring Security para auth (no criptografía artesanal).
- Migraciones con **Flyway** (como `concientic-catalog`), versionadas.
- Tests con JUnit + Testcontainers/Postgres para validar RLS y aislamiento.

---

## 5. Seguridad — contraseñas, sesión y autorización

**Contraseñas**
- **argon2id** (preferido) o bcrypt (coste ≥ 12). Nunca MD5/SHA simple.
  `Spring Security` provee `Argon2PasswordEncoder` / `BCryptPasswordEncoder`.
- Sal única por contraseña (automática). Política de longitud mínima (12+),
  chequeo contra contraseñas filtradas, sin rotación arbitraria (NIST).
- Nunca en logs/trazas/errores. Transmisión solo por HTTPS/TLS.
- Reseteo por token de un solo uso (hash, vida corta) por correo (Resend ya está
  en el ecosistema concientic). Sin enumeración de cuentas; respuestas de tiempo
  uniforme.

**Sesión**
- Cookie **HttpOnly + Secure + SameSite=Lax**, con expiración (p. ej.
  inactividad 30 min / absoluta 8–12 h) y renovación controlada.
- **Sesión revocable en servidor** (tabla `sesion`), no JWT autocontenido, para
  poder revocar al instante (logout global, baja, incidente).
- La emite el backend Java; el frontend solo la transporta.

**Autorización (defensa en profundidad)**
- Capa 1: RLS en PostgreSQL (ya aísla por tenant; mantener `FORCE RLS`).
- Capa 2: el servicio Java verifica pertenencia al tenant antes de actuar.
- Capa 3: roles `admin` / `miembro`.
- Nunca aceptar `tenant_id`/`organizacion_id` desde el cliente.

**Abuso / endurecimiento**
- Rate-limiting por IP y cuenta (Upstash ya usado en concientic, o a nivel
  backend), backoff tras N fallos, CSRF en formularios de sesión.
- Auditoría de login/logout y accesos sensibles en `evento_auditoria`.
- Cabeceras de seguridad (CSP, HSTS, etc.) en concientic.
- **Cifrado en reposo:** verificar/confirmar en Neon (gestionado por el
  proveedor) y documentarlo.

---

## 6. Modelo de datos nuevo (Neon/PostgreSQL)

```
usuario (RLS por tenant_id)
  id uuid PK, tenant_id uuid NOT NULL -> tenant(id),
  email text (único global, recomendado), nombre text,
  password_hash text NOT NULL,  rol text DEFAULT 'miembro',
  activo boolean DEFAULT true, fallos_login smallint DEFAULT 0,
  bloqueado_hasta timestamptz, creado_en timestamptz, ultimo_login timestamptz

sesion
  id uuid PK, usuario_id uuid, tenant_id uuid, expira_en timestamptz,
  creado_en timestamptz, user_agent text, ip inet

reset_password
  id uuid PK, usuario_id uuid, token_hash text, expira_en timestamptz, usado boolean
```

- La **verificación de login ocurre fuera del RLS** (como `api_key`): se busca al
  usuario por email antes de conocer el tenant. Diseñar sin fuga entre tenants
  (acceso controlado / función `SECURITY DEFINER`).
- Migraciones con **Flyway** desde el backend Java.

---

# PLAN POR FASES

Cada fase es entregable y verificable. El orden prioriza seguridad y reduce
riesgo migrando lo más sensible primero.

---

## Fase 0 — Decisiones y preparación *(bloqueante)*

**Meta:** cerrar decisiones y dejar los repos listos.

### Decisiones tomadas (2026-10-26, confirmadas por el equipo)

1. **Empresa = tenant (M1).** El login resuelve un `tenant_id`; el RLS actual
   aísla todo.
2. **Alta de empresas por invitación/admin.** Sin registro público; un admin
   crea empresas y sus usuarios.
3. **Varios usuarios por empresa** desde el inicio.
4. **Sesión revocable en servidor** (tabla `sesion`), no JWT autocontenido.
5. **Backend en `WebConcienTIC/backend/siginex-api`**, junto a
   `concientic-catalog`, mismo stack (Java 25 + Spring Boot 4 + Flyway +
   PostgreSQL/Neon).
6. **Recuperación de contraseña** → Fase 5 (con Resend), no en el arranque.
7. **`/api/*` con `api_key`** se mantiene en paralelo al login de UI.
8. **Ley 1581 (Colombia) APLICA.** Reflejar retención, consentimiento y derechos
   de los titulares (habeas data) en el diseño desde el inicio.
9. **Partir limpio:** no hay datos existentes que preservar del tenant de
   `SIGINEX_TENANT_ID`.

### Tareas de la fase

- Crear el **esqueleto del backend Java 25** (Spring Boot 4) en
  `WebConcienTIC/backend/siginex-api`, con Flyway y conexión a Neon por JDBC
  (pooler). Mismo patrón que `concientic-catalog`.
- Definir el **contrato API** inicial (auth + diagnóstico) y los tipos
  compartidos para el frontend.
- Configurar entornos y secretos (sin credenciales en el repo).

**Verificación:** backend arranca, conecta a Neon (healthcheck), decisiones
firmadas. Sin lógica de negocio aún.

---

## Fase 1 — Backend Java: autenticación y usuarios *(lo más sensible primero)*

**Meta:** login seguro y gestión de usuarios en el backend Java.

- Migraciones Flyway: `usuario`, `sesion`, `reset_password` (+ políticas RLS).
- Spring Security 7: login por credenciales, `Argon2PasswordEncoder`, sesión
  revocable (cookie HttpOnly), logout, CSRF.
- Resolución de tenant desde la sesión (reemplaza `SIGINEX_TENANT_ID`).
- Rate-limiting + backoff + auditoría de login en `evento_auditoria`.
- Endpoints: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`,
  gestión básica de usuarios (crear/activar) según rol.

**Verificación:** tests de integración (JUnit + Testcontainers) de login,
bloqueo por intentos, aislamiento por tenant, y que ninguna consulta cruce datos
entre tenants. Contraseñas nunca en logs.

---

## Fase 2 — Backend Java: dominio de diagnóstico

**Meta:** portar la lógica de negocio sensible a Java, detrás de auth.

- Portar servicios hoy en `src/lib/server/diagnostico-service.ts`:
  organizaciones, diagnósticos, respuestas (guardar/editar por módulo),
  cálculo/orquestador, resultados, plan de mejora.
- Exponer API REST versionada (p. ej. `/api/v1/diagnosticos`, `/.../respuestas`,
  `/.../resultados`, `/modulos`).
- El banco `KB` (preguntas por módulo) puede servirse desde el backend o
  mantenerse como dato versionado; decidir en diseño.
- Mantener RLS + autorización en cada operación.

**Verificación:** paridad funcional con el flujo actual (crear diagnóstico →
responder por módulo → calcular → resultados), con tests. Aislamiento por tenant
probado.

---

## Fase 3 — Frontend de SIGINEX dentro de concientic

**Meta:** mover la UI de SIGINEX al Next.js de concientic y retirar el proxy.

- Crear rutas nativas en `concientic/src/app/siginex/...` (login, panel,
  diagnóstico, módulos, resultados, plan, reportes, vigilancia).
- Portar/rehacer componentes a `concientic/src/components/siginex/...`
  respetando las convenciones de concientic (server components por defecto;
  `Cuestionario` como client component).
- Capa de acceso a datos `concientic/src/lib/siginex/` que consume la API Java
  (sin `fetch` disperso; tipos del contrato centralizados).
- Middleware/guard de rutas: sin sesión → `/siginex/login` (respetando que ahora
  son rutas nativas, no proxy).
- **Retirar el rewrite `/siginex`** del `next.config.ts` de concientic y el
  `basePath`/`assetPrefix` de la app SIGINEX separada (que deja de usarse como
  front).

**Verificación:** el flujo completo funciona en concientic (login → responder por
módulo → resultados), visualmente correcto, en producción detrás del dominio
`concientic.com/siginex` (validar cookies/sesión en ese contexto).

---

## Fase 4 — Navegación por módulos (la petición original)

**Meta:** que seleccionar un módulo muestre/edite sus preguntas.

- Con empresa logueada, resolver "diagnóstico de la empresa" (crear si no hay).
- `Cuestionario` acepta módulo inicial (`?modulo=<id>`), no siempre el primero.
- Sidebar y panel enlazan a la sección del módulo del diagnóstico de la empresa.
- Estado por módulo (respondido / pendiente / % completitud) en el panel.

**Verificación:** seleccionar cada módulo abre sus preguntas; guardar/editar
funciona y queda aislado por tenant.

---

## Fase 5 — Alta de empresas y recuperación de contraseña

- Alta de empresa (tenant) + primer usuario admin (según decisión: invitación o
  autoservicio).
- Reseteo de contraseña por token + correo (Resend). Sin enumeración de cuentas.
- Gestión de usuarios por el admin de la empresa.

**Verificación:** ciclo completo de alta y recuperación probado.

---

## Fase 6 — Endurecimiento, cumplimiento y retirada de lo viejo

- Cabeceras de seguridad (CSP/HSTS) en concientic; revisión de dependencias.
- Confirmar cifrado en reposo en Neon; política de retención y borrado;
  derechos de titulares (si aplica Ley 1581).
- Pruebas de seguridad del aislamiento por tenant (automatizadas).
- **Retirar la app SIGINEX separada** y su despliegue en Vercel una vez que el
  front en concientic + backend Java estén estables. Conservar solo la BD Neon y
  el backend Java.
- Si se conserva `api_key` para integraciones, mantenerlo en paralelo al login.

**Verificación:** checklist de §7 completo; sin rutas muertas; un solo frontend.

---

## 7. Checklist de seguridad (consolidado)

- [ ] Contraseñas argon2id (o bcrypt ≥ 12); nunca en claro ni en logs.
- [ ] Reseteo por token de un solo uso; sin enumeración de cuentas.
- [ ] Cookies de sesión HttpOnly + Secure + SameSite; sesiones revocables.
- [ ] Rate-limiting + backoff + CSRF en login.
- [ ] Tenant resuelto en servidor desde la sesión; nunca del cliente.
- [ ] RLS forzada en todas las tablas con `tenant_id`, incluidas las nuevas.
- [ ] Autorización en la aplicación además de RLS.
- [ ] Verificación de credenciales fuera de RLS, sin fuga entre tenants.
- [ ] Auditoría de login/logout y accesos sensibles.
- [ ] HTTPS/TLS extremo a extremo; sesión validada bajo `concientic.com/siginex`.
- [ ] Cifrado en reposo confirmado en Neon.
- [ ] Secretos fuera del repo; config por entorno.
- [ ] Escaneo de dependencias (Java/Spring y Node).
- [ ] Minimización de datos y política de retención.

---

## 8. Riesgos y notas

- **Dos frontends durante la transición.** Mientras se migra, coexistirán la app
  SIGINEX separada (proxy) y el front nuevo en concientic. Planear un corte
  limpio en Fase 6.
- **Cookies bajo el proxy / rutas nativas.** Riesgo ya vivido con basePath. Al
  pasar a rutas nativas en concientic, validar cookies/sesión en producción.
- **Neon + JDBC.** Cold start y límites de conexión; usar el pooler de Neon y
  configurar timeouts. Distinto del driver serverless actual.
- **Portar lógica a Java.** Fases 1–2 reescriben en Java servicios hoy en
  TypeScript; riesgo de divergencia funcional. Mitigar con tests de paridad.
- **Migración de datos existentes.** Si hay datos en el tenant de
  `SIGINEX_TENANT_ID`, decidir cómo se asocian a la primera empresa con login.
- **Esfuerzo.** Es una reescritura de arquitectura, no un ajuste. El plan por
  fases permite entregar valor incremental y acotar riesgo.

---

## 9. Preguntas abiertas para el equipo

1. **Empresa = tenant (M1)** confirmado?
2. **Alta de empresas:** ¿invitación/admin (recomendado) o autoservicio?
3. **Usuarios por empresa:** ¿varios desde el inicio?
4. **Sesión:** ¿revocable en servidor (recomendado)?
5. **Recuperación de contraseña:** ¿en Fase 5 con Resend?
6. **`/api/*` con `api_key`:** ¿se mantiene en paralelo al login?
7. **Datos existentes** en el tenant de la env: ¿preservar y asociar?
8. **Cumplimiento:** ¿aplica Ley 1581 (Colombia) u otros? Impacta retención,
   consentimiento y derechos de titulares.
9. **Ubicación del backend:** ¿`WebConcienTIC/backend/siginex-api` junto a
   `concientic-catalog`?

---

### Resumen en una frase

Migrar el **frontend de SIGINEX a concientic**, mover la lógica sensible a un
**backend Java 25 (Spring Boot 4 + Spring Security 7)** sobre **Neon/PostgreSQL**
con **login por empresa**, RLS y seguridad de grado producción, aplicando **clean
code** de forma transversal y ejecutándolo **por fases** que entregan valor sin
romper lo existente.
