# Tableros — documentación del proyecto

> Este documento existe para que una futura sesión (humana o de IA) pueda
> retomar el trabajo sin releer todo el historial de chat. Resume qué se
> construyó, por qué, qué decisiones se tomaron y qué falta.

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

## 2. Decisiones tomadas (y por qué)

Preguntadas explícitamente al usuario al iniciar el proyecto:

| Decisión | Elegido | Alternativas descartadas |
| --- | --- | --- |
| Alcance inicial | **Todo el handoff de una vez** (las 13 secciones) | Núcleo primero / solo esqueleto |
| Stack | **React + TypeScript + Vite** | React + JS |
| Estilos | **CSS plano con variables CSS** (tokens del handoff como custom properties) | Tailwind / styled-components |
| Estado global | **Zustand + localStorage** (no hay backend funcional todavía) | Redux Toolkit / Context API |
| Backend | Solo **crear el proyecto Django** para que pueda conectarse al frontend, sin modelos ni lógica de negocio todavía | — |

Routing: se decidió (sin preguntar, por ser detalle de implementación) usar
**react-router-dom con `HashRouter`** para las pantallas de nivel superior
(`/boards`, `/boards/:id`, `/consolidated`, `/routines`, `/log`), mientras que
modales, paneles laterales, modo inmersivo y menú de usuario viven en un store
de Zustand (`uiStore`) en vez de rutas, igual que en el prototipo original.

## 3. Estructura del repositorio

```
ema_kamban/                  <- raíz del repo git (este documento vive aquí dentro)
├── README.md                <- instrucciones rápidas de arranque (frontend + backend)
├── documentacion/
│   └── PROYECTO.md           <- este archivo
├── frontend/                 <- app React (ver sección 4)
└── backend/                  <- proyecto Django (ver sección 5)
```

## 4. Frontend (`frontend/`)

React 19 + TypeScript + Vite. Sin librería de componentes; CSS plano por
carpeta de feature (cada componente tiene su `.css` hermano).

### 4.1 Cómo correrlo

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check (tsc -b) + build de producción
npm run lint      # oxlint
```

El login del prototipo **no valida credenciales**: cualquier correo/contraseña
entra (`authStore.doLogin`). No hay conexión real al backend todavía; el login
es un stub deliberado, tal como el prototipo original.

### 4.2 Árbol de código (`src/`)

```
main.tsx                 punto de entrada, importa styles/global.css
App.tsx                  gate de auth (LoginScreen vs. HashRouter con Shell)
types.ts                 tipos compartidos + constantes (STATUSES, BOARD_COLORS, SPRITES, ...)

styles/
  tokens.css             variables CSS de tema (dark/light), acento, radios, sombras, keyframes
  global.css              reset + clases utilitarias (.mono, .card-fade, .pop-in, .slide-in)

lib/
  color.ts                tint(hex, alpha) -> rgba string
  id.ts                    uid() generador de ids cortos
  date.ts                  todayIso, toIso, mmss, formatShortDate
  medal.ts                 medalOf(card, status) -> medalla oro/plata/bronce
  youtube.ts               ytId(url) para extraer el id de YouTube

store/                     Zustand, cada uno persiste en localStorage salvo pomodoroStore y mascotStore
  boardStore.ts            boards[] con columnas/tarjetas + CRUD + moveCard + datos semilla (4 tableros de ejemplo)
  authStore.ts             auth: 'login' | 'recover' | 'in', datos de usuario
  uiStore.ts               theme, query, modal, panel, focus, filter, month, sprite, notify, mediaUrl, activeBoardId, ...
  routineStore.ts          routines[] + createRoutine() (genera tarjetas por rango de fechas, límite 400)
  logStore.ts              log[] de sesiones de pomodoro completadas
  pomodoroStore.ts         temporizador (mode/left/running/round/tasks/activeKey) + tick() + completeFocus()
  mascotStore.ts           posición/dirección/duración de la mascota + celebrate() (no persiste)

