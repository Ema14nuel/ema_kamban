# Tableros — documentación del proyecto

> Este documento existe para que una futura sesión (humana o de IA) pueda
> retomar el trabajo sin releer todo el historial de chat. Resume qué se
> construyó, por qué, qué decisiones se tomaron y qué falta.

## 0. Feature "Inicio" + "Histórico" — completada

Pantalla "Inicio" (dashboard) y pantalla "Histórico" (listado + traza de
actividad) ya están implementadas end-to-end (backend + frontend) y
verificadas con Playwright contra el backend real: login, navbar en el orden
Inicio/Tableros/Consolidado/Actividades/Registro/Histórico, crear tablero +
tarjeta de prueba, editar título, mover de columna, abrir "Histórico", abrir
el modal de detalle y confirmar que la traza muestra created/edited/moved
ordenados del más reciente al más antiguo con su detalle en texto, cierre del
modal al hacer click en el overlay, y limpieza del tablero de prueba al
terminar. Sin errores de consola ni de red durante la prueba.

La pestaña "Actividades" (programación recurrente) se dejó como estaba, sin
tocar. El dashboard "Inicio" quedó como primera pestaña del navbar y como
ruta `/` (ya no redirige a `/boards`); "Histórico" quedó al final del navbar
en la ruta `/history`.

Archivos nuevos: `components/dashboard/DashboardScreen.tsx` (+
`dashboard.css`), `components/history/ActivitiesHistoryScreen.tsx` y
`components/history/ActivityDetailModal.tsx` (comparten `history.css`).
`App.tsx` y `Navbar.tsx` actualizados con las rutas/pestañas nuevas. El
dashboard y el histórico leen directamente de `boardStore.boards` (ya
cargado por `Shell` al montar) sin pedir nada nuevo al backend; el modal de
detalle es el único que hace un fetch on-demand (`fetchCardHistory`) porque
el historial de eventos no tiene selector reactivo en el store.

### Ya hecho (backend, commiteado)
- Modelo `CardEvent` (`boards/models.py`): `card FK, action ('created'|'edited'|'moved'), detail (texto humano), at`.
- `CardSerializer` ahora expone `created_at` (antes no estaba).
- `CardViewSet`: `perform_create` crea evento `created`; `perform_update`
  (el PATCH que usa el panel de edición) diffea `title/desc/date/time` viejo
  vs. nuevo y crea un evento `edited` con el detalle en texto; `move` crea un
  evento `moved` con `"{EstadoViejo} → {EstadoNuevo}"`; nuevo endpoint
  `GET /api/cards/{id}/history/` devuelve los eventos de una tarjeta
  (más recientes primero). Las tarjetas generadas por una rutina recurrente
  también generan su evento `created` (bulk).
- Migración `boards/0002_cardevent.py` ya generada y aplicada en la BD de dev.
- Probado con curl (crear, editar, mover dos veces, leer `/history/`) —
  funciona y el orden de los eventos es correcto.

### Frontend — types.ts y boardStore.ts ya actualizados (commiteados)
- `ActivityCard.createdAt` (mapea `created_at`).
- Tipo `CardEvent` y `CardEventAction` en `types.ts`.
- `boardStore.fetchCardHistory(cardId): Promise<CardEvent[]>` ya existe y
  llama `GET /cards/{id}/history/`.

### Frontend — hecho (ver resumen en la sección 0 de arriba)
`ActivityDetailModal.tsx`, `ActivitiesHistoryScreen.tsx`, `DashboardScreen.tsx`,
y los cambios de `Navbar.tsx`/`App.tsx` que describía este TODO ya están
implementados y verificados (`tsc --noEmit`, `npm run lint`, `npm run build` y
un smoke test con Playwright, todos limpios). El click en `navbar-brand` ahora
navega a `/` en vez de `/boards`.

## 1. Origen y objetivo

El proyecto nace de un handoff de diseño ubicado en (fuera de este repo,
carpeta hermana):

```
../front_kamban/design_handoff_tableros/README.md   <- especificación completa del diseño
../front_kamban/design_handoff_tableros/Tableros.dc.html  <- prototipo original (no portar tal cual)
../front_kamban/design_handoff_tableros/sprites/*.png     <- sprites de la mascota
```

Ese `README.md` es la fuente de verdad del diseño (colores exactos, tipografía,
comportamiento de cada pantalla). Si hay dudas sobre "cómo se veía originalmente
algo", **leer ese archivo primero** antes de inventar.

Objetivo: un gestor de actividades por tableros (kanban) con:
- 4 columnas fijas por tablero (Pending, In Progress, Waiting, Completed)
- vista consolidada de todos los tableros
- calendario
- actividades recurrentes (programación por rango de fechas + horario por día)
- temporizador pomodoro con registro de sesiones
- modo inmersivo (video/YouTube de fondo + temporizador)
- una mascota pixel-art que camina y celebra al completar actividades
- multiusuario, con una pantalla de administración de cuentas solo para admins

## 2. Decisiones tomadas (y por qué)

### Sesión 1 — scaffolding inicial

