"""
Supabase service layer.
Tables: customers, customer_vehicles, appointments,
        estimates, estimate_items, service_history,
        notifications, maintenance_reminders, availability_slots,
        vehicle_qr_links, vehicle_documents
"""
from __future__ import annotations
import datetime as _dt
import decimal as _decimal
import uuid as _uuid

from django.conf import settings

from . import models

_client = None


def get_client():
    """Cliente Supabase REST — camada LEGADA, ainda usada pelos domínios não
    migrados para o ORM. Vai embora ao fim da migração para Postgres direto."""
    global _client
    if _client is None:
        from supabase import create_client
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_KEY
        if not url or not key:
            raise RuntimeError("SUPABASE_URL / SUPABASE_KEY not set")
        _client = create_client(url, key)
    return _client


def _row(obj):
    """Serializa uma instância de model para dict com as MESMAS chaves/tipos que
    a camada REST devolvia (colunas do banco) — para as views não precisarem
    mudar durante a migração. FK vira `<campo>_id`; uuid/data/decimal viram
    tipos JSON-friendly."""
    if obj is None:
        return None
    out = {}
    for f in obj._meta.fields:
        val = getattr(obj, f.attname)
        if isinstance(val, _uuid.UUID):
            val = str(val)
        elif isinstance(val, (_dt.datetime, _dt.date, _dt.time)):
            val = val.isoformat()
        elif isinstance(val, _decimal.Decimal):
            val = float(val)
        out[f.attname] = val
    return out


def _model_fields(model) -> set:
    return {f.attname for f in model._meta.fields} | {f.name for f in model._meta.fields}


def _clean(model, data: dict) -> dict:
    """Mantém só chaves que existem no model e remove as auto-gerenciadas."""
    auto = {f.attname for f in model._meta.fields if getattr(f, "auto_now", False) or getattr(f, "auto_now_add", False)}
    allowed = _model_fields(model)
    return {k: v for k, v in data.items() if k in allowed and k not in auto}


def _safe(fn):
    """Execute a Supabase call and return (data, error)."""
    try:
        result = fn()
        return result, None
    except Exception as exc:
        return None, str(exc)


# ── Customers ─────────────────────────────────────────────────────────────────

def get_customer_by_email(email: str):
    return _row(models.Customer.objects.filter(email=email).first())


def get_customer_by_id(customer_id: str):
    return _row(models.Customer.objects.filter(id=customer_id).first())


def create_customer(data: dict):
    obj = models.Customer.objects.create(**_clean(models.Customer, data))
    return _row(obj)


def update_customer(customer_id: str, data: dict):
    fields = _clean(models.Customer, data)
    fields.pop("id", None)
    models.Customer.objects.filter(id=customer_id).update(**fields)
    return _row(models.Customer.objects.filter(id=customer_id).first())


# ── Vehicles ──────────────────────────────────────────────────────────────────

def list_vehicles(customer_id: str):
    qs = models.CustomerVehicle.objects.filter(customer_id=customer_id, deleted=False).order_by("-created_at")
    return [_row(v) for v in qs]


def get_vehicle(vehicle_id: str, customer_id: str):
    return _row(models.CustomerVehicle.objects.filter(id=vehicle_id, customer_id=customer_id, deleted=False).first())


def create_vehicle(data: dict):
    obj = models.CustomerVehicle.objects.create(**_clean(models.CustomerVehicle, data))
    return _row(obj)


def update_vehicle(vehicle_id: str, customer_id: str, data: dict):
    fields = _clean(models.CustomerVehicle, data)
    fields.pop("id", None)
    models.CustomerVehicle.objects.filter(id=vehicle_id, customer_id=customer_id).update(**fields)
    return _row(models.CustomerVehicle.objects.filter(id=vehicle_id, customer_id=customer_id).first())


def soft_delete_vehicle(vehicle_id: str, customer_id: str):
    n = models.CustomerVehicle.objects.filter(id=vehicle_id, customer_id=customer_id).update(deleted=True)
    return bool(n)


