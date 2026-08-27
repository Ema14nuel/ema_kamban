#!/bin/sh
set -e

if [ -n "$SQLITE_PATH" ]; then
  mkdir -p "$(dirname "$SQLITE_PATH")"
fi

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@"
