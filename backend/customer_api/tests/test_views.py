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
# Agora o token só vale se for de ACESSO, da conta certa e com a senha atual.

import pytest  # noqa: E402

from customer_api.models import Customer  # noqa: E402
from customer_api.serializers import pw_hash  # noqa: E402
from customer_api.views import _make_tokens  # noqa: E402


@pytest.fixture
def ana(db):
    return Customer.objects.create(name="Ana", email="ana@x.com", pwhash=pw_hash("senha12345"))


def _token(payload):
    return pyjwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def test_decode_bearer_valido(ana):
    tok = _make_tokens(str(ana.id), "Ana", ana.pwhash)["access"]
    assert _decode_bearer(_FakeRequest(f"Bearer {tok}")) == {"id": str(ana.id), "name": "Ana"}


def test_decode_bearer_recusa_refresh_como_access(ana):
    refresh = _make_tokens(str(ana.id), "Ana", ana.pwhash)["refresh"]
    assert _decode_bearer(_FakeRequest(f"Bearer {refresh}")) is None


def test_decode_bearer_recusa_token_sem_tipo(ana):
    tok = _token({"customer_id": str(ana.id), "name": "Ana"})
    assert _decode_bearer(_FakeRequest(f"Bearer {tok}")) is None


def test_decode_bearer_cai_quando_a_senha_muda(ana):
    tok = _make_tokens(str(ana.id), "Ana", ana.pwhash)["access"]
    ana.pwhash = pw_hash("outra-senha-123")
    ana.save()
    assert _decode_bearer(_FakeRequest(f"Bearer {tok}")) is None


def test_decode_bearer_cliente_inexistente(db):
    tok = _make_tokens("6f1c3a52-0d1f-4c8e-9a3e-1b2c3d4e5f60", "X", "hash")["access"]
    assert _decode_bearer(_FakeRequest(f"Bearer {tok}")) is None


def test_decode_bearer_id_malformado(db):
    tok = _make_tokens("nao-e-uuid", "X", "hash")["access"]
    assert _decode_bearer(_FakeRequest(f"Bearer {tok}")) is None


def test_decode_bearer_sem_header():
    assert _decode_bearer(_FakeRequest(None)) is None


def test_decode_bearer_sem_prefixo_bearer():
    assert _decode_bearer(_FakeRequest("Token abc")) is None


def test_decode_bearer_assinatura_invalida():
    forjado = pyjwt.encode({"customer_id": "x", "token_type": "access"}, "chave-errada-com-32-bytes-ou-mais!", algorithm="HS256")
    assert _decode_bearer(_FakeRequest(f"Bearer {forjado}")) is None


# ── Settings de segurança ─────────────────────────────────────────────────────

def test_cors_nunca_libera_todas_as_origens():
    assert settings.CORS_ALLOW_ALL_ORIGINS is False
    assert settings.CORS_ALLOW_CREDENTIALS is True


def test_normaliza_origem_sem_scheme():
    from config.settings import _normalize_origin
    assert _normalize_origin("web.onrender.com/") == "https://web.onrender.com"
    assert _normalize_origin(" http://localhost:5174 ") == "http://localhost:5174"
    assert _normalize_origin("") == ""
