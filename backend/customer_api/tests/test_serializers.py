"""Testes das validações puras dos serializers do app do cliente."""
import datetime

import pytest
from rest_framework.serializers import ValidationError

from customer_api.serializers import (
    CustomerRegisterSerializer,
    ChangePasswordSerializer,
    CustomerProfileSerializer,
    VehicleSerializer,
    AppointmentCreateSerializer,
    pw_hash,
    pw_check,
)


# ── Registro ──────────────────────────────────────────────────────────────────

def test_register_valido():
    s = CustomerRegisterSerializer(data={
        "name": "  Ana Souza ", "email": "ANA@X.COM", "phone": "11999999999",
        "password": "segredo123", "password_confirm": "segredo123",
    })
    assert s.is_valid(), s.errors
    assert s.validated_data["name"] == "Ana Souza"      # trim
    assert s.validated_data["email"] == "ana@x.com"     # lower


def test_register_senhas_diferentes():
    s = CustomerRegisterSerializer(data={
        "name": "Ana", "email": "a@x.com", "phone": "1",
        "password": "segredo123", "password_confirm": "outra12345",
    })
    assert not s.is_valid()
    assert "password_confirm" in s.errors


def test_register_senha_curta():
    s = CustomerRegisterSerializer(data={
        "name": "Ana", "email": "a@x.com", "phone": "1",
        "password": "1234", "password_confirm": "1234",
    })
    assert not s.is_valid()
    assert "password" in s.errors


def test_register_nome_vazio():
    s = CustomerRegisterSerializer(data={
        "name": "   ", "email": "a@x.com", "phone": "1",
        "password": "segredo123", "password_confirm": "segredo123",
    })
    assert not s.is_valid()


# ── Troca de senha ────────────────────────────────────────────────────────────

def test_change_password_confirmacao():
    s = ChangePasswordSerializer(data={
        "old_password": "velha123", "new_password": "novaSenha1", "new_password_confirm": "novaSenha1",
    })
    assert s.is_valid(), s.errors

    s2 = ChangePasswordSerializer(data={
        "old_password": "velha123", "new_password": "novaSenha1", "new_password_confirm": "difere999",
    })
    assert not s2.is_valid()


# ── CPF ───────────────────────────────────────────────────────────────────────

def test_cpf_normaliza_para_digitos():
    assert CustomerProfileSerializer().validate_cpf("529.982.247-25") == "52998224725"
    assert CustomerProfileSerializer().validate_cpf("") == ""


@pytest.mark.parametrize("bad", ["123", "1234567890", "123456789012"])
def test_cpf_invalido(bad):
    with pytest.raises(ValidationError):
        CustomerProfileSerializer().validate_cpf(bad)


# ── Placa ─────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("raw,expected", [
    ("abc1234", "ABC1234"),
    ("abc-1234", "ABC1234"),
    ("abc1d23", "ABC1D23"),
    ("ABC 1D23", "ABC1D23"),
])
def test_placa_valida(raw, expected):
    assert VehicleSerializer().validate_plate(raw) == expected


@pytest.mark.parametrize("bad", ["AB1234", "ABCD123", "12341234", "ABC12A4"])
def test_placa_invalida(bad):
    with pytest.raises(ValidationError):
        VehicleSerializer().validate_plate(bad)


# ── Agendamento: data no passado ──────────────────────────────────────────────

def test_agendamento_data_passada_rejeitada():
    ontem = datetime.date.today() - datetime.timedelta(days=1)
    with pytest.raises(ValidationError):
        AppointmentCreateSerializer().validate_date(ontem)


def test_agendamento_data_futura_ok():
    amanha = datetime.date.today() + datetime.timedelta(days=1)
    assert AppointmentCreateSerializer().validate_date(amanha) == amanha


# ── Hash de senha ─────────────────────────────────────────────────────────────

def test_pw_hash_e_check():
    h = pw_hash("minhaSenha123")
    assert h != "minhaSenha123"          # nunca em texto puro
    assert pw_check("minhaSenha123", h)
    assert not pw_check("errada", h)
