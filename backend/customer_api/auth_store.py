"""Segurança de autenticação: rate limiting (anti brute-force) e tokens de
recuperação de senha — no Django ORM (Postgres).

Guardamos apenas o hash SHA-256 dos tokens (vazamento do banco não expõe tokens
utilizáveis). Rate limiting em tabela (não em memória) para valer com múltiplas
instâncias. Degrada com segurança: se o banco falhar, leituras de rate limit
liberam (fail-open — o login já depende do banco) e escritas apenas logam.
"""
import hashlib
import logging
import time

from . import models

logger = logging.getLogger(__name__)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ── Rate limiting ─────────────────────────────────────────────────────────────

def is_allowed(bucket: str, kind: str, *, max_attempts: int, window_seconds: int) -> bool:
    """True se ainda há tentativas dentro da janela. Não registra."""
    try:
        cutoff = time.time() - window_seconds
        count = models.AuthRateLimit.objects.filter(
            bucket=bucket, kind=kind, created_at__gt=cutoff
        ).count()
    except Exception as exc:
        logger.error("[rate_limit] leitura falhou (%s/%s): %s", kind, bucket, exc)
        return True  # fail-open sob indisponibilidade do banco
    return count < max_attempts


def record_attempt(bucket: str, kind: str):
    try:
        models.AuthRateLimit.objects.create(bucket=bucket, kind=kind, created_at=time.time())
    except Exception as exc:
        logger.error("[rate_limit] registro falhou (%s/%s): %s", kind, bucket, exc)


def clear_attempts(bucket: str, kind: str):
    try:
        models.AuthRateLimit.objects.filter(bucket=bucket, kind=kind).delete()
    except Exception as exc:
        logger.error("[rate_limit] limpeza falhou (%s/%s): %s", kind, bucket, exc)


# ── Tokens de recuperação de senha ────────────────────────────────────────────

def save_reset_token(token: str, *, customer_id: str, email: str, expires_at: float):
    models.PasswordResetToken.objects.create(
        token_hash=hash_token(token),
        customer_id=customer_id,
        email=email,
        expires_at=expires_at,
        used=False,
    )


def get_valid_reset_token(token: str):
    """Retorna {customer_id, email} se o token existe, não foi usado e não expirou."""
    try:
        row = models.PasswordResetToken.objects.filter(token_hash=hash_token(token)).first()
    except Exception as exc:
        logger.error("[reset] leitura falhou: %s", exc)
        return None
    if not row or row.used or (row.expires_at or 0) < time.time():
        return None
    return {"customer_id": str(row.customer_id), "email": row.email}


def mark_reset_token_used(token: str):
    try:
        models.PasswordResetToken.objects.filter(token_hash=hash_token(token)).update(used=True)
    except Exception as exc:
        logger.error("[reset] marcar usado falhou: %s", exc)


# ── Tokens de verificação de e-mail ───────────────────────────────────────────

def save_verification_token(token: str, *, customer_id: str, email: str, expires_at: float):
    models.EmailVerificationToken.objects.create(
        token_hash=hash_token(token),
        customer_id=customer_id,
        email=email,
        expires_at=expires_at,
        used=False,
    )


def get_valid_verification_token(token: str):
    """Retorna {customer_id, email} se o token existe, não foi usado e não expirou."""
    try:
        row = models.EmailVerificationToken.objects.filter(token_hash=hash_token(token)).first()
    except Exception as exc:
        logger.error("[verify] leitura falhou: %s", exc)
        return None
    if not row or row.used or (row.expires_at or 0) < time.time():
        return None
    return {"customer_id": str(row.customer_id), "email": row.email}


def mark_verification_token_used(token: str):
    try:
        models.EmailVerificationToken.objects.filter(token_hash=hash_token(token)).update(used=True)
    except Exception as exc:
        logger.error("[verify] marcar usado falhou: %s", exc)
