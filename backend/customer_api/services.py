"""
Camada de serviço — Django ORM sobre Postgres.
Tabelas: customers, customer_vehicles, appointments, estimates, estimate_items,
service_history, notifications, maintenance_reminders, availability_slots,
vehicle_qr_links, vehicle_documents. (migração da camada Supabase-REST concluída)
"""
from __future__ import annotations
import datetime as _dt
import decimal as _decimal
import uuid as _uuid

from . import models


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
    """Conta do APP com esse e-mail. Cadastros de balcão (origem="oficina") ficam de
    fora de propósito: não têm senha, são privados da oficina e podem repetir o e-mail
    de uma conta do app — sem este filtro o login/cadastro/recuperação poderia pegar a
    linha errada."""
    if not email:
        return None
    return _row(
        models.Customer.objects.filter(origem="app", email__iexact=email.strip()).order_by("created_at").first()
    )


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

def _slots_da_oficina(qs, oficina_doc: str | None):
    """Horários gerais (oficina_doc nulo) valem para todas; os da oficina valem só para ela."""
    if oficina_doc:
        from django.db.models import Q
        qs = qs.filter(Q(oficina_doc=oficina_doc) | Q(oficina_doc__isnull=True))
    return qs


def get_available_slots(year: int, month: int, oficina_doc: str | None = None):
    from datetime import date
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    qs = models.AvailabilitySlot.objects.filter(date__gte=start, date__lt=end, is_available=True)
    return [_row(s) for s in _slots_da_oficina(qs, oficina_doc).order_by("date")]


def get_available_times(date_str: str, oficina_doc: str | None = None):
    qs = models.AvailabilitySlot.objects.filter(date=date_str, is_available=True)
    return [_row(s) for s in _slots_da_oficina(qs, oficina_doc).order_by("time_slot")]


# ── Oficinas (carteira) ───────────────────────────────────────────────────────

def _nomes_das_oficinas(docs):
    return {o.doc: o.nome for o in models.Oficina.objects.filter(doc__in=list(docs))}


def list_oficinas(customer_id: str):
    """Oficinas em que o cliente está vinculado (ativo), mais recentes primeiro."""
    vinculos = list(models.OficinaCliente.objects.filter(customer_id=customer_id, status="ativo").order_by("-confirmado_em", "-created_at"))
    nomes = _nomes_das_oficinas(v.oficina_doc for v in vinculos)
    return [{
        "oficina_doc": v.oficina_doc,
        "nome": nomes.get(v.oficina_doc, ""),
        "desde": v.confirmado_em.isoformat() if v.confirmado_em else None,
    } for v in vinculos]


def usar_convite(codigo: str, customer_id: str) -> dict:
    """Entra na carteira da oficina que gerou o convite. A regra (validade, usos, vínculo bloqueado pela
    própria oficina) está na função SQL `oficina_convite_usar`; aqui só validamos o formato e chamamos.
    Retorna {"ok": bool, "codigo": str, "mensagem": str, "oficina": {...}?}."""
    import json
    from django.db import connection
    try:
        codigo = str(_uuid.UUID(str(codigo).strip()))
    except (ValueError, AttributeError, TypeError):
        return {"ok": False, "codigo": "convite_invalido", "mensagem": "Convite inválido ou cancelado."}
    with connection.cursor() as cur:
        cur.execute("select public.oficina_convite_usar(%s::uuid, %s::uuid)", [codigo, str(customer_id)])
        res = cur.fetchone()[0]
    if isinstance(res, (str, bytes)):
        res = json.loads(res)
    if res.get("ok"):
        doc = res["oficina_doc"]
        res = {"ok": True, "codigo": res.get("codigo") or "vinculado", "novo": bool(res.get("novo")),
               "oficina": {"oficina_doc": doc, "nome": _nomes_das_oficinas([doc]).get(doc, "")}}
    return res


