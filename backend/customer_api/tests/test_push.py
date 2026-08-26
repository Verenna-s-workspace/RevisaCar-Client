"""Web Push: inscrição (upsert), cancelamento, auth e envio env-gated."""
import jwt as pyjwt
import pytest
from django.conf import settings
from rest_framework.test import APIClient

from customer_api import push
from customer_api.models import Customer, PushSubscription
from customer_api.serializers import pw_hash


def _token(cid: str) -> str:
    return pyjwt.encode({"customer_id": cid}, settings.SECRET_KEY, algorithm="HS256")


@pytest.fixture
def customer(db):
    return Customer.objects.create(name="Ana", email="ana@x.com", pwhash=pw_hash("x"))


def _client(customer):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {_token(str(customer.id))}")
    return c


SUB = {"endpoint": "https://push.example/abc", "keys": {"p256dh": "p", "auth": "a"}}


def test_subscribe_cria_e_faz_upsert(customer):
    c = _client(customer)
    r = c.post("/api/customer/push/subscribe", SUB, format="json")
    assert r.status_code == 201
    assert PushSubscription.objects.filter(endpoint=SUB["endpoint"]).count() == 1

    # mesmo endpoint de novo → atualiza, não duplica
    r2 = c.post("/api/customer/push/subscribe", {**SUB, "keys": {"p256dh": "p2", "auth": "a2"}}, format="json")
    assert r2.status_code == 201
    subs = PushSubscription.objects.filter(endpoint=SUB["endpoint"])
    assert subs.count() == 1 and subs.first().p256dh == "p2"


def test_subscribe_invalido_400(customer):
    r = _client(customer).post("/api/customer/push/subscribe", {"endpoint": "x"}, format="json")
    assert r.status_code == 400


def test_subscribe_exige_auth(db):
    r = APIClient().post("/api/customer/push/subscribe", SUB, format="json")
    assert r.status_code == 401


def test_unsubscribe_remove(customer):
    c = _client(customer)
    c.post("/api/customer/push/subscribe", SUB, format="json")
    r = c.post("/api/customer/push/unsubscribe", {"endpoint": SUB["endpoint"]}, format="json")
    assert r.status_code == 200
    assert PushSubscription.objects.filter(endpoint=SUB["endpoint"]).count() == 0


def test_public_key_reflete_config(customer, settings):
    settings.VAPID_PUBLIC_KEY = ""
    settings.VAPID_PRIVATE_KEY = ""
    r = _client(customer).get("/api/customer/push/public-key")
    assert r.status_code == 200
    assert r.data == {"enabled": False, "publicKey": ""}


def test_send_desligado_e_noop(customer, settings):
    settings.VAPID_PUBLIC_KEY = ""
    settings.VAPID_PRIVATE_KEY = ""
    PushSubscription.objects.create(customer=customer, endpoint="e", p256dh="p", auth="a")
    assert push.send_to_customer(customer.id, "t", "b") == 0  # no-op sem chaves