components/
  auth/LoginScreen.tsx      pantalla fija z-index alto, login + recuperar contraseña
  layout/Navbar.tsx         navbar sticky, mide su altura con ResizeObserver -> --nav-h
  layout/UserMenu.tsx       menú del avatar (perfil/config/cerrar sesión)
  layout/Shell.tsx          layout raíz: Navbar + <Outlet/> + Mascot + paneles + modales + FAB + tick del pomodoro
  boards/BoardsHome.tsx      grid de tableros (home)
  board/BoardDetail.tsx      pantalla de tablero: sub-header sticky + columnas o calendario
  board/ColumnsView.tsx      4 columnas fijas con drag & drop (HTML5 DnD)
  board/ActivityCardView.tsx tarjeta de actividad (draggable, medalla, borrar, abre panel focus)
  board/CalendarView.tsx     calendario mensual reutilizado por BoardDetail y Consolidado
  consolidated/*             vista consolidada con filtro por tablero (columnas o calendario)
  routines/*                 formulario de actividades recurrentes + horario por día + listado
  log/LogScreen.tsx          registro de pomodoros agrupado por actividad
  panels/ActivityPanel.tsx   panel lateral (aside) de detalle de actividad, tabs Detalle/Pomodoros
  panels/PomodoroPanel.tsx   panel lateral del pomodoro (modos, tareas arrastrables, música, inmersivo)
  immersive/ImmersiveMode.tsx capa fija con video/YouTube + timer grande
  modals/*                   BoardModal, NewActivityModal, ProfileModal, SettingsModal + ModalsRoot (switch por modal.kind)
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
- **Medallas**: oro `#f5c518`/`#c99a06` (a tiempo) · plata `#b9bec9`/`#8b929f` (≤2 días tarde) · bronce `#b06a3b`/`#8a4f28` (>2 días tarde) — lógica en `lib/medal.ts`
- **Tipografía**: Plus Jakarta Sans (texto general, cargada por Google Fonts en `index.html`), JetBrains Mono (metadatos/timer, clase `.mono`)

### 4.4 Lógica de negocio ya portada del prototipo (no reinventar si se toca)

- `moveCard(boardId, cardId, 'done')` → setea `doneAt = todayIso()` y dispara
  `mascotStore.celebrate()` (import cruzado boardStore -> mascotStore).
- `medalOf(card, status)`: solo aplica si `status === 'done'`; compara `doneAt`
  (o fecha de hoy si falta) contra `card.date`.
- `routineStore.createRoutine`: recorre día por día entre `from` y `to`, respeta
  el horario configurado por día de la semana (`mon..sun`), límite de
  **400 tarjetas** por programación, las crea todas en la columna `pending`.
- `pomodoroStore.tick()`: se llama cada segundo desde `Shell.tsx` (un solo
  `setInterval` global). Al llegar a 0 en modo `focus`, incrementa `pomos` de
  la tarjeta activa y agrega una entrada a `logStore`.
- La mascota (`mascotStore.step()`) se reposiciona cada 3.4s a una posición
  aleatoria (4%-88%), con duración de transición proporcional a la distancia
  (mínimo 1.8s) — igual que el prototipo original.

### 4.5 Diferencias deliberadas frente al prototipo `.dc.html`

- Navegación de pantallas top-level vía `react-router` (`HashRouter`) en vez del
  estado `screen`/`view` del prototipo. Modales/paneles/inmersivo siguen siendo
  estado (no rutas), como en el original.
- Borrar un tablero pide confirmación (`window.confirm`) — el prototipo no la
  tenía; se agregó por ser una acción destructiva irreversible.
- "Música por archivo" en `BoardModal` **no está implementado** (solo URL). El
  handoff pedía URL o archivo; se dejó pendiente.
- El input de "Modo inmersivo" en `PomodoroPanel` solo acepta URL (YouTube o
  video directo), no upload de archivo local.

### 4.6 Verificación hecha

Se corrió un smoke test con Playwright (headless Chromium) cubriendo: login →
tableros home → detalle de tablero → drag & drop de una tarjeta a Completed
(dispara medalla + celebración de mascota) → consolidado → actividades
recurrentes → registro → panel pomodoro → modal de configuración (sprites).
Sin errores de consola. Capturas revisadas visualmente, coinciden con la
especificación del handoff.

## 5. Backend (`backend/`)

Django 5 + Django REST Framework + django-cors-headers. **Solo el andamiaje**,
sin modelos de dominio (tableros/tarjetas/rutinas/registro) ni autenticación
real todavía — el frontend hoy vive de Zustand + localStorage.

### 5.1 Cómo correrlo

```bash
cd backend
python -m venv .venv
./.venv/Scripts/activate      # Windows
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver    # http://localhost:8000
```

### 5.2 Qué existe

- App `boards` (creada con `startapp`, vacía salvo el endpoint de salud).
- `GET /api/health/` → `{"status":"ok","service":"kamban_backend"}` (sin auth,
  `AllowAny`) — único endpoint real hoy, sirve para probar la conexión.
- `kamban_backend/settings.py`: `CORS_ALLOWED_ORIGINS` lee de `.env`
  (por defecto `http://localhost:5173,http://127.0.0.1:5173`, que es donde
  corre Vite), `SECRET_KEY`/`DEBUG`/`ALLOWED_HOSTS` también vienen de `.env`
  vía `python-dotenv`.
- SQLite por defecto (`db.sqlite3`, gitignored).
- `requirements.txt` generado con `pip freeze` (Django 5.2.17, DRF 3.18,
  django-cors-headers 4.9, python-dotenv 1.2.3).

### 5.3 Qué falta (próximos pasos naturales)

1. Modelos: `Board`, `Column`/`Status` (o mantener los 4 estados fijos como
   choices), `Card`/`Activity`, `Routine`, `PomodoroLogEntry`, y usuario/auth
   real (o usar `django.contrib.auth` + DRF token/session auth).
2. Endpoints REST (serializers + viewsets) que reflejen las formas ya
   definidas en `frontend/src/types.ts` — así el store de Zustand se puede
   migrar a llamar la API sin rediseñar las formas de datos.
3. Migrar `boardStore`/`routineStore`/`logStore` del frontend: hoy usan
   `zustand/middleware persist` con `localStorage`; el patrón recomendado es
   mantener Zustand como cache local pero que las acciones (`addCard`,
   `moveCard`, `createRoutine`, etc.) llamen a `fetch`/axios contra el backend
   y sincronicen el estado con la respuesta.
4. Autenticación real: `authStore.doLogin` hoy acepta cualquier credencial;
   conectar contra un endpoint de login de Django (session o JWT) y quitar el
   stub.
5. Subida de archivos (música de tablero, video del modo inmersivo, avatar)
   si se decide soportarlos — hoy solo se aceptan URLs.

## 6. Cómo retomar

1. Leer este documento completo.
2. Si hay dudas de diseño visual/comportamiento, contrastar contra
   `../front_kamban/design_handoff_tableros/README.md` (fuente de verdad).
3. `cd frontend && npm install && npm run dev` para ver el estado actual.
4. Antes de tocar el backend, decidir con el usuario el modelo de datos
   (sección 5.3, punto 1) — es la pieza que más determina el resto.