| Decisión | Elegido | Alternativas descartadas |
| --- | --- | --- |
| Alcance inicial | **Todo el handoff de una vez** (las 13 secciones) | Núcleo primero / solo esqueleto |
| Stack | **React + TypeScript + Vite** | React + JS |
| Estilos | **CSS plano con variables CSS** (tokens del handoff como custom properties) | Tailwind / styled-components |
| Estado global | **Zustand + localStorage** (no había backend funcional todavía) | Redux Toolkit / Context API |
| Backend | Solo **crear el proyecto Django** para que pudiera conectarse al frontend, sin modelos ni lógica de negocio | — |

Routing: se decidió (sin preguntar, por ser detalle de implementación) usar
**react-router-dom con `HashRouter`** para las pantallas de nivel superior
(`/boards`, `/boards/:id`, `/consolidated`, `/routines`, `/log`, `/users`), mientras que
modales, paneles laterales, modo inmersivo y menú de usuario viven en un store
de Zustand (`uiStore`) en vez de rutas, igual que en el prototipo original.

### Sesión 2 — backend funcional + administración de usuarios

El usuario pidió "hacer funcional" el backend según el README y agregar una
pantalla de administración de usuarios (crear/editar/desactivar), visible solo
para admins. Se preguntó explícitamente:

| Decisión | Elegido | Alternativas descartadas |
| --- | --- | --- |
| Alcance del backend | **Todo**: usuarios + tableros/tarjetas/rutinas/registro migrados a la API real (no solo usuarios) | Solo usuarios/auth, boards se quedan en localStorage |
| Autenticación del SPA | **JWT con `djangorestframework-simplejwt`** | Sesiones de Django (cookies) |
| Cómo distinguir admin | **`is_staff` de Django** (reutiliza el flag estándar, también usado por `/admin/`) | Campo `role` propio |

Decisiones de implementación tomadas sin preguntar (detalles, no alcance):
- **`USERNAME_FIELD = 'email'`** en el modelo de usuario: el login de la UI pide
  "Correo", así que el backend autentica por email en vez del `username` de
  Django por defecto. `username` se mantiene como campo obligatorio aparte
  (lo pide `AbstractUser`), pero no se usa para iniciar sesión.
- Puerto del backend: **8001**, no 8000. En el entorno de desarrollo usado para
  construir esto, Docker Desktop (`com.docker.backend.exe`) tiene el 8000
  ocupado de forma intermitente, lo que causaba fallos de CORS impredecibles.
  Si en tu máquina el 8000 está libre, se puede usar sin problema — solo hay
  que mantener `VITE_API_URL` (frontend) y `CORS_ALLOWED_ORIGINS` (backend)
  en el mismo puerto que el frontend real.
- **Sin registro público**: los admins crean cuentas desde la pantalla
  Usuarios. El primer admin se crea con `python manage.py createsuperuser`.
- **Desactivar, no borrar**: el botón "Desactivar" en la pantalla de usuarios
  hace `PATCH is_active=false` (Django ya rechaza login de cuentas inactivas).
  No hay borrado físico de usuarios desde la UI.
- Un admin no puede desactivarse a sí mismo desde la UI (botón deshabilitado
  en `UsersScreen.tsx`) — evita que se quede sin acceso por accidente.
- **"Recuperar contraseña" sigue sin backend real** (igual que en la sesión 1):
  el botón solo muestra el aviso de "revisa tu correo", no envía nada. No se
  pidió explícitamente y no había un mecanismo de email configurado.
- **Música de tablero y video del modo inmersivo**: solo por URL, no upload de
  archivo (igual que se dejó pendiente en la sesión 1).

### Sesión 3 — docker-compose para desarrollo

El usuario pidió poder correr el proyecto en Docker. Se agregó
`docker-compose.yml` (raíz) + `Dockerfile`/`.dockerignore` en `backend/` y
`frontend/`.

| Decisión | Elegido | Alternativas descartadas |
| --- | --- | --- |
| Modo | **Dev con hot-reload** (bind mount del código, `vite`/`runserver` normales) | Build de producción con nginx + gunicorn — no pedido, el proyecto sigue en desarrollo activo |
| Puerto frontend publicado | **5174** (no 5173) | 5173 estaba ocupado en esta máquina por otro proyecto Docker corriendo en paralelo (`site_new-frontend`) — 5174 ya estaba en `CORS_ALLOWED_ORIGINS` de fábrica, así que no hizo falta tocar `.env` |
| Puerto backend publicado | **8001** (igual que en local) | Consistente con la razón ya documentada arriba (Docker Desktop ocupa el 8000 de forma intermitente) |
| node_modules / dependencias Python | **Se instalan dentro de la imagen** (`npm ci` / `pip install`), el código se monta encima con volumen | Instalar en cada arranque — más lento y no soluciona nada que la imagen no resuelva ya |

Notas:
- `docker-compose.yml` corre `python manage.py migrate` automáticamente antes
  de `runserver` en cada arranque del contenedor backend — no hace falta
  correrlo a mano la primera vez.
- `db.sqlite3` sigue viviendo en `backend/` (bind mount), así que es el mismo
  archivo tanto si se corre local como en Docker — no hay una base de datos
  paralela para el modo contenedor.
