"""Upload de documentos: dono do veículo, tamanho, tipo real do arquivo, download pela API."""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from customer_api.models import Customer, CustomerVehicle, VehicleDocument
from customer_api.serializers import pw_hash
from customer_api.views import _make_tokens

PDF = b"%PDF-1.4\n%fake\n" + b"0" * 100


@pytest.fixture(autouse=True)
def media_tmp(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)


def _cliente(email):
    c = Customer.objects.create(name="Ana", email=email, pwhash=pw_hash("x"))
    v = CustomerVehicle.objects.create(customer=c, brand="Fiat", model="Uno", year=2015, plate="AAA1A11")
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {_make_tokens(str(c.id), c.name, c.pwhash)['access']}")
    return c, v, api


def _enviar(api, vehicle_id, conteudo=PDF, nome="crlv.pdf"):
    return api.post("/api/customer/documents", {
        "vehicle_id": str(vehicle_id), "type": "crlv", "title": "CRLV 2026",
        "file": SimpleUploadedFile(nome, conteudo, content_type="application/pdf"),
    }, format="multipart")


@pytest.mark.django_db
def test_upload_e_download():
    _, v, api = _cliente("a@x.com")
    r = _enviar(api, v.id)
    assert r.status_code == 201, r.content
    doc = r.json()
    assert doc["has_file"] and doc["file_url"].endswith("/arquivo")
    baixado = api.get(f"/api/customer/documents/{doc['id']}/arquivo")
    assert baixado.status_code == 200
    assert b"".join(baixado.streaming_content) == PDF
    assert baixado["Content-Type"] == "application/pdf"


@pytest.mark.django_db
def test_nao_aceita_veiculo_de_outro_cliente():
    _, v_ana, _ = _cliente("a@x.com")
    _, _, api_bia = _cliente("b@x.com")
    assert _enviar(api_bia, v_ana.id).status_code == 422
    assert VehicleDocument.objects.count() == 0


@pytest.mark.django_db
def test_recusa_arquivo_que_nao_e_pdf_nem_imagem():
    _, v, api = _cliente("a@x.com")
    r = _enviar(api, v.id, conteudo=b"MZ\x90\x00 executavel", nome="crlv.pdf")
    assert r.status_code == 422 and "file" in r.json()


@pytest.mark.django_db
def test_recusa_arquivo_grande(settings):
    settings.DOCUMENT_MAX_BYTES = 50
    _, v, api = _cliente("a@x.com")
    assert _enviar(api, v.id).status_code == 422


@pytest.mark.django_db
def test_outro_cliente_nao_baixa_nem_apaga():
    _, v, api_ana = _cliente("a@x.com")
    doc = _enviar(api_ana, v.id).json()
    _, _, api_bia = _cliente("b@x.com")
    assert api_bia.get(f"/api/customer/documents/{doc['id']}/arquivo").status_code == 404
    assert api_bia.delete(f"/api/customer/documents/{doc['id']}").status_code == 404
    assert api_ana.delete(f"/api/customer/documents/{doc['id']}").status_code == 200
    assert api_ana.get(f"/api/customer/documents/{doc['id']}/arquivo").status_code == 404
