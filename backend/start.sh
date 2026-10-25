#!/usr/bin/env sh
# Entrypoint de produção.
#
# O schema do banco é dono das migrations SQL versionadas (db/migrations no repositório
# do mecânico, tabela public.schema_migrations) — o banco é compartilhado com o app da
# oficina. Por isso o Django NÃO migra no boot: o `migrate` tentava recriar tabelas que
# já existem e falhava em silêncio.
#
# Marcar as migrations do Django como aplicadas, UMA vez em produção (sem DDL):
#     python manage.py migrate --fake
# Para forçar migrate no boot (só dev/banco novo): RUN_MIGRATIONS=1
set -e

if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
  python manage.py migrate --noinput
fi

exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 2 --timeout 60
