"""O refresh token vai num cookie httpOnly — nunca no corpo/JS (anti-XSS)."""
import pytest
from django.conf import settings
from rest_framework.test import APIClient

from customer_api.models import Customer
from customer_api.serializers import pw_hash

COOKIE = settings.REFRESH_COOKIE_NAME


@pytest.fixture
def customer(db):
    return Customer.objects.create(
        name="Ana", email="ana@x.com", phone="11999999999",
        pwhash=pw_hash("senha12345"), email_verified=True,
    )


def test_login_poe_refresh_no_cookie_httponly_e_nao_no_corpo(customer):
    c = APIClient()
    r = c.post("/api/customer/auth/login", {"email": "ana@x.com", "password": "senha12345"}, format="json")
    assert r.status_code == 200
    assert "access" in r.data
    assert "refresh" not in r.data            # não vaza para o JS
    cookie = r.cookies.get(COOKIE)
    assert cookie is not None and cookie.value  # veio no cookie
    assert cookie["httponly"]                 # inacessível ao document.cookie
    assert cookie["path"] == settings.REFRESH_COOKIE_PATH


def test_register_tambem_usa_cookie(db):
    c = APIClient()
    r = c.post("/api/customer/auth/register", {
        "name": "Bea", "email": "bea@x.com", "phone": "11888888888",
        "password": "senha12345", "password_confirm": "senha12345",
    }, format="json")
    assert r.status_code == 201
    assert "refresh" not in r.data
    assert r.cookies.get(COOKIE).value


def test_refresh_le_do_cookie_sem_body(customer):
    c = APIClient()
    login = c.post("/api/customer/auth/login", {"email": "ana@x.com", "password": "senha12345"}, format="json")
    c.cookies[COOKIE] = login.cookies[COOKIE].value  # o navegador reenvia o cookie
    r = c.post("/api/customer/auth/refresh", {}, format="json")  # corpo vazio
    assert r.status_code == 200
    assert r.data["access"]


def test_refresh_sem_cookie_nem_body_falha(db):
    c = APIClient()
    r = c.post("/api/customer/auth/refresh", {}, format="json")
    assert r.status_code == 400


def test_logout_apaga_o_cookie(customer):
    c = APIClient()
    c.post("/api/customer/auth/login", {"email": "ana@x.com", "password": "senha12345"}, format="json")
    r = c.post("/api/customer/auth/logout")
    assert r.status_code == 200
    # o cookie é reescrito vazio/expirado
    assert r.cookies[COOKIE].value == ""
