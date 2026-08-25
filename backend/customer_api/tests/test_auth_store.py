"""Testes da segurança (rate limiting + tokens de reset) no ORM/banco de teste."""
import time

import pytest

from customer_api import auth_store
from customer_api.models import Customer, AuthRateLimit, PasswordResetToken


# ── Rate limiting ─────────────────────────────────────────────────────────────

def test_rate_limit_bloqueia_apos_maximo(db):
    email = "a@x.com"
    for _ in range(5):
        assert auth_store.is_allowed(email, "login", max_attempts=5, window_seconds=900)
        auth_store.record_attempt(email, "login")
    assert not auth_store.is_allowed(email, "login", max_attempts=5, window_seconds=900)


def test_rate_limit_sucesso_limpa(db):
    email = "a@x.com"
    for _ in range(5):
        auth_store.record_attempt(email, "login")
    assert not auth_store.is_allowed(email, "login", max_attempts=5, window_seconds=900)
    auth_store.clear_attempts(email, "login")
    assert auth_store.is_allowed(email, "login", max_attempts=5, window_seconds=900)


def test_rate_limit_janela_expira(db):
    email = "a@x.com"
    old = time.time() - 1000  # fora da janela
    for _ in range(5):
        AuthRateLimit.objects.create(bucket=email, kind="login", created_at=old)
    assert auth_store.is_allowed(email, "login", max_attempts=5, window_seconds=900)


def test_rate_limit_isola_por_bucket_e_kind(db):
    for _ in range(5):
        auth_store.record_attempt("a@x.com", "login")
    assert auth_store.is_allowed("b@x.com", "login", max_attempts=5, window_seconds=900)
    assert auth_store.is_allowed("a@x.com", "forgot", max_attempts=5, window_seconds=900)


# ── Tokens de reset ───────────────────────────────────────────────────────────

@pytest.fixture
def customer(db):
    return Customer.objects.create(name="Ana", email="ana@x.com", pwhash="x")


def test_reset_token_valido_depois_usado(customer):
    auth_store.save_reset_token("tok", customer_id=str(customer.id), email=customer.email, expires_at=time.time() + 100)
    assert auth_store.get_valid_reset_token("tok") == {"customer_id": str(customer.id), "email": customer.email}
    auth_store.mark_reset_token_used("tok")
    assert auth_store.get_valid_reset_token("tok") is None  # não reutilizável


def test_reset_token_expirado(customer):
    auth_store.save_reset_token("tok", customer_id=str(customer.id), email=customer.email, expires_at=time.time() - 1)
    assert auth_store.get_valid_reset_token("tok") is None


def test_reset_token_guardado_com_hash(customer):
    auth_store.save_reset_token("segredo", customer_id=str(customer.id), email=customer.email, expires_at=time.time() + 100)
    row = PasswordResetToken.objects.first()
    assert row.token_hash == auth_store.hash_token("segredo")
    assert row.token_hash != "segredo"


def test_reset_token_inexistente(db):
    assert auth_store.get_valid_reset_token("nao-existe") is None


# ── Tokens de verificação de e-mail ───────────────────────────────────────────

def test_verification_token_valido_depois_usado(customer):
    auth_store.save_verification_token("vtok", customer_id=str(customer.id), email=customer.email, expires_at=time.time() + 100)
    assert auth_store.get_valid_verification_token("vtok") == {"customer_id": str(customer.id), "email": customer.email}
    auth_store.mark_verification_token_used("vtok")
    assert auth_store.get_valid_verification_token("vtok") is None


def test_verification_token_expirado(customer):
    auth_store.save_verification_token("vtok", customer_id=str(customer.id), email=customer.email, expires_at=time.time() - 1)
    assert auth_store.get_valid_verification_token("vtok") is None