- Si `docker compose build` falla porque el daemon no está corriendo en
  Windows, hay que abrir Docker Desktop primero (puede tardar unos segundos
  en levantar el motor).

### Sesión 4 — despliegue en EC2 (IP + puerto, sin dominio todavía)

El usuario pidió desplegar en un EC2 existente (`44.196.44.72`, acceso por
`emasoft.pem`, usuario `ubuntu`). Ese servidor **no está dedicado a este
proyecto** — ya corre otros dos proyectos del usuario en Docker:

- `ema_stickers` → puerto 80 (Nginx + Django/Gunicorn + Postgres)
- `emasoft` → puerto 8080 (mismo patrón)

Ambos publican su contenedor `web` directo al host, sin un reverse proxy
compartido delante. Se reusó exactamente el patrón de esos dos proyectos
(documentado en `ema_stickers/docs/DESPLIEGUE_DOCKER_AWS.md` en ese mismo
servidor): Nginx sirve el build de React y hace proxy a Django/Gunicorn por
`/api/`, `/admin/`, `/static/`; solo el contenedor `web` se publica al host.

| Decisión | Elegido | Por qué |
| --- | --- | --- |
| Puerto publicado | **8010** | 80 y 8080 ya estaban tomados por los otros dos proyectos del mismo servidor; el usuario pidió explícitamente "un puerto diferente 8010" en vez de resolver el dominio/DNS por ahora |
| Dominio | **Ninguno todavía** | `emasoft.co` (el dominio real del usuario) ya está en producción en otro servidor (`192.99.84.49`, DNS en Dongee, con correo real: SPF+DKIM+DMARC configurados) — migrar o tocar ese DNS es una decisión aparte, de mayor riesgo, que se dejó pendiente. Ver más abajo. |
| Base de datos | **SQLite** (no Postgres) | El proyecto ya usa SQLite en dev y no tenía código para Postgres (a diferencia de `ema_stickers`); agregar Postgres era scope extra no pedido. Se persiste en un volumen Docker con nombre (`sqlite_data`) para sobrevivir a un `docker compose up -d --build`. |
| Estáticos de Django | **Whitenoise** dentro de Gunicorn (no volumen + `alias` en Nginx como en `ema_stickers`) | Más simple: no hay `media/` (este proyecto no tiene subida de archivos), así que no hacía falta la maquinaria de volúmenes compartidos — Nginx solo hace `proxy_pass` de `/static/` al backend. |
| Compose de prod | Archivo nuevo **`docker-compose.prod.yml`** (+ `Dockerfile.prod` en `backend/` y `frontend/`) separado del `docker-compose.yml` de dev que ya existía | Mismo patrón que el proyecto `emasoft` en ese servidor (que también distingue `docker-compose.yml` de dev vs `docker-compose.prod.yml`) — no se tocó el compose de desarrollo. |

**Cambios de código en `backend/` para producción** (no rompen dev local):
`kamban_backend/settings.py` — `WhiteNoiseMiddleware`, `STATIC_ROOT`,
`STORAGES` (whitenoise), `CSRF_TRUSTED_ORIGINS` (nuevo, vacío por defecto),
`DATABASES.NAME` ahora lee `SQLITE_PATH` si está seteada (si no, sigue
siendo `BASE_DIR/db.sqlite3` como siempre). También se corrigió un bug real:
`CORS_ALLOWED_ORIGINS=""` (vacío, el valor correcto en prod porque front y
back quedan bajo el mismo origen) se convertía en `['']` con `.split(',')` y
`django-cors-headers` lo rechazaba al arrancar (`corsheaders.E013`) — ahora
se filtran los strings vacíos. `requirements.txt` sumó `gunicorn` y
`whitenoise`. Nuevo `backend/entrypoint.sh` (migrate + collectstatic antes de
levantar Gunicorn) y `backend/Dockerfile.prod`.

**Frontend**: `frontend/Dockerfile.prod` (build multi-stage, Nginx sirve
`dist/`). Importante: a diferencia de `ema_stickers` (que usa
`VITE_API_URL=""` porque su `api.js` arma `${API_URL}${path}` con `path`
incluyendo ya `/api/...`), **este proyecto** arma las URLs distinto
(`lib/api.ts`: `API_BASE_URL = VITE_API_URL`, y los stores llaman
`api.get('/boards/')` sin el prefijo `/api`) — por eso acá
`VITE_API_URL` en producción debe ser `/api` (no vacío), si no todas las
rutas quedarían pegadas a `/boards/` en vez de `/api/boards/` y darían 404.

Todo esto se probó primero en local (`docker compose -p ema_kamban_prod -f
docker-compose.prod.yml up -d --build`, con `.env` de prueba) antes de tocar
el servidor — build limpio, migraciones y `collectstatic` corriendo solos,
login end-to-end con Playwright sin errores de consola/red. El `.env` de
prueba y el volumen se borraron (`down -v`) al terminar.

