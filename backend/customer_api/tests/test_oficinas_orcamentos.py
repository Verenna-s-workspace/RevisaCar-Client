"""Carteira de oficinas (convite), pedido de agendamento com oficina e orçamentos enviados pela oficina.

Tabelas do app da oficina (admins, ordens, orcamentos, orcamento_itens) não são do Django: aqui são
criadas no sqlite de teste só para exercitar as leituras. A função SQL `oficina_convite_usar` (plpgsql)
é testada contra Postgres no app da oficina; aqui ela é simulada nas views.
"""
import datetime
import uuid
from decimal import Decimal

import pytest
from django.db import connection
from django.utils import timezone
from rest_framework.test import APIClient

from customer_api import services
from customer_api.models import (
    Appointment, AvailabilitySlot, Customer, CustomerVehicle, Oficina, OficinaCliente,
    Orcamento, OrcamentoItem, Ordem,
)
from customer_api.serializers import pw_hash

OFICINA_A, OFICINA_B = "11222333000181", "44555666000199"


@pytest.fixture(autouse=True)
def tabelas_da_oficina(db):
    with connection.cursor() as cur:  # DDL cru: o schema_editor do sqlite não roda dentro da transação do teste
        cur.execute("create table admins (id integer primary key, doc text, nome text)")
        cur.execute("create table ordens (id text primary key, oficina_doc text, customer_id char(32), os_num text, placa text, modelo text, status text)")
        cur.execute("create table orcamentos (id char(32) primary key, oficina_doc text, ordem_id text, versao integer, status text, validade_ate date,"
                    " observacoes text, total decimal, enviado_em datetime, aprovado_em datetime, recusado_em datetime, motivo_recusa text, created_at datetime)")
        cur.execute("create table orcamento_itens (id char(32) primary key, orcamento_id char(32), posicao integer, tipo text, descricao text,"
                    " marca text, quantidade decimal, preco_unitario decimal)")
    Oficina.objects.create(id=1, doc=OFICINA_A, nome="Auto Center A")
    Oficina.objects.create(id=2, doc=OFICINA_B, nome="Mecânica B")


def _cliente(email="ana@x.com"):
    return Customer.objects.create(name="Ana", email=email, pwhash=pw_hash("senha12345"))


def _api(cliente, senha="senha12345"):
    api = APIClient()
    r = api.post("/api/customer/auth/login", {"email": cliente.email, "password": senha}, format="json")
    assert r.status_code == 200, r.content
    token = r.json().get("access") or r.json().get("access_token") or r.json()["tokens"]["access"]
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api


def _vincular(cliente, doc, status="ativo"):
    return OficinaCliente.objects.create(oficina_doc=doc, customer=cliente, origem="convite", status=status,
                                         confirmado_em=timezone.now() if status == "ativo" else None)


def _veiculo(cliente):
    return CustomerVehicle.objects.create(customer=cliente, brand="Fiat", model="Uno", year=2015, plate="AAA1A11")


def _pedido(api, veiculo, **extra):
    corpo = {"vehicle_id": str(veiculo.id), "service_type": "Revisão",
             "date": str(datetime.date.today() + datetime.timedelta(days=3)), "time_slot": "09:00"}
    corpo.update(extra)
    return api.post("/api/customer/appointments", corpo, format="json")


# ── Oficinas ──────────────────────────────────────────────────────────────────

def test_lista_so_oficinas_ativas_do_proprio_cliente():
    ana, bia = _cliente(), _cliente("bia@x.com")
    _vincular(ana, OFICINA_A)
    _vincular(ana, OFICINA_B, status="revogado")
    _vincular(bia, OFICINA_B)
    r = _api(ana).get("/api/customer/oficinas")
    assert r.status_code == 200
    assert [(o["oficina_doc"], o["nome"]) for o in r.json()] == [(OFICINA_A, "Auto Center A")]
    assert APIClient().get("/api/customer/oficinas").status_code == 401


def test_usar_convite_chama_a_funcao_do_banco_e_devolve_a_oficina(monkeypatch):
    ana = _cliente()
    chamadas = []

    def falso(codigo, customer_id):
        chamadas.append((codigo, customer_id))
        return {"ok": True, "codigo": "vinculado", "novo": True, "oficina": {"oficina_doc": OFICINA_A, "nome": "Auto Center A"}}

    monkeypatch.setattr(services, "usar_convite", falso)
    codigo = str(uuid.uuid4())
    r = _api(ana).post("/api/customer/oficinas/convite", {"codigo": codigo}, format="json")
    assert r.status_code == 201 and r.json()["oficina"]["nome"] == "Auto Center A"
    assert chamadas == [(codigo, str(ana.id))]  # o cliente vem do token, nunca do corpo


