"""Prova de isolamento entre clientes (multi-tenant) na camada de serviço/ORM.

Mesmo sem RLS no banco, cada função de `services` filtra por `customer_id` — um
cliente NUNCA acessa dados de outro. Estes testes exercitam isso de verdade
(banco de teste sqlite), criando dois clientes e verificando que um não enxerga
nem altera o que é do outro.
"""
import datetime

import pytest

from customer_api import services
from customer_api.models import Customer, CustomerVehicle, Appointment, Notification


@pytest.fixture
def two_customers(db):
    a = Customer.objects.create(name="Ana", email="ana@x.com", pwhash="x")
    b = Customer.objects.create(name="Bruno", email="bruno@x.com", pwhash="x")
    va = CustomerVehicle.objects.create(customer=a, brand="Fiat", model="Uno", year=2018, plate="AAA1A11")
    vb = CustomerVehicle.objects.create(customer=b, brand="VW", model="Gol", year=2020, plate="BBB2B22")
    return a, b, va, vb


def test_cliente_nao_ve_veiculo_de_outro(two_customers):
    a, b, va, vb = two_customers
    # B tentando pegar o veículo de A -> nada
    assert services.get_vehicle(str(va.id), str(b.id)) is None
    # A pega o próprio -> ok
    assert services.get_vehicle(str(va.id), str(a.id))["plate"] == "AAA1A11"


def test_listagem_de_veiculos_isolada(two_customers):
    a, b, va, vb = two_customers
    placas_a = {v["plate"] for v in services.list_vehicles(str(a.id))}
    placas_b = {v["plate"] for v in services.list_vehicles(str(b.id))}
    assert placas_a == {"AAA1A11"}
    assert placas_b == {"BBB2B22"}


def test_cliente_nao_altera_veiculo_de_outro(two_customers):
    a, b, va, vb = two_customers
    # B tenta atualizar o veículo de A -> não afeta nada
    services.update_vehicle(str(va.id), str(b.id), {"mileage": 999999})
    va.refresh_from_db()
    assert va.mileage != 999999
    # B tenta soft-delete do veículo de A -> falha
    assert services.soft_delete_vehicle(str(va.id), str(b.id)) is False
    va.refresh_from_db()
    assert va.deleted is False


def test_agendamento_e_notificacao_isolados(two_customers):
    a, b, va, vb = two_customers
    Appointment.objects.create(customer=a, vehicle=va, service_type="Óleo",
                               date=datetime.date.today(), time_slot="09:00")
    Notification.objects.create(customer=a, title="Oi", type="sistema")
    # B não vê nada de A
    assert services.list_appointments(str(b.id)) == []
    assert services.list_notifications(str(b.id)) == []
    # A vê o seu
    assert len(services.list_appointments(str(a.id))) == 1
    assert len(services.list_notifications(str(a.id))) == 1


def test_cancelar_agendamento_de_outro_falha(two_customers):
    a, b, va, vb = two_customers
    appt = Appointment.objects.create(customer=a, vehicle=va, service_type="Óleo",
                                      date=datetime.date.today(), time_slot="09:00", status="pendente")
    assert services.cancel_appointment(str(appt.id), str(b.id)) is None
    appt.refresh_from_db()
    assert appt.status == "pendente"  # inalterado
