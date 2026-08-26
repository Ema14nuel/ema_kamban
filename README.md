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

## Usuarios y roles

No hay registro público: los administradores (`is_staff=True`) crean cuentas
desde **Usuarios** (menú del avatar, solo visible para admins) — nombre,
correo, contraseña y si la cuenta es admin. Desde ahí también se edita o se
desactiva una cuenta (no se borra); una cuenta desactivada no puede iniciar
sesión. El primer admin es el superusuario creado con `createsuperuser`.
