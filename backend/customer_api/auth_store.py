"""Persistência durável de segurança de autenticação: rate limiting (anti
brute-force) e tokens de recuperação de senha.

Guardamos apenas o hash SHA-256 dos tokens — um vazamento do banco não expõe
tokens utilizáveis. Rate limiting fica em tabela (não em memória) para valer
com múltiplas instâncias. Requer as tabelas `auth_rate_limit` e
`password_reset_tokens` (ver backend/db/schema.sql).

Degrada com segurança: se o banco falhar, leituras de rate limit liberam
(fail-open — o próprio login já depende do banco) e escritas apenas logam.
"""
import hashlib
import logging
import time

logger = logging.getLogger(__name__)

RATE_TABLE = "auth_rate_limit"
RESET_TABLE = "password_reset_tokens"


def _client():
    from . import services
    return services.get_client()


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ── Rate limiting ─────────────────────────────────────────────────────────────

def _recent_count(bucket: str, kind: str, window_seconds: int):
    try:
        res = _client().table(RATE_TABLE).select("created_at").eq("bucket", bucket).eq("kind", kind).execute()
    except Exception as exc:
        logger.error("[rate_limit] leitura falhou (%s/%s): %s", kind, bucket, exc)
        return None
    cutoff = time.time() - window_seconds
    return sum(1 for r in (res.data or []) if (r.get("created_at") or 0) > cutoff)


def record_attempt(bucket: str, kind: str):
    try:
        _client().table(RATE_TABLE).insert({"bucket": bucket, "kind": kind, "created_at": time.time()}).execute()
    except Exception as exc:
        logger.error("[rate_limit] registro falhou (%s/%s): %s", kind, bucket, exc)


def clear_attempts(bucket: str, kind: str):
    try:
        _client().table(RATE_TABLE).delete().eq("bucket", bucket).eq("kind", kind).execute()
    except Exception as exc:
        logger.error("[rate_limit] limpeza falhou (%s/%s): %s", kind, bucket, exc)


def is_allowed(bucket: str, kind: str, *, max_attempts: int, window_seconds: int) -> bool:
    """True se ainda há tentativas dentro da janela. Não registra — chame
    record_attempt() após a tentativa (sucesso limpa via clear_attempts)."""
    count = _recent_count(bucket, kind, window_seconds)
    if count is None:
        return True  # fail-open sob indisponibilidade do banco
    return count < max_attempts


# ── Tokens de recuperação de senha ────────────────────────────────────────────

def save_reset_token(token: str, *, customer_id: str, email: str, expires_at: float):
    row = {
        "token_hash": hash_token(token),
        "customer_id": customer_id,
        "email": email,
        "expires_at": expires_at,
        "used": False,
    }
    _client().table(RESET_TABLE).insert(row).execute()


def get_valid_reset_token(token: str):
    """Retorna {customer_id, email} se o token existe, não foi usado e não expirou."""
    try:
        res = _client().table(RESET_TABLE).select("*").eq("token_hash", hash_token(token)).execute()
    except Exception as exc:
        logger.error("[reset] leitura falhou: %s", exc)
        return None
    rows = res.data or []
    if not rows:
        return None
    row = rows[0]
    if row.get("used") or (row.get("expires_at") or 0) < time.time():
        return None
    return {"customer_id": row.get("customer_id"), "email": row.get("email")}


def mark_reset_token_used(token: str):
    try:
        _client().table(RESET_TABLE).update({"used": True}).eq("token_hash", hash_token(token)).execute()
    except Exception as exc:
        logger.error("[reset] marcar usado falhou: %s", exc)
