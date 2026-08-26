"""O comando check_rls não deve quebrar em sqlite (testes/CI) — pula com aviso."""
from io import StringIO

from django.core.management import call_command


def test_check_rls_pula_em_sqlite():
    out = StringIO()
    # em sqlite não há RLS: sai sem erro e avisa que pulou
    call_command("check_rls", stdout=out)
    assert "não é PostgreSQL" in out.getvalue()