def resolver_oficina(customer_id: str, oficina_doc: str | None):
    """Escolhe a oficina de um pedido de agendamento. Retorna (oficina_doc, None) ou (None, mensagem).
    Sem informar: só vale se o cliente tem exatamente uma oficina. Informada: tem de ser uma das dele."""
    ativas = [v["oficina_doc"] for v in list_oficinas(customer_id)]
    if not ativas:
        return None, "Entre em uma oficina com o convite que ela fornece antes de pedir um agendamento."
    if oficina_doc:
        if oficina_doc not in ativas:
            return None, "Você não está vinculado a esta oficina."
        return oficina_doc, None
    if len(ativas) > 1:
        return None, "Escolha a oficina do agendamento."
    return ativas[0], None


# ── Orçamentos da oficina (somente leitura) ───────────────────────────────────
# Só os que a oficina ENVIOU (ou que já foram decididos) para uma OS ligada ao cliente.
# Rascunho e versões substituídas são internos da oficina. Custo de peça nunca sai daqui.

ORCAMENTO_VISIVEL = ("enviado", "aprovado", "recusado")


def _orcamento_row(o, ordem, itens, nome_oficina):
    return {
        "id": str(o.id),
        "oficina": {"oficina_doc": o.oficina_doc, "nome": nome_oficina or ""},
        "os_num": ordem.os_num if ordem else None,
        "vehicle_label": " — ".join(x for x in ((ordem.modelo if ordem else None), (ordem.placa if ordem else None)) if x),
        "versao": o.versao,
        "status": o.status,
        "validade_ate": o.validade_ate.isoformat() if o.validade_ate else None,
        "observacoes": o.observacoes,
        "total": float(o.total),
        "enviado_em": o.enviado_em.isoformat() if o.enviado_em else None,
        "aprovado_em": o.aprovado_em.isoformat() if o.aprovado_em else None,
        "recusado_em": o.recusado_em.isoformat() if o.recusado_em else None,
        "motivo_recusa": o.motivo_recusa,
        "itens": [{
            "tipo": i.tipo, "descricao": i.descricao, "marca": i.marca,
            "quantidade": float(i.quantidade), "preco_unitario": float(i.preco_unitario),
            "subtotal": float(i.quantidade * i.preco_unitario),
        } for i in itens],
    }


def _orcamentos_do_cliente(customer_id: str, orcamento_id: str | None = None):
    ordens = {o.id: o for o in models.Ordem.objects.filter(customer_id=customer_id)}
    if not ordens:
        return []
    qs = models.Orcamento.objects.filter(ordem_id__in=list(ordens), status__in=ORCAMENTO_VISIVEL)
    if orcamento_id:
        qs = qs.filter(id=orcamento_id)
    orcs = list(qs.order_by("-created_at"))
    por_orc: dict = {}
    for i in models.OrcamentoItem.objects.filter(orcamento_id__in=[o.id for o in orcs]).order_by("posicao"):
        por_orc.setdefault(i.orcamento_id, []).append(i)
    nomes = _nomes_das_oficinas({o.oficina_doc for o in orcs})
    return [_orcamento_row(o, ordens.get(o.ordem_id), por_orc.get(o.id, []), nomes.get(o.oficina_doc)) for o in orcs]


def list_orcamentos(customer_id: str, status: str | None = None):
    rows = _orcamentos_do_cliente(customer_id)
    return [r for r in rows if not status or r["status"] == status]


def get_orcamento(orcamento_id: str, customer_id: str):
    try:
        orcamento_id = str(_uuid.UUID(str(orcamento_id)))
    except ValueError:
        return None
    rows = _orcamentos_do_cliente(customer_id, orcamento_id)
    return rows[0] if rows else None


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
    """Salva o arquivo no storage do Django e devolve a URL.

    Dev: FileSystemStorage (MEDIA_ROOT). Produção: configure django-storages
    (S3/Supabase Storage S3) via settings — nenhum código muda aqui.
    """
    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage
    saved = default_storage.save(f"{bucket}/{path}", ContentFile(file_bytes))
    return default_storage.url(saved)


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
