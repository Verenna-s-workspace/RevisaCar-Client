"""Testes das helpers de view sem tocar em rede/DRF completo:
- _supabase_err não vaza detalhes internos da exceção ao cliente
- _decode_bearer valida o JWT corretamente
"""
import jwt as pyjwt
from django.conf import settings

from customer_api.views import _supabase_err, _decode_bearer


class _FakeRequest:
    """Request mínimo — só o que _decode_bearer lê."""
    def __init__(self, auth_header=None):
        self.META = {}
        if auth_header is not None:
            self.META["HTTP_AUTHORIZATION"] = auth_header


# ── _supabase_err ─────────────────────────────────────────────────────────────

def test_supabase_err_nao_vaza_excecao():
    resp = _supabase_err(Exception("postgres://user:senha@host/db caiu"))
    assert resp.status_code == 503
    # a mensagem ao cliente é genérica — nada de credenciais/stack
    assert "senha" not in resp.data["detail"]
    assert "postgres" not in resp.data["detail"]
    assert resp.data["detail"] == "Serviço temporariamente indisponível"


def test_supabase_err_sem_excecao():
    resp = _supabase_err()
    assert resp.status_code == 503
    assert "detail" in resp.data


# ── _decode_bearer ────────────────────────────────────────────────────────────

def _token(payload):
    return pyjwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def test_decode_bearer_valido():
    tok = _token({"customer_id": "c1", "name": "Ana"})
    result = _decode_bearer(_FakeRequest(f"Bearer {tok}"))
    assert result == {"id": "c1", "name": "Ana"}


def test_decode_bearer_usa_sub_como_fallback():
    tok = _token({"sub": "c9"})
    result = _decode_bearer(_FakeRequest(f"Bearer {tok}"))
    assert result["id"] == "c9"


def test_decode_bearer_sem_header():
    assert _decode_bearer(_FakeRequest(None)) is None


def test_decode_bearer_sem_prefixo_bearer():
    assert _decode_bearer(_FakeRequest("Token abc")) is None


def test_decode_bearer_assinatura_invalida():
    forjado = pyjwt.encode({"customer_id": "x"}, "chave-errada", algorithm="HS256")
    assert _decode_bearer(_FakeRequest(f"Bearer {forjado}")) is None
