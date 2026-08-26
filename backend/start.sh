#!/usr/bin/env sh
# Entrypoint de produção. O free tier do Render não suporta preDeployCommand,
# então migramos no boot (migrate é idempotente).
#
# Tolerante a falha de propósito: se o DATABASE_URL apontar para o role
# `revisacar_app` (RLS ativa, sem permissão de DDL), o app ainda sobe — nesse
# cenário rode `migrate` uma vez com o usuário admin (postgres).
set -e

python manage.py migrate --noinput \
  || echo "[start] migrate falhou/pulado — seguindo (rode migrate com o usuário admin se preciso)"

exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 2 --timeout 60