# ── Appointments ──────────────────────────────────────────────────────────────

def list_appointments(customer_id: str, status: str | None = None):
    qs = models.Appointment.objects.filter(customer_id=customer_id).order_by("-date")
    if status:
        qs = qs.filter(status=status)
    return [_row(a) for a in qs]


def get_appointment(appointment_id: str, customer_id: str):
    return _row(models.Appointment.objects.filter(id=appointment_id, customer_id=customer_id).first())


def create_appointment(data: dict):
    obj = models.Appointment.objects.create(**_clean(models.Appointment, data))
    return _row(obj)


def cancel_appointment(appointment_id: str, customer_id: str):
    qs = models.Appointment.objects.filter(
        id=appointment_id, customer_id=customer_id, status__in=["pendente", "confirmado"]
    )
    if not qs.exists():
        return None
    qs.update(status="cancelado")
    return _row(models.Appointment.objects.filter(id=appointment_id, customer_id=customer_id).first())


# ── Availability ──────────────────────────────────────────────────────────────

def get_available_slots(year: int, month: int):
    from datetime import date
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    qs = models.AvailabilitySlot.objects.filter(
        date__gte=start, date__lt=end, is_available=True
    ).order_by("date")
    return [_row(s) for s in qs]


def get_available_times(date_str: str):
    qs = models.AvailabilitySlot.objects.filter(date=date_str, is_available=True).order_by("time_slot")
    return [_row(s) for s in qs]


# ── Estimates ─────────────────────────────────────────────────────────────────

def _estimate_row(est):
    d = _row(est)
    d["estimate_items"] = [_row(i) for i in est.items.all()]
    return d


def list_estimates(customer_id: str, status: str | None = None):
    qs = models.Estimate.objects.filter(customer_id=customer_id).order_by("-created_at").prefetch_related("items")
    if status:
        qs = qs.filter(status=status)
    return [_estimate_row(e) for e in qs]


def get_estimate(estimate_id: str, customer_id: str):
    est = models.Estimate.objects.filter(id=estimate_id, customer_id=customer_id).prefetch_related("items").first()
    return _estimate_row(est) if est else None


def update_estimate_status(estimate_id: str, customer_id: str, new_status: str, comment: str = ""):
    fields: dict = {"status": new_status}
    if comment:
        fields["customer_comment"] = comment
    models.Estimate.objects.filter(id=estimate_id, customer_id=customer_id).update(**fields)
    est = models.Estimate.objects.filter(id=estimate_id, customer_id=customer_id).prefetch_related("items").first()
    return _estimate_row(est) if est else None


# ── Service History ───────────────────────────────────────────────────────────

def _history_row(h):
    d = _row(h)
    d["service_history_items"] = [_row(i) for i in h.items.all()]
    return d


def list_service_history(customer_id: str, vehicle_id: str | None = None):
    qs = models.ServiceHistory.objects.filter(customer_id=customer_id).order_by("-service_date").prefetch_related("items")
    if vehicle_id:
        qs = qs.filter(vehicle_id=vehicle_id)
    return [_history_row(h) for h in qs]


def get_service_history_item(history_id: str, customer_id: str):
    h = models.ServiceHistory.objects.filter(id=history_id, customer_id=customer_id).prefetch_related("items").first()
    return _history_row(h) if h else None


# ── Notifications ─────────────────────────────────────────────────────────────

def list_notifications(customer_id: str, unread_only: bool = False):
    qs = models.Notification.objects.filter(customer_id=customer_id).order_by("-created_at")
    if unread_only:
        qs = qs.filter(is_read=False)
    return [_row(n) for n in qs[:50]]


def mark_notification_read(notification_id: str, customer_id: str):
    models.Notification.objects.filter(id=notification_id, customer_id=customer_id).update(is_read=True)
    return _row(models.Notification.objects.filter(id=notification_id, customer_id=customer_id).first())


def mark_all_notifications_read(customer_id: str):
    models.Notification.objects.filter(customer_id=customer_id).update(is_read=True)


# ── Maintenance Reminders ─────────────────────────────────────────────────────

