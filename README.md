# Tableros

Gestor de actividades por tableros (kanban) con pomodoro, calendario, actividades
recurrentes y una mascota pixel-art. Basado en el handoff de diseño en
`../front_kamban/design_handoff_tableros`.

Arquitectura: React (frontend) + Django REST Framework (backend), autenticación
por JWT. El frontend ya no usa datos de ejemplo en `localStorage`: tableros,
tarjetas, rutinas y registro de pomodoros se leen y escriben contra la API real.

## Backend (`backend/`)

Django + DRF + `djangorestframework-simplejwt`. Expone:

- `POST /api/auth/login/`, `POST /api/auth/refresh/`, `GET/PATCH /api/auth/me/`
- `GET/POST/PATCH/DELETE /api/boards/`, `/api/cards/`, `/api/routines/`, `/api/log/` (solo del usuario autenticado)
- `GET/POST/PATCH /api/users/` — solo administradores (`is_staff`), para crear/editar/desactivar cuentas

```bash
cd backend
python -m venv .venv
./.venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser   # crea el primer admin
python manage.py runserver 8001
```

Sirve en `http://localhost:8001`. Se usa el puerto 8001 (no 8000) porque en
algunos entornos con Docker Desktop el 8000 ya está ocupado por su proxy
interno; si en tu máquina el 8000 está libre puedes usarlo, solo ajusta
`VITE_API_URL` en el frontend a juego.

## Frontend (`frontend/`)

React + TypeScript + Vite. Estado en Zustand: la UI (tema, modales, paneles,
pomodoro corriendo) sigue siendo local, pero tableros/tarjetas/rutinas/registro
y la sesión de usuario hablan con el backend.

```bash
cd frontend
npm install
cp .env.example .env   # ajusta VITE_API_URL si tu backend corre en otro puerto
npm run dev
```

Sirve en `http://localhost:5173` (o el siguiente puerto libre si ese está
ocupado). Inicia sesión con el correo/contraseña del superusuario que creaste
en el backend.

## Docker

Levanta ambos servicios con hot-reload (equivalente a correr `npm run dev` y
`manage.py runserver` a mano, pero en contenedores):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build
```

- Backend en `http://localhost:8001` (corre `migrate` automáticamente al
  arrancar el contenedor).
- Frontend en `http://localhost:5174` (dentro del contenedor Vite escucha en
  el puerto 5173; se publica en 5174 porque en esta máquina el 5173 ya lo usa
  otro proyecto — si en la tuya está libre, cambiá el mapeo de puertos en
  `docker-compose.yml` a `5173:5173`).
- El código de `backend/` y `frontend/` está montado como volumen, así que los
  cambios se reflejan sin reconstruir la imagen; solo hay que reconstruir
  (`docker compose build`) si cambia `requirements.txt` o `package.json`.
- `db.sqlite3` vive en `backend/` igual que en modo local, así que los datos
  persisten entre reinicios del contenedor.
- Antes del primer login hace falta un admin: `docker compose exec backend
  python manage.py createsuperuser`.

## Docker (producción)

`docker-compose.prod.yml` levanta el build real (React compilado servido por
Nginx + Gunicorn, sin dev servers) más un contenedor de **Postgres** — es lo
que corre en el EC2. Los datos persisten en un volumen con nombre
(`postgres_data`) para que sobrevivan a un rebuild de la imagen.

```bash
cp .env.prod.example .env
nano .env   # DJANGO_SECRET_KEY real, DJANGO_ALLOWED_HOSTS, CSRF_TRUSTED_ORIGINS, DB_PASSWORD
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

Sirve todo en el puerto **8010** (Nginx es el único contenedor publicado al
host; `backend` y `db` no están expuestos, solo se hablan por la red interna
de Docker). Para actualizar tras un cambio de código:

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker image prune -f
```

`docker-compose.yml` (dev) también levanta Postgres en contenedor, igual que
producción — no hace falta instalar Postgres a mano para desarrollar.

Detalles de por qué está armado así (puerto 8010, Postgres en contenedor en
vez de RDS, sin dominio todavía) en `documentacion/PROYECTO.md`, secciones
"Sesión 4" y "Sesión 4b".

## Usuarios y roles

No hay registro público: los administradores (`is_staff=True`) crean cuentas
desde **Usuarios** (menú del avatar, solo visible para admins) — nombre,
correo, contraseña y si la cuenta es admin. Desde ahí también se edita o se
desactiva una cuenta (no se borra); una cuenta desactivada no puede iniciar
sesión. El primer admin es el superusuario creado con `createsuperuser`.