**Pendiente / decisión del usuario, no resuelta todavía:**
- Cómo y cuándo apuntar `emasoft.co` (o un subdominio) a este proyecto — el
  usuario prefirió NO tocar el dominio por ahora y usar IP:puerto
  directamente. Si más adelante se retoma: la arquitectura ideal para los 3
  proyectos en el mismo servidor es un reverse proxy compartido (Nginx en el
  host, o un contenedor "edge") que enrute por subdominio y le dé HTTPS a
  los tres vía Certbot — hoy `ema_stickers` y `emasoft` no tienen HTTPS
  (puerto 443 libre). Migrar esto requiere reconfigurar brevemente esos dos
  proyectos (dejan de publicar 80/8080 directo), así que no se debe hacer
  sin confirmación explícita del usuario.
- Elastic IP: no se confirmó si `44.196.44.72` es una IP elástica (fija) o
  la pública efímera de EC2 — importante antes de depender de esa IP desde
  afuera a largo plazo.
- Security Group: hay que confirmar que el puerto 8010 esté abierto a
  entrada (0.0.0.0/0 o donde corresponda) en el Security Group de la
  instancia — no se puede verificar/tocar por SSH, es configuración de AWS.

## 3. Estructura del repositorio

```
ema_kamban/                  <- raíz del repo git (este documento vive aquí dentro)
├── README.md                <- instrucciones rápidas de arranque (frontend + backend + docker)
├── docker-compose.yml        <- levanta backend + frontend en contenedores (dev, hot-reload)
├── documentacion/
│   └── PROYECTO.md           <- este archivo
├── frontend/                 <- app React (ver sección 4), incluye Dockerfile
└── backend/                  <- proyecto Django (ver sección 5), incluye Dockerfile
```

## 4. Frontend (`frontend/`)

React 19 + TypeScript + Vite. Sin librería de componentes; CSS plano por
carpeta de feature (cada componente tiene su `.css` hermano).

### 4.1 Cómo correrlo

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL, por defecto http://localhost:8001/api
npm run dev      # http://localhost:5173 (o el siguiente puerto libre)
npm run build    # type-check (tsc -b) + build de producción
npm run lint      # oxlint
```

Necesita el backend corriendo (sección 5) para poder iniciar sesión — ya **no**
hay modo sin backend ni credenciales stub.

### 4.2 Árbol de código (`src/`)

```
main.tsx                 punto de entrada, importa styles/global.css
App.tsx                  gate de auth (LoginScreen vs. HashRouter con Shell) + ruta /users protegida
types.ts                 tipos compartidos + constantes (STATUSES, BOARD_COLORS, SPRITES, ...)

styles/
  tokens.css             variables CSS de tema (dark/light), acento, radios, sombras, keyframes
  global.css              reset + clases utilitarias (.mono, .card-fade, .pop-in, .slide-in)

lib/
  api.ts                  cliente fetch: adjunta el access token, reintenta una vez con refresh en 401, ApiError
  color.ts                tint(hex, alpha) -> rgba string
  id.ts                    uid() generador de ids cortos (solo se usa ya para claves de UI, no para ids de datos)
  date.ts                  todayIso, toIso, mmss, formatShortDate
  medal.ts                 medalOf(card, status) -> medalla oro/plata/bronce
  youtube.ts               ytId(url) para extraer el id de YouTube

store/                     Zustand. theme y sesión (tokens) persisten en localStorage; boards/routines/log se cargan de la API al montar Shell
  authStore.ts             auth: 'login'|'recover'|'in', user (CurrentUser del backend), accessToken/refreshToken, login()/logout()/refreshAccessToken()/updateProfile()
  boardStore.ts            boards[] (mapea Board+Card planas de la API a columns[] por status en el cliente) + CRUD async contra /api/boards/ y /api/cards/ + moveCard + completePomodoro
  routineStore.ts          routines[] + createRoutine() -> POST /api/routines/ (el backend genera las tarjetas) + refresca el tablero afectado
  logStore.ts              log[] cargado de /api/log/; prependEntry() para insertar la entrada que ya devuelve completePomodoro sin refetch
  pomodoroStore.ts         temporizador local (mode/left/running/round/tasks/activeKey); al completar un foco llama boardStore.completePomodoro (server-side) y logStore.prependEntry
  adminUsersStore.ts        users[] (solo admins) + fetchUsers/createUser/updateUser/setActive contra /api/users/
  uiStore.ts               theme, query, modal, panel, focus, filter, month, mediaUrl, activeBoardId, ... (sprite/notify ya NO viven aquí, ver authStore.user)
  mascotStore.ts           posición/dirección/duración de la mascota + celebrate() (no persiste)