def list_reminders(customer_id: str):
    qs = (
        models.MaintenanceReminder.objects
        .filter(customer_id=customer_id).select_related("vehicle").order_by("-urgency_score")
    )
    out = []
    for rem in qs:
        d = _row(rem)
        v = rem.vehicle
        d["customer_vehicles"] = (
            {"brand": v.brand, "model": v.model, "year": v.year, "plate": v.plate, "mileage": v.mileage}
            if v else None
        )
        out.append(d)
    return out


def list_vehicle_reminders(vehicle_id: str, customer_id: str):
    qs = models.MaintenanceReminder.objects.filter(
        vehicle_id=vehicle_id, customer_id=customer_id
    ).order_by("-urgency_score")
    return [_row(rem) for rem in qs]


# ── Vehicle Health (computed) ─────────────────────────────────────────────────

_CATEGORY_KEYWORDS = {
    "Motor":     ["óleo", "filtro", "correia", "vela", "motor", "combustivel", "arrefecimento"],
    "Freios":    ["freio", "pastilha", "disco", "fluido de freio", "abs"],
    "Pneus":     ["pneu", "calibragem", "alinhamento", "balanceamento", "rodizio"],
    "Suspensão": ["suspensão", "amortecedor", "buchas", "direção", "geometria"],
    "Elétrica":  ["bateria", "alternador", "elétric", "fusível", "lampada"],
    "Câmbio":    ["câmbio", "transmissão", "embreagem", "fluido de câmbio"],
}


def _urgency_penalty(urgency: str) -> int:
    return {"urgente": 18, "atencao": 8, "ok": 0}.get(urgency, 0)


def _match_category(service_name: str) -> str:
    name_lower = service_name.lower()
    for cat, keywords in _CATEGORY_KEYWORDS.items():
        if any(k in name_lower for k in keywords):
            return cat
    return "Geral"


def compute_health(reminders: list[dict]) -> dict:
    """Score de saúde do veículo a partir dos lembretes de manutenção.

    Puro (sem IO) para ser testável: recebe a lista de lembretes e devolve
    {overall_score, categories}. Sem lembretes → 100 com categorias padrão.
    """
    # Score geral: penaliza conforme urgência de cada lembrete, limitado a [0, 100].
    penalty = sum(_urgency_penalty(r.get("urgency", "ok")) for r in reminders)
    overall = max(0, min(100, 100 - penalty))

    # Score por categoria.
    cat_scores: dict[str, list[int]] = {}
    for r in reminders:
        cat = _match_category(r.get("service_name", ""))
        score = max(0, 100 - _urgency_penalty(r.get("urgency", "ok")) * 2)
        cat_scores.setdefault(cat, []).append(score)

    categories = [
        {"name": cat, "score": round(sum(scores) / len(scores)), "icon": "wrench"}
        for cat, scores in cat_scores.items()
    ]
    categories.sort(key=lambda x: x["score"])

    if not categories:
        categories = [
            {"name": "Motor",     "score": 100, "icon": "engine"},
            {"name": "Freios",    "score": 100, "icon": "disc"},
            {"name": "Pneus",     "score": 100, "icon": "tire"},
            {"name": "Suspensão", "score": 100, "icon": "car"},
        ]

    return {"overall_score": overall, "categories": categories[:6]}


def get_vehicle_health(vehicle_id: str, customer_id: str) -> dict | None:
    from .serializers import now_iso

    vehicle = get_vehicle(vehicle_id, customer_id)
    if not vehicle:
        return None

    reminders = list_vehicle_reminders(vehicle_id, customer_id)
    health = compute_health(reminders)

    return {
        "vehicle_id": vehicle_id,
        "last_updated": now_iso(),
        **health,
    }


# ── QR Code ───────────────────────────────────────────────────────────────────

def get_active_qr(vehicle_id: str, customer_id: str):
    from django.utils import timezone
    qr = (
        models.VehicleQrLink.objects
        .filter(vehicle_id=vehicle_id, customer_id=customer_id, is_active=True)
        .order_by("-created_at").first()
    )
    if not qr:
        return None
    if qr.expires_at and qr.expires_at < timezone.now():
        return None  # expirado
    return _row(qr)


