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
    r = (
        get_client().table("customer_vehicles")
        .select("*")
        .eq("customer_id", customer_id)
        .eq("deleted", False)
        .order("created_at", desc=True)
        .execute()
    )
    return r.data or []


def get_vehicle(vehicle_id: str, customer_id: str):
    r = (
        get_client().table("customer_vehicles")
        .select("*")
        .eq("id", vehicle_id)
        .eq("customer_id", customer_id)
        .eq("deleted", False)
        .limit(1)
        .execute()
    )
    return r.data[0] if r.data else None


def create_vehicle(data: dict):
    r = get_client().table("customer_vehicles").insert(data).execute()
    return r.data[0] if r.data else None


def update_vehicle(vehicle_id: str, customer_id: str, data: dict):
    r = (
        get_client().table("customer_vehicles")
        .update(data)
        .eq("id", vehicle_id)
        .eq("customer_id", customer_id)
        .execute()
    )
    return r.data[0] if r.data else None


def soft_delete_vehicle(vehicle_id: str, customer_id: str):
    from .serializers import now_iso
    r = (
        get_client().table("customer_vehicles")
        .update({"deleted": True, "updated_at": now_iso()})
        .eq("id", vehicle_id)
        .eq("customer_id", customer_id)
        .execute()
    )
    return bool(r.data)


# ── Appointments ──────────────────────────────────────────────────────────────

def list_appointments(customer_id: str, status: str | None = None):
    q = (
        get_client().table("appointments")
        .select("*")
        .eq("customer_id", customer_id)
        .order("date", desc=True)
    )
    if status:
        q = q.eq("status", status)
    return q.execute().data or []


def get_appointment(appointment_id: str, customer_id: str):
    r = (
        get_client().table("appointments")
        .select("*")
        .eq("id", appointment_id)
        .eq("customer_id", customer_id)
        .limit(1)
        .execute()
    )
    return r.data[0] if r.data else None


def create_appointment(data: dict):
    r = get_client().table("appointments").insert(data).execute()
    return r.data[0] if r.data else None


def cancel_appointment(appointment_id: str, customer_id: str):
    from .serializers import now_iso
    r = (
        get_client().table("appointments")
        .update({"status": "cancelado", "updated_at": now_iso()})
        .eq("id", appointment_id)
        .eq("customer_id", customer_id)
        .in_("status", ["pendente", "confirmado"])
        .execute()
    )
    return r.data[0] if r.data else None


# ── Availability ──────────────────────────────────────────────────────────────

def get_available_slots(year: int, month: int):
    from datetime import date
    start = date(year, month, 1).isoformat()
    end = date(year + 1, 1, 1).isoformat() if month == 12 else date(year, month + 1, 1).isoformat()
    r = (
        get_client().table("availability_slots")
        .select("*")
        .gte("date", start)
        .lt("date", end)
        .eq("is_available", True)
        .order("date")
        .execute()
    )
    return r.data or []


def get_available_times(date_str: str):
    r = (
        get_client().table("availability_slots")
        .select("*")
        .eq("date", date_str)
        .eq("is_available", True)
        .order("time_slot")
        .execute()
    )
    return r.data or []


# ── Estimates ─────────────────────────────────────────────────────────────────

def list_estimates(customer_id: str, status: str | None = None):
    q = (
        get_client().table("estimates")
        .select("*, estimate_items(*)")
        .eq("customer_id", customer_id)
        .order("created_at", desc=True)
    )
    if status:
        q = q.eq("status", status)
    return q.execute().data or []


def get_estimate(estimate_id: str, customer_id: str):
    r = (
        get_client().table("estimates")
        .select("*, estimate_items(*)")
        .eq("id", estimate_id)
        .eq("customer_id", customer_id)
        .limit(1)
        .execute()
    )
    return r.data[0] if r.data else None


def update_estimate_status(estimate_id: str, customer_id: str, new_status: str, comment: str = ""):
    from .serializers import now_iso
    data: dict = {"status": new_status, "updated_at": now_iso()}
    if comment:
        data["customer_comment"] = comment
    r = (
        get_client().table("estimates")
        .update(data)
        .eq("id", estimate_id)
        .eq("customer_id", customer_id)
        .execute()
    )
    return r.data[0] if r.data else None


# ── Service History ───────────────────────────────────────────────────────────

def list_service_history(customer_id: str, vehicle_id: str | None = None):
    q = (
        get_client().table("service_history")
        .select("*, service_history_items(*)")
        .eq("customer_id", customer_id)
        .order("service_date", desc=True)
    )
    if vehicle_id:
        q = q.eq("vehicle_id", vehicle_id)
    return q.execute().data or []


