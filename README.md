# Tableros

Gestor de actividades por tableros (kanban) con pomodoro, calendario, actividades
recurrentes y una mascota pixel-art. Basado en el handoff de diseño en
`../front_kamban/design_handoff_tableros`.

## Frontend (`frontend/`)

React + TypeScript + Vite. Todo el estado (tableros, tarjetas, rutinas, registro,
pomodoro) vive en Zustand y se persiste en `localStorage` — no depende del backend
todavía.

```bash
cd frontend
npm install
npm run dev
```

Sirve en `http://localhost:5173`. Usuario de prueba: cualquier correo/contraseña
entra (el login del prototipo no valida credenciales).

## Backend (`backend/`)

Proyecto Django + Django REST Framework, listo para conectarse al frontend
(CORS habilitado para `http://localhost:5173`). Por ahora solo expone
`GET /api/health/` como comprobación; los modelos y endpoints de tableros,
actividades, rutinas y autenticación quedan pendientes.

```bash
cd backend
python -m venv .venv
./.venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

Sirve en `http://localhost:8000`.