def create_qr_link(vehicle_id: str, customer_id: str) -> dict:
    import uuid as _uuid
    from django.utils import timezone
    from datetime import timedelta

    models.VehicleQrLink.objects.filter(vehicle_id=vehicle_id, customer_id=customer_id).update(is_active=False)
    obj = models.VehicleQrLink.objects.create(
        uuid=_uuid.uuid4(),
        vehicle_id=vehicle_id,
        customer_id=customer_id,
        is_active=True,
        expires_at=timezone.now() + timedelta(hours=24),
    )
    return _row(obj)


def get_or_create_qr(vehicle_id: str, customer_id: str) -> dict:
    qr = get_active_qr(vehicle_id, customer_id)
    if qr:
        return qr
    return create_qr_link(vehicle_id, customer_id)


def resolve_qr_uuid(uuid_str: str) -> dict | None:
    """Endpoint público — resolve o UUID para info do veículo (sem PII)."""
    qr = models.VehicleQrLink.objects.filter(uuid=uuid_str, is_active=True).select_related("vehicle").first()
    if not qr:
        return None
    d = _row(qr)
    v = qr.vehicle
    d["customer_vehicles"] = (
        {"brand": v.brand, "model": v.model, "year": v.year, "plate": v.plate,
         "color": v.color, "fuel_type": v.fuel_type}
        if v else None
    )
    return d


# ── Documents ─────────────────────────────────────────────────────────────────

def list_documents(customer_id: str, vehicle_id: str | None = None):
    qs = models.VehicleDocument.objects.filter(customer_id=customer_id).order_by("-created_at")
    if vehicle_id:
        qs = qs.filter(vehicle_id=vehicle_id)
    return [_row(d) for d in qs]


def get_document(doc_id: str, customer_id: str):
    return _row(models.VehicleDocument.objects.filter(id=doc_id, customer_id=customer_id).first())


def create_document(data: dict):
    obj = models.VehicleDocument.objects.create(**_clean(models.VehicleDocument, data))
    return _row(obj)


def delete_document(doc_id: str, customer_id: str) -> bool:
    n, _ = models.VehicleDocument.objects.filter(id=doc_id, customer_id=customer_id).delete()
    return bool(n)


def upload_document_file(bucket: str, path: str, file_bytes: bytes, content_type: str) -> str:
    """Upload file to Supabase Storage and return public URL."""
    client = get_client()
    client.storage.from_(bucket).upload(
        path, file_bytes,
        file_options={"content-type": content_type, "upsert": "true"},
    )
    return client.storage.from_(bucket).get_public_url(path)


# ── Dashboard Summary ─────────────────────────────────────────────────────────

def get_dashboard_summary(customer_id: str) -> dict:
    vehicles = list_vehicles(customer_id)
    appointments = list_appointments(customer_id)
    pending_estimates = list_estimates(customer_id, status="pendente")
    notifications = list_notifications(customer_id, unread_only=True)
    reminders = list_reminders(customer_id)
    recent_services = list_service_history(customer_id)

    upcoming_appts = [a for a in appointments if a.get("status") in ("pendente", "confirmado")]
    urgent_reminders = [r for r in reminders if r.get("urgency") in ("urgente", "atencao")]

    active_vehicle = next((v for v in vehicles if v.get("is_active")), vehicles[0] if vehicles else None)

    return {
        "vehicles_count": len(vehicles),
        "active_vehicle": active_vehicle,
        "upcoming_appointments": upcoming_appts[:3],
        "pending_estimates_count": len(pending_estimates),
        "pending_estimates": pending_estimates[:2],
        "unread_notifications_count": len(notifications),
        "recent_notifications": list_notifications(customer_id)[:5],
        "urgent_reminders": urgent_reminders[:5],
        "all_reminders": reminders[:10],
        "recent_services": recent_services[:5],
    }
