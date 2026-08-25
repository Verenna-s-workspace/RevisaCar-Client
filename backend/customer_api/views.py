"""
Customer API views — all endpoints under /api/customer/
JWT required for all except auth + public QR resolve.
"""
from __future__ import annotations
import logging
import jwt as pyjwt
from datetime import datetime
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .serializers import (
    CustomerRegisterSerializer, CustomerLoginSerializer,
    ChangePasswordSerializer, ForgotPasswordSerializer,
    CustomerProfileSerializer, VehicleSerializer, VehicleUpdateSerializer,
    AppointmentCreateSerializer, EstimateActionSerializer,
    DocumentCreateSerializer,
    pw_hash, pw_check, new_id, now_iso,
)
from . import services

logger = logging.getLogger(__name__)


# ── Auth helpers ───────────────────────────────────────────────────────────────

def _make_tokens(customer_id: str, name: str) -> dict:
    from rest_framework_simplejwt.tokens import RefreshToken as RT
    refresh = RT()
    refresh["customer_id"] = customer_id
    refresh["name"] = name
    refresh.payload["sub"] = customer_id
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "customer_id": customer_id,
        "name": name,
    }


def _decode_bearer(request):
    auth = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.split(" ", 1)[1]
    try:
        payload = pyjwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        cid = payload.get("customer_id") or payload.get("sub")
        return {"id": cid, "name": payload.get("name", "")}
    except Exception:
        return None


def _require_auth(request):
    c = _decode_bearer(request)
    if not c or not c.get("id"):
        return None, Response({"detail": "Não autenticado"}, status=status.HTTP_401_UNAUTHORIZED)
    return c, None