components/
  auth/LoginScreen.tsx      login real (POST /api/auth/login/) + recuperar contraseña (stub sin backend)
  layout/Navbar.tsx         navbar sticky, mide su altura con ResizeObserver -> --nav-h
  layout/UserMenu.tsx       menú del avatar (perfil/config/"Usuarios" si is_staff/cerrar sesión)
  layout/RequireStaff.tsx   guarda de ruta: redirige a /boards si el usuario no es is_staff
  layout/Shell.tsx          layout raíz: <DndContext> (@dnd-kit) + Navbar + <Outlet/> + Mascot + paneles + modales + FAB + tick del pomodoro + fetch inicial de boards/routines/log
  boards/BoardsHome.tsx      grid de tableros (home)
  board/BoardDetail.tsx      pantalla de tablero: sub-header sticky + columnas o calendario
  board/ColumnsView.tsx      4 columnas fijas, cada una un droppable de @dnd-kit (useDroppable)
  board/ActivityCardView.tsx tarjeta de actividad (draggable con @dnd-kit useDraggable, medalla, borrar, abre panel focus)
  board/DragCardPreview.tsx  tarjeta "fantasma" que sigue al cursor/dedo, usada por el <DragOverlay> de Shell
  board/dnd.ts               tipo CardDragData compartido entre el draggable y el onDragEnd de Shell
  board/CalendarView.tsx     calendario mensual reutilizado por BoardDetail y Consolidado
  consolidated/*             vista consolidada con filtro por tablero (columnas o calendario)
  routines/*                 formulario de actividades recurrentes + horario por día + listado
  log/LogScreen.tsx          registro de pomodoros agrupado por actividad
  panels/ActivityPanel.tsx   panel lateral (aside) de detalle de actividad, tabs Detalle/Pomodoros
  panels/PomodoroPanel.tsx   panel lateral del pomodoro (modos, tareas arrastrables, música, inmersivo)
  immersive/ImmersiveMode.tsx capa fija con video/YouTube + timer grande
  modals/*                   BoardModal, NewActivityModal, ProfileModal, SettingsModal + ModalsRoot (switch por modal.kind)
  admin/UsersScreen.tsx      tabla de usuarios (solo admins): crear, editar, activar/desactivar
  admin/UserFormModal.tsx    modal de alta/edición de usuario (reusa <Modal>)
  mascot/Mascot.tsx           sprite que camina aleatoriamente y celebra (dccheer + spark) al completar
  common/Modal.tsx, Select2.tsx, Fab.tsx   primitivas reutilizadas
```

### 4.3 Tokens de diseño (fuente: `design_handoff_tableros/README.md` y el método
`palette()` del prototipo `.dc.html`, líneas ~1083-1086)

Definidos en `styles/tokens.css`:

- **Paleta oscura**: `bg:#0b0d12 · text:#e8eaf0 · dim:#8f97a6 · sheet:#14181f · card:rgba(26,30,40,.94) · border:rgba(255,255,255,.10) · input:rgba(255,255,255,.06) · bar:rgba(11,13,18,.86) · panel:rgba(15,18,25,.74) · overlay:rgba(4,6,10,.62)`
- **Paleta clara**: `bg:#f3f4f7 · text:#171a21 · dim:#5f6672 · sheet:#fff · card:#fff · border:rgba(15,20,30,.11) · input:rgba(15,20,30,.05) · bar:rgba(255,255,255,.90) · panel:rgba(255,255,255,.80) · overlay:rgba(20,24,32,.45)`
- **Acento**: `oklch(0.6 0.19 268)` (índigo)
- **Colores de tablero**: `#3b82f6 #8b5cf6 #14b8a6 #f97316 #ec4899 #64748b`
- **Estados**: pending `#f59e0b` · progress `#3b82f6` · waiting `#a855f7` · done `#10b981`
- **Medallas**: oro `#f5c518`/`#c99a06` (a tiempo) · plata `#b9bec9`/`#8b929f` (≤2 días tarde) · bronce `#b06a3b`/`#8a4f28` (>2 días tarde) — lógica en `lib/medal.ts` (frontend) y espejada en `boards/views.py::CardViewSet.move` (backend)
- **Tipografía**: Plus Jakarta Sans (texto general, cargada por Google Fonts en `index.html`), JetBrains Mono (metadatos/timer, clase `.mono`)

### 4.4 Cómo fluyen los datos ahora (importante antes de tocar los stores)

- **`boardStore.boards`** sigue teniendo la forma `Board { columns: Column[] }` que
  usan todos los componentes de UI (no se tocó ningún componente de tablero/columna
  por esto). Pero la API devuelve tarjetas **planas** con un campo `status`
  (`GET /api/boards/{id}/` trae `cards: Card[]`, no columnas). La conversión pasa
  por `cardsToColumns()` en `boardStore.ts`, que agrupa por los 4 estados fijos.
  Si se agrega un campo nuevo a `Card`, hay que tocarlo en 3 sitios: el modelo
  Django, el serializer, y el mapeo `apiBoardToBoard`/`cardsToColumns` del store.
- **Ids**: el backend usa ids numéricos autoincrementales; el frontend los trata
  como `string` (se hace `String(id)` al mapear la respuesta) para no tocar los
  tipos (`ActivityCard.id: string`, etc.) que ya usaban ids de cliente en la
  sesión 1.
- **`moveCard`** llama a `POST /api/cards/{id}/move/`, que en el backend setea
  `done_at` si el nuevo estado es `done` (misma regla que antes, ahora del lado
  servidor) y dispara `mascotStore.celebrate()` del lado cliente igual que
  antes.
- **Pomodoro → registro**: al completar un bloque de foco, `pomodoroStore.tick()`
  llama `boardStore.completePomodoro(boardId, cardId, minutos)`, que hace
  `POST /api/cards/{id}/complete_pomodoro/` (incrementa `pomos` **y** crea el
  `LogEntry` atómicamente en el backend) y devuelve el entry ya armado; el store
  lo empuja a `logStore` con `prependEntry` sin volver a pedir la lista completa.
- **Rutinas**: `routineStore.createRoutine` manda el formulario tal cual a
  `POST /api/routines/`; **la generación de tarjetas día por día vive en el
  backend** (`RoutineViewSet.create`, límite de 400), no en el cliente. Después
  llama `boardStore.refreshBoard(boardId)` para traer las tarjetas nuevas.
- **Perfil (sprite / aviso de pomodoro)**: ya no vive en `uiStore` (sesión 1);
  ahora es parte de `CurrentUser` en el backend y se edita con
  `authStore.updateProfile()` (`PATCH /api/auth/me/`). `theme` sigue siendo
  puramente local (decisión: preferencia por dispositivo, no por cuenta).
- Todas las acciones async de los stores **atrapan errores y los guardan en un
  campo `error` del propio store** (no hay toasts ni un manejador global) — si
  se quiere mostrar errores en la UI, ese campo ya existe, solo falta leerlo en
  el componente correspondiente.

### 4.4b Bug importante ya corregido — no reintroducirlo

El usuario reportó que la descripción de una tarjeta se guardaba corrupta (p.
ej. solo quedaba la primera letra escrita). Causa raíz, por si el patrón
reaparece en otro componente:

- **`ActivityPanel.tsx` y `PomodoroPanel.tsx` se suscribían a
  `useBoardStore((s) => s.findCard)`**, es decir, a la referencia de la
  *función* `findCard`, no a los datos. Como esa función nunca cambia de
  referencia, **Zustand nunca disparaba un re-render** cuando `boards`
  cambiaba, así que el componente seguía mostrando (y capturando en el
  closure del `onChange`) la tarjeta tal como estaba en el primer render.
  Cada tecla partía siempre del mismo texto viejo, así que el resultado final
  era básicamente el último carácter "ganador" de esa carrera.
  - Arreglo: suscribirse directamente al dato reactivo (`useBoardStore((s) => s.boards)`)
    y derivar la tarjeta/tablero con `.find()` en el cuerpo del componente, en
    vez de leerlo a través de una función expuesta por el store. **Regla
    general**: cualquier selector de Zustand para un componente que necesita
    re-renderizarse debe devolver un *dato* que cambie de referencia cuando
    cambia lo relevante, nunca una función helper del store (esas son seguras
    de usar con `getState()` en código imperativo — como hace
    `pomodoroStore.tick()` — pero no como selector de un hook).
- Además, `boardStore.patchCard` mandaba un `PATCH` por cada tecla. Aunque el
  bug de arriba era la causa principal, también se endureció para que sea
  robusto por sí solo: los cambios de texto ahora se agrupan (debounce de
  600ms) y **nunca hay dos requests en vuelo para la misma tarjeta a la vez**
  (`scheduleCardPatch`/`flushCardPatch` en `boardStore.ts`) — si el usuario
  sigue escribiendo mientras una request está en curso, el cambio se encola y
  se manda después, para que una respuesta vieja nunca pueda pisar una más
  nueva.

### 4.4c Drag & drop real (mouse + touch) y pomodoro con duración ajustable

El drag & drop de tarjetas entre columnas y hacia el panel Pomodoro usaba la
API nativa HTML5 (`draggable`, `onDragStart/onDragOver/onDrop`). Se reemplazó
por **`@dnd-kit/core`** porque HTML5 DnD nativo **no funciona con touch** en
la mayoría de navegadores móviles, y su "drag ghost" por defecto se veía mal
(el usuario reportó que la tarjeta "desaparecía" al arrastrar).

- El `<DndContext>` vive en `layout/Shell.tsx` (no dentro de `ColumnsView`),
  porque una tarjeta se puede soltar tanto en una columna (dentro de
  `<Outlet/>`) como en la zona de "tarea activa" del panel Pomodoro (hermano
  de `<Outlet/>`) — el contexto de drag tiene que envolver a ambos.
- Sensores: `MouseSensor` (activa el drag tras 6px de movimiento, para no
  interferir con el click normal que abre el panel) + `TouchSensor` (delay de
  180ms + tolerancia de 8px, para distinguir un scroll táctil de un drag
  deliberado).
- `ActivityCardView` usa `useDraggable`; cada columna y la zona del pomodoro
  usan `useDroppable` (ids: los 4 `StatusKey` para columnas, la cadena
  `'pomodoro-dropzone'` para el panel). `Shell.tsx::onDragEnd` decide qué
  acción disparar (`moveCard` vs `addTask` del pomodoroStore) según el id
  del droppable donde se soltó.
- Efecto visual (lo pedido explícitamente): mientras se arrastra, la tarjeta
  original se queda en su columna atenuada (`.activity-card.is-dragging`,
  opacity .35) y un `<DragOverlay>` (`board/DragCardPreview.tsx`) sigue al
  cursor/dedo con sombra elevada y una leve rotación; la columna sobre la que
  se pasa por encima se resalta (`useDroppable().isOver` -> clase `.is-over`
  en `ColumnsView` y en `.pomo-tasks`).
- `uiStore` perdió `dragCardId`/`setDragCard` (ya no hace falta, dnd-kit lleva
  su propio estado de drag).

**Duración del pomodoro ajustable**: antes `focus`/`short`/`long` eran
constantes fijas (`POMODORO_DURATIONS`, 25/5/15 min, en `types.ts`, que sigue
existiendo como *valor por defecto*). Ahora `pomodoroStore` tiene un campo
`durations: Record<PomodoroMode, number>` (segundos) inicializado con esos
mismos valores por defecto, con una acción `setDuration(mode, minutos)`
(clamp 1–180 min) y **se persiste en `localStorage`** (`kamban-pomodoro`) —
si el usuario alarga su "Enfoque" a 45 min, esa preferencia sobrevive un
reload. `PomodoroPanel` agrega un stepper (−/+ de 5 en 5 minutos) debajo de
los botones de modo; el stepper se deshabilita mientras el temporizador está
corriendo (cambiar la duración de una sesión activa no tendría sentido). El
registro de pomodoros completados (`log`) usa la duración real configurada
en `durations.focus` en el momento de completar, no el valor fijo de antes.

### 4.5 Diferencias deliberadas frente al prototipo `.dc.html`

- Navegación de pantallas top-level vía `react-router` (`HashRouter`) en vez del
  estado `screen`/`view` del prototipo. Modales/paneles/inmersivo siguen siendo
  estado (no rutas), como en el original.
- Borrar un tablero pide confirmación (`window.confirm`) — el prototipo no la
  tenía; se agregó por ser una acción destructiva irreversible.
- "Música por archivo" en `BoardModal` **no está implementado** (solo URL).
- El input de "Modo inmersivo" en `PomodoroPanel` solo acepta URL (YouTube o
  video directo), no upload de archivo local.
- "¿Olvidaste tu contraseña?" no envía correo real (sin backend de mail).
- Pantalla **Usuarios** (`/users`) no existe en el prototipo original — es
  nueva de la sesión 2, pedida explícitamente por el usuario.

### 4.6 Verificación hecha

**Sesión 1** — smoke test con Playwright (localStorage, sin backend): login →
tableros home → detalle de tablero → drag & drop a Completed → consolidado →
rutinas → registro → pomodoro → configuración. Sin errores de consola.

**Sesión 2** — smoke test con Playwright contra el backend real (Django en
:8001, `npm run dev` en :5174 en esa corrida): login con el superusuario real →
crear tablero vía API → abrir tablero → crear tarjeta vía FAB → arrastrarla a
Completed → **recargar la página completa** (confirma que la tarjeta y su
medalla vinieron de la base de datos, no de memoria) → pantalla Actividades →
pantalla Usuarios → crear usuario nuevo → desactivarlo. Sin errores de consola.
Verificado además por curl: aislamiento de tableros por dueño (`colaborador1`
no ve los tableros del admin), `403` al pedir `/api/users/` sin ser `is_staff`,
y que una cuenta desactivada no puede autenticarse.

## 5. Backend (`backend/`)

Django 5 + DRF + `django-cors-headers` + `djangorestframework-simplejwt`.
Modelo de usuario personalizado, y modelos completos para tableros, tarjetas,
rutinas y registro. Ya no es solo andamiaje: es la fuente de verdad de los
datos, el frontend no tiene datos de ejemplo locales.

### 5.1 Cómo correrlo

```bash
cd backend
python -m venv .venv
./.venv/Scripts/activate      # Windows
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser   # primer admin — pide username, email, password
python manage.py runserver 8001
```

### 5.2 Apps y modelos

**`accounts`** — `AUTH_USER_MODEL = 'accounts.User'` (se definió así desde el
principio de esta sesión; si algún día hay que cambiar `USERNAME_FIELD` o
campos del usuario, probablemente haya que resetear la base de datos de dev,
igual que se hizo aquí, porque cambiar el modelo de usuario después de tener
datos reales es doloroso en Django).

- `User(AbstractUser)`: agrega `sprite` (choices de `SPRITES` del frontend) y
  `notify_on_pomodoro` (bool). `USERNAME_FIELD = 'email'`, `email` es único.
  `is_staff` = es administrador (ve `/admin/` de Django y la pantalla
  Usuarios del frontend). `is_active` = cuenta activa/desactivada.

**`boards`** — todo lo demás. Decisión de simplificación: `Card.date`,
`Card.time` y `Card.done_at` son `CharField` (strings `"YYYY-MM-DD"` /
`"HH:MM"`), no `DateField`/`TimeField`, para calzar 1:1 con el frontend y
evitar fricción de timezone/formato en ambos lados. `Routine.days` es un
`JSONField` con la misma forma que `RoutineForm['days']` del frontend
(`{mon: {on, mode, time, start, end}, ...}`) — no hay una tabla `RoutineDay`
separada.

- `Board(owner FK User, name, color, bg_type, bg_value, music_url, music_name)`
- `Card(board FK, status, title, desc, date, time, pomos, done_at)` — sin
  modelo `Column`: las 4 columnas son fijas, así que `status` alcanza.
- `Routine(board FK, title, date_from, date_to, days JSON, count)`
- `LogEntry(owner FK, card FK nullable, board FK nullable, title, board_name,
  color, minutes, at)` — `title`/`board_name`/`color` son una copia (snapshot)
  del momento en que se completó el pomodoro, para que el registro siga
  mostrando datos correctos aunque la tarjeta o el tablero se borren después
  (por eso `card`/`board` son `on_delete=SET_NULL`, no `CASCADE`).

Todos los querysets de `boards` filtran por `owner=request.user` (o
`board__owner=request.user`) — cada usuario solo ve sus propios tableros. No
hay un concepto de "tableros compartidos" ni de admin viendo tableros ajenos.

### 5.3 Endpoints

```
POST   /api/auth/login/              email + password -> {access, refresh, user}
POST   /api/auth/refresh/            refresh -> {access}
GET    /api/auth/me/                 perfil propio
PATCH  /api/auth/me/                 editar first_name/last_name/sprite/notify_on_pomodoro

GET    /api/users/                   solo is_staff — lista de cuentas
POST   /api/users/                   solo is_staff — crear cuenta (requiere password)
PATCH  /api/users/{id}/              solo is_staff — editar / is_active=false para desactivar

GET/POST         /api/boards/        tableros del usuario autenticado (incluye cards anidadas al leer)
GET/PATCH/DELETE /api/boards/{id}/

GET/POST         /api/cards/?board={id}
GET/PATCH/DELETE /api/cards/{id}/
POST /api/cards/{id}/move/                 {status} -> mueve de columna, setea done_at si status=done
POST /api/cards/{id}/complete_pomodoro/    {minutes} -> pomos += 1 y crea LogEntry en un solo paso

GET/POST  /api/routines/              POST genera las tarjetas del rango server-side (límite 400)
DELETE    /api/routines/{id}/

GET /api/log/                         solo lectura, del usuario autenticado

GET /api/health/                      AllowAny, sin datos — smoke check
```

### 5.4 Auth y seguridad

- JWT vía `djangorestframework-simplejwt`. `ACCESS_TOKEN_LIFETIME=1h`,
  `REFRESH_TOKEN_LIFETIME=7d` (`kamban_backend/settings.py::SIMPLE_JWT`).
- `REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]` — todo
  requiere login por defecto; los pocos endpoints públicos (`health`, login,
  refresh) tienen `AllowAny` explícito.
- El frontend (`lib/api.ts`) reintenta automáticamente una vez con
  `refreshAccessToken()` si una llamada devuelve 401; si el refresh también
  falla, hace `logout()` y vuelve al login.
- CORS: `CORS_ALLOWED_ORIGINS` en `.env`, por defecto incluye `:5173` y
  `:5174` (Vite cambia de puerto si el primero está ocupado — ver nota del
  puerto 8001 en la sección 2).

### 5.5 Qué falta / próximos pasos naturales

1. **Registro público** si algún día se necesita gente que se cree su propia
   cuenta (hoy solo admins crean cuentas desde `/users`).
2. **Recuperar contraseña real** (envío de correo con token, endpoint que lo
   valide). Requiere configurar un backend de email en Django.
3. **Subida de archivos** (música de tablero, video inmersivo, avatar) — hoy
   solo se aceptan URLs; requeriría `MEDIA_ROOT`/`MEDIA_URL` y un serializer
   con `FileField`/`ImageField`.
4. **Tests automatizados** — no hay ni `pytest` ni `tests.py` reales todavía
   (los `tests.py` que genera `startapp` están vacíos).
5. **Paginación** en `/api/users/` y `/api/log/` si las listas crecen mucho
   (hoy DRF los devuelve completos, sin paginar).
6. Si se necesita que un admin vea/gestione tableros de otros usuarios (no
   pedido todavía), hay que decidir el modelo de permisos — hoy es
   estrictamente "cada quien ve lo suyo".

## 6. Cómo retomar

1. Leer este documento completo (sección 2 tiene las decisiones y sus porqués,
   sección 4.4 explica cómo fluyen los datos antes de tocar cualquier store).
2. Si hay dudas de diseño visual/comportamiento, contrastar contra
   `../front_kamban/design_handoff_tableros/README.md` (fuente de verdad del
   diseño original — pero el backend/auth/multiusuario son decisiones de esta
   sesión, no estaban en el handoff).
3. Levantar ambos:
   ```bash
   cd backend && ./.venv/Scripts/activate && python manage.py runserver 8001
   cd frontend && npm run dev
   ```
   Si no existe superusuario todavía: `python manage.py createsuperuser`.
4. Antes de cambiar el modelo de usuario o el esquema de `Board`/`Card`, tener
   en cuenta que puede haber datos reales en `db.sqlite3` (no asumir que es un
   mock descartable) — coordinar con el usuario antes de un reset de base de
   datos.
5. Si el entorno es nuevo (checkout limpio), `node_modules/` y `.venv/` pueden
   no tener todo lo que pide `package.json`/`requirements.txt` aunque ya
   existan como carpetas — correr `npm install` (frontend) y
   `pip install -r requirements.txt` (backend, con el venv activado) antes de
   asumir que falta código. Así se destapó, en la sesión que agregó Inicio/
   Histórico, que faltaban `@dnd-kit/core` y `djangorestframework-simplejwt`
   instalados pese a estar en los manifiestos.