@pytest.mark.parametrize("codigo,http", [("convite_invalido", 400), ("convite_expirado", 400),
                                         ("convite_esgotado", 400), ("vinculo_bloqueado", 403)])
def test_convite_recusado_pela_funcao(monkeypatch, codigo, http):
    monkeypatch.setattr(services, "usar_convite", lambda c, i: {"ok": False, "codigo": codigo, "mensagem": "Não."})
    r = _api(_cliente()).post("/api/customer/oficinas/convite", {"codigo": str(uuid.uuid4())}, format="json")
    assert r.status_code == http and r.json()["detail"] == "Não."


def test_convite_ja_vinculado_devolve_200(monkeypatch):
    monkeypatch.setattr(services, "usar_convite", lambda c, i: {"ok": True, "codigo": "ja_vinculado", "novo": False,
                                                                "oficina": {"oficina_doc": OFICINA_A, "nome": "A"}})
    assert _api(_cliente()).post("/api/customer/oficinas/convite", {"codigo": str(uuid.uuid4())}, format="json").status_code == 200


def test_convite_exige_login_e_codigo():
    assert APIClient().post("/api/customer/oficinas/convite", {"codigo": str(uuid.uuid4())}, format="json").status_code == 401
    assert _api(_cliente()).post("/api/customer/oficinas/convite", {}, format="json").status_code == 422


@pytest.mark.parametrize("lixo", ["abc", "", "123", "' or 1=1 --", "00000000-0000-0000-0000-00000000000"])
def test_codigo_mal_formado_nem_chega_ao_banco(lixo):
    res = services.usar_convite(lixo, str(uuid.uuid4()))
    assert res["ok"] is False and res["codigo"] == "convite_invalido"


# ── Pedido de agendamento ─────────────────────────────────────────────────────

def test_pedido_sem_oficina_vinculada_e_recusado():
    ana = _cliente()
    r = _pedido(_api(ana), _veiculo(ana))
    assert r.status_code == 422 and "oficina_doc" in r.json()
    assert Appointment.objects.count() == 0


def test_pedido_usa_a_unica_oficina_do_cliente():
    ana = _cliente(); _vincular(ana, OFICINA_A)
    r = _pedido(_api(ana), _veiculo(ana))
    assert r.status_code == 201, r.content
    ap = Appointment.objects.get()
    assert ap.oficina_doc == OFICINA_A and ap.status == "pendente"


def test_com_duas_oficinas_precisa_escolher_e_so_vale_vinculada():
    ana = _cliente(); _vincular(ana, OFICINA_A); _vincular(ana, OFICINA_B)
    api, v = _api(ana), _veiculo(ana)
    assert _pedido(api, v).status_code == 422
    assert _pedido(api, v, oficina_doc="99999999999999").status_code == 422
    assert _pedido(api, v, oficina_doc=OFICINA_B).status_code == 201
    assert Appointment.objects.get().oficina_doc == OFICINA_B


def test_vinculo_revogado_nao_permite_pedir():
    ana = _cliente(); _vincular(ana, OFICINA_A, status="revogado")
    assert _pedido(_api(ana), _veiculo(ana), oficina_doc=OFICINA_A).status_code == 422


# ── Disponibilidade por oficina ───────────────────────────────────────────────

def test_horarios_da_oficina_mais_os_gerais():
    dia = datetime.date.today() + datetime.timedelta(days=2)
    AvailabilitySlot.objects.create(date=dia, time_slot="08:00", oficina_doc=None)
    AvailabilitySlot.objects.create(date=dia, time_slot="09:00", oficina_doc=OFICINA_A)
    AvailabilitySlot.objects.create(date=dia, time_slot="10:00", oficina_doc=OFICINA_B)
    api = APIClient()
    pega = lambda q: [t[:5] for t in api.get(f"/api/customer/availability/times?date={dia}{q}").json()["times"]]
    assert pega("") == ["08:00", "09:00", "10:00"]                      # sem oficina: comportamento antigo
    assert pega(f"&oficina_doc={OFICINA_A}") == ["08:00", "09:00"]
    assert pega(f"&oficina_doc={OFICINA_B}") == ["08:00", "10:00"]


