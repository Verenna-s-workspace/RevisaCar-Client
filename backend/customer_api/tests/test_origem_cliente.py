"""Cadastro de balcão (origem="oficina") convive com contas do app sem interferir.

O banco é compartilhado com o app da oficina: ela cadastra clientes no balcão (sem senha,
privados dela) e o e-mail pode coincidir com o de uma conta do app. Login, cadastro e
recuperação de senha só podem enxergar contas do APP.
"""
import pytest
from django.db import IntegrityError, transaction
from rest_framework.test import APIClient

from customer_api import services
from customer_api.models import Customer
from customer_api.serializers import pw_hash as make_password


def _balcao(email="ana@x.com", doc="11111111000111", name="Ana Balcão"):
    return Customer.objects.create(name=name, email=email, origem="oficina", oficina_origem_doc=doc, pwhash=None)


def _app(email="ana@x.com", senha="senha12345"):
    return Customer.objects.create(name="Ana App", email=email, pwhash=make_password(senha))


@pytest.mark.parametrize("balcao_primeiro", [True, False])
def test_busca_por_email_ignora_balcao_independente_da_ordem(db, balcao_primeiro):
    if balcao_primeiro:
        _balcao()
        app = _app()
    else:
        app = _app()
        _balcao()
    achado = services.get_customer_by_email("ana@x.com")
    assert achado["id"] == str(app.id)
    assert achado["origem"] == "app"


def test_busca_por_email_ignora_maiusculas(db):
    app = _app(email="ana@x.com")
    assert services.get_customer_by_email("  ANA@X.com ")["id"] == str(app.id)


def test_email_so_de_balcao_nao_conta_como_conta_do_app(db):
    _balcao(email="so-balcao@x.com")
    assert services.get_customer_by_email("so-balcao@x.com") is None


def test_busca_com_email_vazio_nao_devolve_balcao_sem_email(db):
    Customer.objects.create(name="Sem e-mail", email=None, origem="oficina", oficina_origem_doc="1")
    assert services.get_customer_by_email("") is None
    assert services.get_customer_by_email(None) is None


def test_duas_contas_do_app_com_mesmo_email_sao_barradas_pelo_banco(db):
    _app(email="dup@x.com")
    with pytest.raises(IntegrityError), transaction.atomic():
        _app(email="DUP@x.com")


def test_balcao_pode_repetir_email_de_conta_do_app(db):
    _app(email="igual@x.com")
    _balcao(email="igual@x.com")  # não levanta
    assert Customer.objects.filter(email="igual@x.com").count() == 2


def test_login_nunca_autentica_cadastro_de_balcao(db):
    _balcao(email="ana@x.com")
    r = APIClient().post("/api/customer/auth/login", {"email": "ana@x.com", "password": "qualquer-coisa"}, format="json")
    assert r.status_code == 401


def test_login_funciona_mesmo_com_balcao_de_mesmo_email(db):
    _balcao(email="ana@x.com")
    _app(email="ana@x.com", senha="senha12345")
    r = APIClient().post("/api/customer/auth/login", {"email": "ana@x.com", "password": "senha12345"}, format="json")
    assert r.status_code == 200
    assert r.json()["customer"]["name"] == "Ana App"


def test_cadastro_nao_e_bloqueado_por_email_que_so_existe_no_balcao(db):
    _balcao(email="novo@x.com")
    r = APIClient().post(
        "/api/customer/auth/register",
        {"name": "Novo", "email": "novo@x.com", "password": "senha12345", "password_confirm": "senha12345", "phone": "11999999999"},
        format="json",
    )
    assert r.status_code == 201
    assert Customer.objects.filter(email="novo@x.com", origem="app").count() == 1
