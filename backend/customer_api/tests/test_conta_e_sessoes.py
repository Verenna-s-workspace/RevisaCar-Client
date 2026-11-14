"""Sessões revogáveis, troca de senha, sair de todos os aparelhos, exclusão de
conta e exportação de dados (LGPD)."""
import pytest
from django.conf import settings
from rest_framework.test import APIClient

from customer_api.models import (
    Customer, CustomerVehicle, Notification, OficinaCliente, PushSubscription,
)
from customer_api.serializers import pw_hash

SENHA = "senha12345"


@pytest.fixture
def ana(db):
    return Customer.objects.create(name="Ana", email="ana@x.com", pwhash=pw_hash(SENHA), phone="11999990000")


def _login(cliente, senha=SENHA):
    api = APIClient()
    r = api.post("/api/customer/auth/login", {"email": cliente.email, "password": senha}, format="json")
    assert r.status_code == 200, r.content
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")
    return api


def test_troca_de_senha_derruba_outras_sessoes_e_mantem_esta(ana):
    celular, notebook = _login(ana), _login(ana)
    r = notebook.post("/api/customer/me/change-password",
                      {"old_password": SENHA, "new_password": "nova-senha-123", "new_password_confirm": "nova-senha-123"},
                      format="json")
    assert r.status_code == 200, r.content
    assert celular.get("/api/customer/me").status_code == 401           # outra sessão caiu
    notebook.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")
    assert notebook.get("/api/customer/me").status_code == 200          # este aparelho segue
    assert settings.REFRESH_COOKIE_NAME in r.cookies


def test_refresh_antigo_nao_vale_depois_da_troca(ana):
    api = APIClient()
    api.post("/api/customer/auth/login", {"email": ana.email, "password": SENHA}, format="json")
    assert api.post("/api/customer/auth/refresh").status_code == 200
    ana.pwhash = pw_hash("trocada-123")
    ana.save()
    assert api.post("/api/customer/auth/refresh").status_code == 401


def test_sair_de_todos_os_aparelhos(ana):
    outro, este = _login(ana), _login(ana)
    assert este.post("/api/customer/me/logout-all", {"password": "errada"}, format="json").status_code == 400
    r = este.post("/api/customer/me/logout-all", {"password": SENHA}, format="json")
    assert r.status_code == 200
    assert outro.get("/api/customer/me").status_code == 401
    este.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")
    assert este.get("/api/customer/me").status_code == 200
    assert _login(ana).get("/api/customer/me").status_code == 200       # a senha continua a mesma


def test_excluir_conta_pede_senha(ana):
    api = _login(ana)
    assert api.post("/api/customer/me/delete", {"password": "errada"}, format="json").status_code == 400
    assert Customer.objects.get(id=ana.id).email == "ana@x.com"


def test_excluir_conta_anonimiza_apaga_e_derruba_sessao(ana):
    v = CustomerVehicle.objects.create(customer=ana, brand="Fiat", model="Uno", year=2015, plate="AAA1A11", renavam="123")
    Notification.objects.create(customer=ana, title="Oi", type="sistema")
    PushSubscription.objects.create(customer=ana, endpoint="https://push/x", p256dh="p", auth="a")
    OficinaCliente.objects.create(oficina_doc="11222333000181", customer=ana, origem="convite", status="ativo")
    api = _login(ana)

    r = api.post("/api/customer/me/delete", {"password": SENHA}, format="json")
    assert r.status_code == 200

    c = Customer.objects.get(id=ana.id)
    assert c.email is None and c.pwhash is None and c.phone == "" and c.name == "Conta excluída"
    assert not Notification.objects.filter(customer=ana).exists()
    assert not PushSubscription.objects.filter(customer=ana).exists()
    v.refresh_from_db()
    assert v.deleted and v.renavam == ""
    assert OficinaCliente.objects.get(customer=ana).status == "revogado"
    assert api.get("/api/customer/me").status_code == 401
    # o e-mail fica livre para um cadastro novo
    r = APIClient().post("/api/customer/auth/register", {
        "name": "Ana Nova", "email": "ana@x.com", "phone": "11988887777",
        "password": "senha-nova-123", "password_confirm": "senha-nova-123",
    }, format="json")
    assert r.status_code == 201, r.content


def test_exportar_dados(ana):
    CustomerVehicle.objects.create(customer=ana, brand="Fiat", model="Uno", year=2015, plate="AAA1A11")
    r = _login(ana).get("/api/customer/me/export")
    assert r.status_code == 200
    assert "attachment" in r["Content-Disposition"]
    d = r.json()
    assert d["perfil"]["email"] == "ana@x.com"
    assert "pwhash" not in d["perfil"]
    assert len(d["veiculos"]) == 1
