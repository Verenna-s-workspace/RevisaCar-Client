"""Consulta de placa: mapeamento normalizado + feature-flag + endpoint."""
import jwt as pyjwt
import pytest
from django.conf import settings
from rest_framework.test import APIClient

from customer_api import plate_lookup as pl
from customer_api.models import Customer
from customer_api.serializers import pw_hash


def _token(cid: str) -> str:
    return pyjwt.encode({"customer_id": cid}, settings.SECRET_KEY, algorithm="HS256")


@pytest.fixture
def customer(db):
    return Customer.objects.create(name="Ana", email="ana@x.com", pwhash=pw_hash("x"))


# ── Serviço ────────────────────────────────────────────────────────────────────

def test_desligado_por_padrao(settings):
    settings.PLATE_LOOKUP_URL = ""
    assert pl.is_enabled() is False
    assert pl.lookup_plate("ABC1D23") is None


def test_mapeia_resposta_do_provedor(settings, monkeypatch):
    settings.PLATE_LOOKUP_URL = "https://prov/{plate}"
    settings.PLATE_LOOKUP_TOKEN = ""
    settings.PLATE_LOOKUP_ROOT = ""
    settings.PLATE_LOOKUP_MAP = None  # usa DEFAULT_MAP (marca/modelo/ano/cor)
    monkeypatch.setattr(pl, "_fetch", lambda url, headers, timeout: {
        "marca": "Fiat", "modelo": "Uno", "ano": "2018", "cor": "Prata",
    })
    out = pl.lookup_plate("abc-1d23")
    assert out == {"brand": "Fiat", "model": "Uno", "year": 2018, "color": "Prata", "plate": "ABC1D23"}


def test_mapa_com_raiz_e_paths(settings, monkeypatch):
    settings.PLATE_LOOKUP_URL = "https://prov/{plate}"
    settings.PLATE_LOOKUP_ROOT = "data"
    settings.PLATE_LOOKUP_MAP = {"brand": "veiculo.marca", "model": "veiculo.modelo"}
    monkeypatch.setattr(pl, "_fetch", lambda *a, **k: {"data": {"veiculo": {"marca": "VW", "modelo": "Gol"}}})
    out = pl.lookup_plate("XYZ4K56")
    assert out["brand"] == "VW" and out["model"] == "Gol" and out["plate"] == "XYZ4K56"


def test_sem_marca_nem_modelo_retorna_none(settings, monkeypatch):
    settings.PLATE_LOOKUP_URL = "https://prov/{plate}"
    settings.PLATE_LOOKUP_MAP = None
    monkeypatch.setattr(pl, "_fetch", lambda *a, **k: {"cor": "Preto"})
    assert pl.lookup_plate("ABC1D23") is None


def test_falha_do_provedor_nao_propaga(settings, monkeypatch):
    settings.PLATE_LOOKUP_URL = "https://prov/{plate}"

    def boom(*a, **k):
        raise RuntimeError("provider 500")

    monkeypatch.setattr(pl, "_fetch", boom)
    assert pl.lookup_plate("ABC1D23") is None  # engole o erro, devolve None


# ── Endpoint ────────────────────────────────────────────────────────────────────

def test_endpoint_available_false_quando_desligado(customer, settings):
    settings.PLATE_LOOKUP_URL = ""
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {_token(str(customer.id))}")
    r = c.get("/api/customer/plate-lookup?plate=ABC1D23")
    assert r.status_code == 200
    assert r.data == {"available": False, "found": False, "vehicle": None}


def test_endpoint_exige_auth(db):
    r = APIClient().get("/api/customer/plate-lookup?plate=ABC1D23")
    assert r.status_code == 401


def test_endpoint_found_com_dados(customer, settings, monkeypatch):
    settings.PLATE_LOOKUP_URL = "https://prov/{plate}"
    settings.PLATE_LOOKUP_MAP = None
    monkeypatch.setattr(pl, "_fetch", lambda *a, **k: {"marca": "Honda", "modelo": "Civic", "ano": 2020})
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {_token(str(customer.id))}")
    r = c.get("/api/customer/plate-lookup?plate=DEF5678")
    assert r.status_code == 200
    assert r.data["available"] is True and r.data["found"] is True
    assert r.data["vehicle"]["brand"] == "Honda" and r.data["vehicle"]["year"] == 2020


def test_endpoint_found_false_quando_provedor_nao_acha(customer, settings, monkeypatch):
    settings.PLATE_LOOKUP_URL = "https://prov/{plate}"
    settings.PLATE_LOOKUP_MAP = None
    monkeypatch.setattr(pl, "_fetch", lambda *a, **k: {"cor": "Preto"})  # sem marca/modelo
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {_token(str(customer.id))}")
    r = c.get("/api/customer/plate-lookup?plate=DEF5678")
    assert r.status_code == 200
    assert r.data == {"available": True, "found": False, "vehicle": None}
