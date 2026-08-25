"""Testes da segurança durável (rate limiting + tokens de reset), com
FakeSupabase no lugar do banco real."""
import time

import pytest

from customer_api import auth_store, services
from customer_api.tests.fake_supabase import FakeSupabase


@pytest.fixture
def fake(monkeypatch):
    sb = FakeSupabase()
    monkeypatch.setattr(services, "get_client", lambda: sb)
    return sb


# ── Rate limiting ─────────────────────────────────────────────────────────────

def test_rate_limit_bloqueia_apos_maximo(fake):
    email = "a@x.com"
    for _ in range(5):
        assert auth_store.is_allowed(email, "login", max_attempts=5, window_seconds=900)
        auth_store.record_attempt(email, "login")
    assert not auth_store.is_allowed(email, "login", max_attempts=5, window_seconds=900)


def test_rate_limit_sucesso_limpa(fake):
    email = "a@x.com"
    for _ in range(5):
        auth_store.record_attempt(email, "login")
    assert not auth_store.is_allowed(email, "login", max_attempts=5, window_seconds=900)
    auth_store.clear_attempts(email, "login")
    assert auth_store.is_allowed(email, "login", max_attempts=5, window_seconds=900)


def test_rate_limit_janela_expira(fake, monkeypatch):
    email = "a@x.com"
    # grava tentativas "antigas" (fora da janela)
    old = time.time() - 1000
    for _ in range(5):
        fake.rows("auth_rate_limit").append({"bucket": email, "kind": "login", "created_at": old})
    assert auth_store.is_allowed(email, "login", max_attempts=5, window_seconds=900)


def test_rate_limit_isola_por_bucket_e_kind(fake):
    for _ in range(5):
        auth_store.record_attempt("a@x.com", "login")
    # outro e-mail e outro tipo não são afetados
    assert auth_store.is_allowed("b@x.com", "login", max_attempts=5, window_seconds=900)
    assert auth_store.is_allowed("a@x.com", "forgot", max_attempts=5, window_seconds=900)


# ── Tokens de reset ───────────────────────────────────────────────────────────

def test_reset_token_valido_depois_usado(fake):
    auth_store.save_reset_token("tok", customer_id="c1", email="a@x.com", expires_at=time.time() + 100)
    assert auth_store.get_valid_reset_token("tok") == {"customer_id": "c1", "email": "a@x.com"}
    auth_store.mark_reset_token_used("tok")
    assert auth_store.get_valid_reset_token("tok") is None  # não reutilizável


def test_reset_token_expirado(fake):
    auth_store.save_reset_token("tok", customer_id="c1", email="a@x.com", expires_at=time.time() - 1)
    assert auth_store.get_valid_reset_token("tok") is None


def test_reset_token_guardado_com_hash(fake):
    auth_store.save_reset_token("segredo", customer_id="c1", email="a@x.com", expires_at=time.time() + 100)
    rows = fake.rows("password_reset_tokens")
    assert rows[0]["token_hash"] == auth_store.hash_token("segredo")
    assert "segredo" not in [v for r in rows for v in r.values()]


def test_reset_token_inexistente(fake):
    assert auth_store.get_valid_reset_token("nao-existe") is None