def get_service_history_item(history_id: str, customer_id: str):
    r = (
        get_client().table("service_history")
        .select("*, service_history_items(*)")
        .eq("id", history_id)
        .eq("customer_id", customer_id)
        .limit(1)
        .execute()
    )
    return r.data[0] if r.data else None


# ── Notifications ─────────────────────────────────────────────────────────────

def list_notifications(customer_id: str, unread_only: bool = False):
    q = (
        get_client().table("notifications")
        .select("*")
        .eq("customer_id", customer_id)
        .order("created_at", desc=True)
        .limit(50)
    )
    if unread_only:
        q = q.eq("is_read", False)
    return q.execute().data or []


def mark_notification_read(notification_id: str, customer_id: str):
    r = (
        get_client().table("notifications")
        .update({"is_read": True})
        .eq("id", notification_id)
        .eq("customer_id", customer_id)
        .execute()
    )
    return r.data[0] if r.data else None


def mark_all_notifications_read(customer_id: str):
    get_client().table("notifications").update({"is_read": True}).eq("customer_id", customer_id).execute()


# ── Maintenance Reminders ─────────────────────────────────────────────────────

def list_reminders(customer_id: str):
    r = (
        get_client().table("maintenance_reminders")
        .select("*, customer_vehicles(brand, model, year, plate, mileage)")
        .eq("customer_id", customer_id)
        .order("urgency_score", desc=True)
        .execute()
    )
    return r.data or []


def list_vehicle_reminders(vehicle_id: str, customer_id: str):
    r = (
        get_client().table("maintenance_reminders")
        .select("*")
        .eq("vehicle_id", vehicle_id)
        .eq("customer_id", customer_id)
        .order("urgency_score", desc=True)
        .execute()
    )
    return r.data or []


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
    from datetime import datetime, timezone
    r = (
        get_client().table("vehicle_qr_links")
        .select("*")
        .eq("vehicle_id", vehicle_id)
        .eq("customer_id", customer_id)
        .eq("is_active", True)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not r.data:
        return None
    qr = r.data[0]
    # Check expiry
    expires = qr.get("expires_at")
    if expires:
        try:
            exp_dt = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                return None  # expired
        except Exception:
            pass
    return qr


def create_qr_link(vehicle_id: str, customer_id: str) -> dict:
    import uuid as _uuid
    from .serializers import now_iso
    from datetime import datetime, timedelta, timezone

    # Deactivate old ones
    (
        get_client().table("vehicle_qr_links")
        .update({"is_active": False})
        .eq("vehicle_id", vehicle_id)
        .eq("customer_id", customer_id)
        .execute()
    )

    expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    data = {
        "id": str(_uuid.uuid4()),
        "uuid": str(_uuid.uuid4()),
        "vehicle_id": vehicle_id,
        "customer_id": customer_id,
        "is_active": True,
        "created_at": now_iso(),
        "expires_at": expires,
    }
    r = get_client().table("vehicle_qr_links").insert(data).execute()
    return r.data[0] if r.data else data


def get_or_create_qr(vehicle_id: str, customer_id: str) -> dict:
    qr = get_active_qr(vehicle_id, customer_id)
    if qr:
        return qr
    return create_qr_link(vehicle_id, customer_id)


def resolve_qr_uuid(uuid_str: str) -> dict | None:
    """Public endpoint — resolve UUID to vehicle info (no PII)."""
    r = (
        get_client().table("vehicle_qr_links")
        .select("*, customer_vehicles(brand, model, year, plate, color, fuel_type)")
        .eq("uuid", uuid_str)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    return r.data[0] if r.data else None


# ── Documents ─────────────────────────────────────────────────────────────────

def list_documents(customer_id: str, vehicle_id: str | None = None):
    q = (
        get_client().table("vehicle_documents")
        .select("*")
        .eq("customer_id", customer_id)
        .order("created_at", desc=True)
    )
    if vehicle_id:
        q = q.eq("vehicle_id", vehicle_id)
    return q.execute().data or []


def get_document(doc_id: str, customer_id: str):
    r = (
        get_client().table("vehicle_documents")
        .select("*")
        .eq("id", doc_id)
        .eq("customer_id", customer_id)
        .limit(1)
        .execute()
    )
    return r.data[0] if r.data else None


def create_document(data: dict):
    r = get_client().table("vehicle_documents").insert(data).execute()
    return r.data[0] if r.data else None


def delete_document(doc_id: str, customer_id: str) -> bool:
    r = (
        get_client().table("vehicle_documents")
        .delete()
        .eq("id", doc_id)
        .eq("customer_id", customer_id)
        .execute()
    )
    return bool(r.data)


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
