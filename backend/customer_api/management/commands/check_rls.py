"""Verifica se a RLS está realmente valendo — smoke test pós-ativação.

Rode DEPOIS de aplicar backend/db/rls.sql e trocar o DATABASE_URL para o role
`revisacar_app`:

    python manage.py check_rls

O que checa (tudo read-only, não altera dados):
  1. Papel/conexão atual e se ele tem BYPASSRLS (se tiver, a RLS NÃO se aplica —
     você ainda está conectado como `postgres`).
  2. RLS habilitada + forçada em cada tabela isolada.
  3. Prova de isolamento: com um customer_id inexistente no contexto, as tabelas
     com RLS devem devolver ZERO linhas; com um customer real, só as linhas dele.

Sai com código != 0 se qualquer checagem falhar (útil em script/deploy).
"""
import uuid

from django.core.management.base import BaseCommand
from django.db import connection

RLS_TABLES = [
    "customer_vehicles", "appointments", "estimates", "service_history",
    "notifications", "maintenance_reminders", "vehicle_documents",
    "estimate_items", "service_history_items",
]


class Command(BaseCommand):
    help = "Verifica se a Row-Level Security está ativa e isolando os dados."

    def handle(self, *args, **options):
        if connection.vendor != "postgresql":
            self.stdout.write(self.style.WARNING(
                "Banco não é PostgreSQL (vendor=%s) — RLS não se aplica. Pulando." % connection.vendor
            ))
            return

        problems = []
        with connection.cursor() as cur:
            # 1) papel atual + bypassrls -----------------------------------------
            cur.execute("select current_user, rolbypassrls from pg_roles where rolname = current_user")
            role, bypass = cur.fetchone()
            self.stdout.write(f"Conectado como: {role}")
            if bypass:
                problems.append(
                    f"O papel '{role}' tem BYPASSRLS=true — a RLS é IGNORADA. "
                    f"Troque o DATABASE_URL para o role 'revisacar_app'."
                )
                self.stdout.write(self.style.ERROR("  BYPASSRLS=true (a RLS não vai valer com este papel)"))
            else:
                self.stdout.write(self.style.SUCCESS("  BYPASSRLS=false (ok)"))

            # 2) RLS habilitada + forçada por tabela -----------------------------
            self.stdout.write("\nStatus de RLS por tabela:")
            for t in RLS_TABLES:
                cur.execute(
                    "select relrowsecurity, relforcerowsecurity from pg_class where relname = %s", [t]
                )
                row = cur.fetchone()
                if not row:
                    problems.append(f"Tabela '{t}' não encontrada.")
                    self.stdout.write(self.style.ERROR(f"  {t}: não encontrada"))
                    continue
                enabled, forced = row
                if enabled and forced:
                    self.stdout.write(self.style.SUCCESS(f"  {t}: enabled+forced ✓"))
                else:
                    problems.append(f"Tabela '{t}': RLS enabled={enabled} forced={forced} (esperado true/true).")
                    self.stdout.write(self.style.ERROR(f"  {t}: enabled={enabled} forced={forced}"))

            # 3) prova de isolamento (só se o papel não faz bypass) --------------
            if not bypass:
                self.stdout.write("\nProva de isolamento (customer_vehicles):")
                ghost = str(uuid.uuid4())  # cliente que não existe
                cur.execute("select set_config('app.customer_id', %s, false)", [ghost])
                cur.execute("select count(*) from customer_vehicles")
                ghost_count = cur.fetchone()[0]
                if ghost_count == 0:
                    self.stdout.write(self.style.SUCCESS("  contexto inexistente → 0 linhas ✓"))
                else:
                    problems.append(f"Contexto inexistente devolveu {ghost_count} linhas (esperado 0) — RLS não filtra.")
                    self.stdout.write(self.style.ERROR(f"  contexto inexistente → {ghost_count} linhas (deveria ser 0)"))

                # caminho positivo: 'customers' não tem RLS, então achamos ids reais
                # ali e, para cada, setamos o contexto e conferimos que só vêm linhas dele.
                cur.execute("select id from customers limit 20")
                sample_ids = [r[0] for r in cur.fetchall()]
                real_ok = None
                for cid in sample_ids:
                    cur.execute("select set_config('app.customer_id', %s, false)", [str(cid)])
                    cur.execute("select count(*), count(*) filter (where customer_id <> %s) from customer_vehicles", [str(cid)])
                    total, foreign = cur.fetchone()
                    if total > 0:
                        real_ok = (cid, total, foreign)
                        break
                if real_ok is None:
                    self.stdout.write(self.style.WARNING(
                        "  nenhum cliente com veículos para testar o caminho positivo (ok se o banco está vazio)"
                    ))
                else:
                    cid, total, foreign = real_ok
                    if foreign == 0:
                        self.stdout.write(self.style.SUCCESS(
                            f"  contexto de um cliente real → {total} linha(s), todas dele ✓"
                        ))
                    else:
                        problems.append(f"Cliente {cid}: {foreign} de {total} linhas são de OUTRO cliente — vazamento.")
                        self.stdout.write(self.style.ERROR(
                            f"  contexto de cliente real → {foreign}/{total} linhas de OUTRO cliente (vazamento!)"
                        ))

            # limpa o contexto
            cur.execute("select set_config('app.customer_id', '', false)")

        self.stdout.write("")
        if problems:
            self.stdout.write(self.style.ERROR(f"RLS com problemas ({len(problems)}):"))
            for p in problems:
                self.stdout.write(self.style.ERROR(f"  - {p}"))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS("RLS ativa e isolando os dados. ✓"))
