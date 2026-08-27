#!/bin/sh
set -e

if [ "$DB_ENGINE" = "postgres" ]; then
  echo "Esperando la base de datos en ${DB_HOST}:${DB_PORT:-5432} ..."
  while ! nc -z "$DB_HOST" "${DB_PORT:-5432}"; do
    sleep 1
  done
  echo "Base de datos disponible"
elif [ -n "$SQLITE_PATH" ]; then
  mkdir -p "$(dirname "$SQLITE_PATH")"
fi

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@"