# ── Orçamentos ────────────────────────────────────────────────────────────────

def _orcamento(ordem_id, doc=OFICINA_A, status="enviado", total="350.00", versao=1, itens=True):
    o = Orcamento.objects.create(id=uuid.uuid4(), oficina_doc=doc, ordem_id=ordem_id, versao=versao, status=status,
                                 total=Decimal(total), observacoes="Válido por 7 dias", created_at=timezone.now(),
                                 enviado_em=timezone.now())
    if itens:
        OrcamentoItem.objects.create(id=uuid.uuid4(), orcamento_id=o.id, posicao=1, tipo="peca", descricao="Filtro de óleo",
                                     marca="Mann", quantidade=Decimal("1"), preco_unitario=Decimal("50.00"))
        OrcamentoItem.objects.create(id=uuid.uuid4(), orcamento_id=o.id, posicao=2, tipo="servico", descricao="Mão de obra",
                                     marca="", quantidade=Decimal("2"), preco_unitario=Decimal("150.00"))
    return o


def _os(cliente, doc=OFICINA_A, ordem_id=None, os_num="OS-1"):
    return Ordem.objects.create(id=ordem_id or str(uuid.uuid4()), oficina_doc=doc, customer_id=cliente.id,
                                os_num=os_num, placa="AAA1A11", modelo="Uno", status="pendente_aprovacao")


def test_cliente_ve_orcamento_enviado_da_sua_os_sem_custos():
    ana = _cliente()
    os_ = _os(ana)
    o = _orcamento(os_.id)
    r = _api(ana).get("/api/customer/orcamentos")
    assert r.status_code == 200
    [item] = r.json()
    assert item["id"] == str(o.id) and item["total"] == 350.0 and item["status"] == "enviado"
    assert item["oficina"] == {"oficina_doc": OFICINA_A, "nome": "Auto Center A"}
    assert item["os_num"] == "OS-1" and item["vehicle_label"] == "Uno — AAA1A11"
    assert [i["descricao"] for i in item["itens"]] == ["Filtro de óleo", "Mão de obra"]
    assert item["itens"][1]["subtotal"] == 300.0
    texto = str(r.json())
    assert "custo" not in texto and "pwhash" not in texto


def test_so_orcamentos_visiveis_e_so_do_proprio_cliente():
    ana, bia = _cliente(), _cliente("bia@x.com")
    os_a, os_b, os_sem_dono = _os(ana), _os(bia, os_num="OS-2"), Ordem.objects.create(
        id="os-x", oficina_doc=OFICINA_A, customer_id=None, os_num="OS-3", status="rascunho")
    _orcamento(os_a.id, status="rascunho")
    _orcamento(os_a.id, status="substituido", versao=2)
    visivel = _orcamento(os_a.id, status="aprovado", versao=3)
    _orcamento(os_b.id)
    _orcamento(os_sem_dono.id)
    api = _api(ana)
    assert [o["id"] for o in api.get("/api/customer/orcamentos").json()] == [str(visivel.id)]
    assert [o["id"] for o in api.get("/api/customer/orcamentos?status=aprovado").json()] == [str(visivel.id)]
    assert api.get("/api/customer/orcamentos?status=enviado").json() == []


def test_detalhe_isolado_entre_clientes():
    ana, bia = _cliente(), _cliente("bia@x.com")
    o = _orcamento(_os(ana).id)
    assert _api(ana).get(f"/api/customer/orcamentos/{o.id}").status_code == 200
    assert _api(bia).get(f"/api/customer/orcamentos/{o.id}").status_code == 404
    assert _api(ana).get("/api/customer/orcamentos/nao-e-uuid").status_code == 404
    assert _api(ana).get(f"/api/customer/orcamentos/{uuid.uuid4()}").status_code == 404
    assert APIClient().get("/api/customer/orcamentos").status_code == 401


def test_orcamento_e_somente_leitura():
    ana = _cliente()
    o = _orcamento(_os(ana).id)
    api = _api(ana)
    assert api.post(f"/api/customer/orcamentos/{o.id}", {"action": "aprovar"}, format="json").status_code == 405
    assert api.delete(f"/api/customer/orcamentos/{o.id}").status_code == 405
