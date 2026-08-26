"""Web Push (notificações push) — inscrição + envio.

Env-gated: fica inerte enquanto as chaves VAPID não forem configuradas
(VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). Gere um par com:

    python -c "from py_vapid import Vapid01; v=Vapid01(); v.generate_keys(); \
        import base64; \
        print('PUBLIC', base64.urlsafe_b64encode(v.public_key.public_bytes(...)))"

ou, mais simples, com o utilitário `vapid --gen` do pacote py-vapid.
O envio nunca derruba o fluxo chamador: qualquer erro é logado e engolido, e
inscrições mortas (404/410) são removidas automaticamente.
"""
import json
import logging

from django.conf import settings

from .models import PushSubscription

logger = logging.getLogger(__name__)


def is_enabled() -> bool:
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)


def public_key() -> str:
    return settings.VAPID_PUBLIC_KEY


def _send_one(sub: PushSubscription, payload: str) -> bool:
    from pywebpush import webpush, WebPushException
    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
        )
        return True
    except WebPushException as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        if status in (404, 410):
            sub.delete()  # inscrição expirada/cancelada — limpa
        else:
            logger.warning("Web push falhou (%s...): %s", sub.endpoint[:40], exc)
        return False
    except Exception as exc:  # noqa: BLE001 — envio nunca pode derrubar o chamador
        logger.warning("Web push erro inesperado: %s", exc)
        return False


def send_to_customer(customer_id, title: str, body: str, url: str | None = None) -> int:
    """Envia uma notificação push para todos os dispositivos do cliente.

    Retorna quantos envios tiveram sucesso. No-op (0) se as chaves VAPID não
    estiverem configuradas.
    """
    if not is_enabled():
        return 0
    payload = json.dumps({"title": title, "body": body, "url": url or "/"})
    sent = 0
    for sub in PushSubscription.objects.filter(customer_id=customer_id):
        if _send_one(sub, payload):
            sent += 1
    return sent