def _supabase_err(exc=None, detail: str = "Serviço temporariamente indisponível"):
    """Loga a exceção real no servidor e devolve uma mensagem genérica — nunca
    expõe detalhes internos (stack, credenciais em URLs, etc.) ao cliente."""
    if exc is not None:
        logger.error("Erro no acesso ao Supabase: %s", exc, exc_info=True)
    return Response({"detail": detail}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(["GET"])
@permission_classes([AllowAny])
def api_root(request):
    return Response({"status": "ok", "version": "1.0"})


# ══════════════════════════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    s = CustomerRegisterSerializer(data=request.data)
    if not s.is_valid():
        return Response(s.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    d = s.validated_data
    try:
        if services.get_customer_by_email(d["email"]):
            return Response({"detail": "E-mail já cadastrado"}, status=status.HTTP_409_CONFLICT)

        cid = new_id()
        services.create_customer({
            "id": cid,
            "name": d["name"],
            "email": d["email"],
            "phone": d["phone"],
            "pwhash": pw_hash(d["password"]),
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })
    except Exception as exc:
        return _supabase_err(exc)

    tokens = _make_tokens(cid, d["name"])
    return Response({**tokens, "customer": {"id": cid, "name": d["name"], "email": d["email"]}},
                    status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    s = CustomerLoginSerializer(data=request.data)
    if not s.is_valid():
        return Response(s.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    d = s.validated_data
    try:
        customer = services.get_customer_by_email(d["email"])
    except Exception as exc:
        return _supabase_err(exc)

    if not customer or not pw_check(d["password"], customer.get("pwhash", "")):
        return Response({"detail": "E-mail ou senha incorretos"}, status=status.HTTP_401_UNAUTHORIZED)

    tokens = _make_tokens(customer["id"], customer["name"])
    return Response({
        **tokens,
        "customer": {"id": customer["id"], "name": customer["name"], "email": customer["email"]},
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def token_refresh(request):
    refresh_token = request.data.get("refresh")
    if not refresh_token:
        return Response({"detail": "refresh token obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        from rest_framework_simplejwt.tokens import RefreshToken as RT
        token = RT(refresh_token)
        return Response({"access": str(token.access_token)})
    except Exception:
        return Response({"detail": "Sessão expirada. Faça login novamente."}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    s = ForgotPasswordSerializer(data=request.data)
    if not s.is_valid():
        return Response(s.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    # Anti-enumeration: always return success
    # TODO: integrate email provider (SendGrid / Resend) to actually send reset link
    return Response({"detail": "Se o e-mail existir, você receberá as instruções em breve."})


# ══════════════════════════════════════════════════════════════════════════════
# PROFILE
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET", "PUT", "PATCH"])
def profile(request):
    c, err = _require_auth(request)
    if err:
        return err

    try:
        customer = services.get_customer_by_id(c["id"])
    except Exception as exc:
        return _supabase_err(exc)

    if not customer:
        return Response({"detail": "Cliente não encontrado"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response({
            "id": customer["id"],
            "name": customer["name"],
            "email": customer["email"],
            "phone": customer.get("phone", ""),
            "cpf": customer.get("cpf", ""),
            "address": customer.get("address", ""),
            "avatar_url": customer.get("avatar_url"),
            "created_at": customer.get("created_at"),
        })

    s = CustomerProfileSerializer(data=request.data, partial=True)
    if not s.is_valid():
        return Response(s.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    try:
        updated = services.update_customer(c["id"], {**s.validated_data, "updated_at": now_iso()})
    except Exception as exc:
        return _supabase_err(exc)

    updated = updated or {}
    # Nunca devolver pwhash (nem outros campos sensíveis) ao cliente.
    return Response({
        "id": updated.get("id"),
        "name": updated.get("name"),
        "email": updated.get("email"),
        "phone": updated.get("phone", ""),
        "cpf": updated.get("cpf", ""),
        "address": updated.get("address", ""),
        "avatar_url": updated.get("avatar_url"),
        "created_at": updated.get("created_at"),
    })


@api_view(["POST"])
def change_password(request):
    c, err = _require_auth(request)
    if err:
        return err

    s = ChangePasswordSerializer(data=request.data)
    if not s.is_valid():
        return Response(s.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    try:
        customer = services.get_customer_by_id(c["id"])
    except Exception as exc:
        return _supabase_err(exc)

    if not pw_check(s.validated_data["old_password"], customer.get("pwhash", "")):
        return Response({"detail": "Senha atual incorreta"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        services.update_customer(c["id"], {
            "pwhash": pw_hash(s.validated_data["new_password"]),
            "updated_at": now_iso(),
        })
    except Exception as exc:
        return _supabase_err(exc)

    return Response({"detail": "Senha alterada com sucesso"})


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET"])
def dashboard(request):
    c, err = _require_auth(request)
    if err:
        return err
    try:
        summary = services.get_dashboard_summary(c["id"])
    except Exception as exc:
        return _supabase_err(exc)
    return Response(summary)


# ══════════════════════════════════════════════════════════════════════════════
# VEHICLES
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET", "POST"])
def vehicles_list(request):
    c, err = _require_auth(request)
    if err:
        return err

    try:
        if request.method == "GET":
            return Response(services.list_vehicles(c["id"]))

        s = VehicleSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        d = s.validated_data
        vid = new_id()
        vehicle = services.create_vehicle({
            "id": vid,
            "customer_id": c["id"],
            "deleted": False,
            "created_at": now_iso(),
            "updated_at": now_iso(),
            **d,
        })
        return Response(vehicle, status=status.HTTP_201_CREATED)
    except Exception as exc:
        return _supabase_err(exc)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
def vehicle_detail(request, vehicle_id: str):
    c, err = _require_auth(request)
    if err:
        return err

    try:
        vehicle = services.get_vehicle(vehicle_id, c["id"])
        if not vehicle:
            return Response({"detail": "Veículo não encontrado"}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(vehicle)

        if request.method == "DELETE":
            services.soft_delete_vehicle(vehicle_id, c["id"])
            return Response({"detail": "Veículo removido"})

        s = VehicleUpdateSerializer(data=request.data, partial=True)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        updated = services.update_vehicle(vehicle_id, c["id"], {**s.validated_data, "updated_at": now_iso()})
        return Response(updated)
    except Exception as exc:
        return _supabase_err(exc)


# ══════════════════════════════════════════════════════════════════════════════
# VEHICLE HEALTH
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET"])
def vehicle_health(request, vehicle_id: str):
    """GET /api/customer/vehicles/<id>/health — computed from maintenance reminders."""
    c, err = _require_auth(request)
    if err:
        return err

    try:
        health = services.get_vehicle_health(vehicle_id, c["id"])
    except Exception as exc:
        return _supabase_err(exc)

    if health is None:
        return Response({"detail": "Veículo não encontrado"}, status=status.HTTP_404_NOT_FOUND)

    return Response(health)


# ══════════════════════════════════════════════════════════════════════════════
# QR CODE
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET"])
def vehicle_qr(request, vehicle_id: str):
    """GET /api/customer/vehicles/<id>/qr — returns active QR or creates one."""
    c, err = _require_auth(request)
    if err:
        return err

    vehicle = services.get_vehicle(vehicle_id, c["id"])
    if not vehicle:
        return Response({"detail": "Veículo não encontrado"}, status=status.HTTP_404_NOT_FOUND)

    try:
        qr = services.get_or_create_qr(vehicle_id, c["id"])
    except Exception as exc:
        return _supabase_err(exc)

    return Response(qr)


@api_view(["POST"])
def vehicle_qr_refresh(request, vehicle_id: str):
    """POST /api/customer/vehicles/<id>/qr — force-creates a new QR link."""
    c, err = _require_auth(request)
    if err:
        return err

    vehicle = services.get_vehicle(vehicle_id, c["id"])
    if not vehicle:
        return Response({"detail": "Veículo não encontrado"}, status=status.HTTP_404_NOT_FOUND)

    try:
        qr = services.create_qr_link(vehicle_id, c["id"])
    except Exception as exc:
        return _supabase_err(exc)

    return Response(qr, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def qr_resolve(request, uuid_str: str):
    """GET /api/qr/<uuid> — public endpoint for mechanic to resolve QR (no PII)."""
    try:
        result = services.resolve_qr_uuid(uuid_str)
    except Exception as exc:
        return _supabase_err(exc)

    if not result:
        return Response({"detail": "QR Code inválido ou expirado"}, status=status.HTTP_404_NOT_FOUND)

    vehicle = result.get("customer_vehicles", {})
    return Response({
        "uuid": result["uuid"],
        "vehicle": {
            "brand": vehicle.get("brand"),
            "model": vehicle.get("model"),
            "year": vehicle.get("year"),
            "plate": vehicle.get("plate"),
            "color": vehicle.get("color"),
            "fuel_type": vehicle.get("fuel_type"),
        },
        "expires_at": result.get("expires_at"),
    })


# ══════════════════════════════════════════════════════════════════════════════
# DOCUMENTS
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET", "POST"])
def documents_list(request):
    """GET/POST /api/customer/documents"""
    c, err = _require_auth(request)
    if err:
        return err

    if request.method == "GET":
        vehicle_id = request.query_params.get("vehicle_id")
        try:
            docs = services.list_documents(c["id"], vehicle_id=vehicle_id)
        except Exception as exc:
            return _supabase_err(exc)
        return Response(docs)

    # POST — upload document
    s = DocumentCreateSerializer(data=request.data)
    if not s.is_valid():
        return Response(s.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    d = s.validated_data
    file_obj = request.FILES.get("file")

    file_url = ""
    file_name = d.get("file_name", "")
    file_size_kb = None

    if file_obj:
        file_bytes = file_obj.read()
        file_size_kb = len(file_bytes) // 1024
        file_name = file_obj.name
        bucket = settings.SUPABASE_BUCKET
        path = f"{c['id']}/{d['vehicle_id']}/{new_id()}_{file_name}"
        try:
            file_url = services.upload_document_file(bucket, path, file_bytes, file_obj.content_type)
        except Exception as exc:
            return Response({"detail": f"Erro no upload: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)

    doc_data = {
        "id": new_id(),
        "customer_id": c["id"],
        "vehicle_id": d["vehicle_id"],
        "vehicle_label": d.get("vehicle_label", ""),
        "type": d["type"],
        "title": d["title"],
        "file_url": file_url,
        "file_name": file_name,
        "file_size_kb": file_size_kb,
        "expiry_date": str(d["expiry_date"]) if d.get("expiry_date") else None,
        "notes": d.get("notes", ""),
        "created_at": now_iso(),
    }

    try:
        doc = services.create_document(doc_data)
    except Exception as exc:
        return _supabase_err(exc)

    return Response(doc, status=status.HTTP_201_CREATED)


@api_view(["GET", "DELETE"])
def document_detail(request, doc_id: str):
    """GET/DELETE /api/customer/documents/<id>"""
    c, err = _require_auth(request)
    if err:
        return err

    try:
        doc = services.get_document(doc_id, c["id"])
        if not doc:
            return Response({"detail": "Documento não encontrado"}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(doc)

        services.delete_document(doc_id, c["id"])
        return Response({"detail": "Documento removido"})
    except Exception as exc:
        return _supabase_err(exc)


# ══════════════════════════════════════════════════════════════════════════════
# APPOINTMENTS
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET", "POST"])
def appointments_list(request):
    c, err = _require_auth(request)
    if err:
        return err

    try:
        if request.method == "GET":
            status_filter = request.query_params.get("status")
            return Response(services.list_appointments(c["id"], status=status_filter))

        s = AppointmentCreateSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        d = s.validated_data
        vehicle = services.get_vehicle(d["vehicle_id"], c["id"])
        if not vehicle:
            return Response({"detail": "Veículo não encontrado"}, status=status.HTTP_400_BAD_REQUEST)

        appt = services.create_appointment({
            "id": new_id(),
            "customer_id": c["id"],
            "vehicle_id": d["vehicle_id"],
            "vehicle_label": f"{vehicle['brand']} {vehicle['model']} {vehicle['year']} — {vehicle['plate']}",
            "service_type": d["service_type"],
            "service_description": d.get("service_description", ""),
            "date": str(d["date"]),
            "time_slot": str(d["time_slot"]),
            "status": "pendente",
            "notes": d.get("notes", ""),
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })
        return Response(appt, status=status.HTTP_201_CREATED)
    except Exception as exc:
        return _supabase_err(exc)


@api_view(["GET", "DELETE"])
def appointment_detail(request, appointment_id: str):
    c, err = _require_auth(request)
    if err:
        return err

    try:
        appt = services.get_appointment(appointment_id, c["id"])
        if not appt:
            return Response({"detail": "Agendamento não encontrado"}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(appt)

        cancelled = services.cancel_appointment(appointment_id, c["id"])
        if not cancelled:
            return Response({"detail": "Não foi possível cancelar"}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Agendamento cancelado"})
    except Exception as exc:
        return _supabase_err(exc)


# ══════════════════════════════════════════════════════════════════════════════
# AVAILABILITY
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET"])
@permission_classes([AllowAny])
def available_days(request):
    year = int(request.query_params.get("year", datetime.today().year))
    month = int(request.query_params.get("month", datetime.today().month))
    try:
        slots = services.get_available_slots(year, month)
    except Exception as exc:
        return _supabase_err(exc)
    available_dates = sorted({s["date"] for s in slots})
    return Response({"year": year, "month": month, "available_dates": available_dates})


@api_view(["GET"])
@permission_classes([AllowAny])
def available_times(request):
    date_str = request.query_params.get("date")
    if not date_str:
        return Response({"detail": "Parâmetro date obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        slots = services.get_available_times(date_str)
    except Exception as exc:
        return _supabase_err(exc)
    return Response({"date": date_str, "times": [s["time_slot"] for s in slots]})


# ══════════════════════════════════════════════════════════════════════════════
# ESTIMATES
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET"])
def estimates_list(request):
    c, err = _require_auth(request)
    if err:
        return err
    try:
        status_filter = request.query_params.get("status")
        return Response(services.list_estimates(c["id"], status=status_filter))
    except Exception as exc:
        return _supabase_err(exc)


@api_view(["GET", "POST"])
def estimate_detail(request, estimate_id: str):
    c, err = _require_auth(request)
    if err:
        return err

    try:
        estimate = services.get_estimate(estimate_id, c["id"])
        if not estimate:
            return Response({"detail": "Orçamento não encontrado"}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(estimate)

        s = EstimateActionSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        if estimate.get("status") != "pendente":
            return Response({"detail": "Orçamento não está pendente"}, status=status.HTTP_400_BAD_REQUEST)

        new_status = "aprovado" if s.validated_data["action"] == "aprovar" else "rejeitado"
        updated = services.update_estimate_status(
            estimate_id, c["id"], new_status, s.validated_data.get("comment", "")
        )
        return Response(updated)
    except Exception as exc:
        return _supabase_err(exc)


# ══════════════════════════════════════════════════════════════════════════════
# SERVICE HISTORY
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET"])
def history_list(request):
    c, err = _require_auth(request)
    if err:
        return err
    try:
        vehicle_id = request.query_params.get("vehicle_id")
        return Response(services.list_service_history(c["id"], vehicle_id=vehicle_id))
    except Exception as exc:
        return _supabase_err(exc)


@api_view(["GET"])
def history_detail(request, history_id: str):
    c, err = _require_auth(request)
    if err:
        return err
    try:
        item = services.get_service_history_item(history_id, c["id"])
        if not item:
            return Response({"detail": "Serviço não encontrado"}, status=status.HTTP_404_NOT_FOUND)
        return Response(item)
    except Exception as exc:
        return _supabase_err(exc)


# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET"])
def notifications_list(request):
    c, err = _require_auth(request)
    if err:
        return err
    try:
        unread_only = request.query_params.get("unread", "false").lower() == "true"
        return Response(services.list_notifications(c["id"], unread_only=unread_only))
    except Exception as exc:
        return _supabase_err(exc)


@api_view(["POST"])
def notification_read(request, notification_id: str):
    c, err = _require_auth(request)
    if err:
        return err
    try:
        services.mark_notification_read(notification_id, c["id"])
    except Exception as exc:
        return _supabase_err(exc)
    return Response({"detail": "Marcada como lida"})


@api_view(["POST"])
def notifications_read_all(request):
    c, err = _require_auth(request)
    if err:
        return err
    try:
        services.mark_all_notifications_read(c["id"])
    except Exception as exc:
        return _supabase_err(exc)
    return Response({"detail": "Todas marcadas como lidas"})


# ══════════════════════════════════════════════════════════════════════════════
# REMINDERS
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET"])
def reminders_list(request):
    c, err = _require_auth(request)
    if err:
        return err
    try:
        return Response(services.list_reminders(c["id"]))
    except Exception as exc:
        return _supabase_err(exc)
