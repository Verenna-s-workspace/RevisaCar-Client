"""Consulta de placa (marca/modelo/ano/cor) via provedor externo.

Não existe API oficial gratuita do DETRAN — a consulta real depende de um
provedor pago (APIBrasil, API de Placas, wdapi, etc.). Este módulo é
provider-agnóstico: fica inerte enquanto PLATE_LOOKUP_URL não for configurada e,
quando for, mapeia a resposta do provedor para um formato normalizado usando um
mapa de campos configurável por env (PLATE_LOOKUP_MAP). Nunca vaza erro/credencial
ao cliente: em qualquer falha devolve None e loga no servidor.
"""
from __future__ import annotations

import json
import logging
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

# Campos-alvo → chave na resposta do provedor. Defaults miram nomes comuns em
# provedores BR (marca/modelo/ano/cor/combustivel). Sobrescreva via PLATE_LOOKUP_MAP.
DEFAULT_MAP = {
    "brand": "marca",
    "model": "modelo",
    "year": "ano",
    "color": "cor",
    "fuel_type": "combustivel",
}


def is_enabled() -> bool:
    """True só quando um provedor foi configurado (feature-flag por env)."""
    return bool(getattr(settings, "PLATE_LOOKUP_URL", ""))


def normalize_plate(plate: str) -> str:
    return "".join(ch for ch in (plate or "").upper() if ch.isalnum())


def _dig(data, path: str):
    """Navega um dict/list por caminho pontilhado ('data.veiculo.marca')."""
    cur = data
    for part in path.split("."):
        if isinstance(cur, list):
            try:
                cur = cur[int(part)]
            except (ValueError, IndexError):
                return None
        elif isinstance(cur, dict):
            cur = cur.get(part)
        else:
            return None
        if cur is None:
            return None
    return cur


def _fetch(url: str, headers: dict, timeout: float):
    """Isolado para ser facilmente mockado nos testes."""
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # nosec B310 (URL vem de env de confiança)
        return json.loads(resp.read().decode("utf-8"))


def lookup_plate(plate: str):
    """Consulta a placa no provedor e devolve dados normalizados ou None.

    Retorno: {"plate", "brand", "model", "year"?, "color"?, "fuel_type"?} ou None.
    """
    if not is_enabled():
        return None

    plate = normalize_plate(plate)
    if not plate:
        return None

    url = settings.PLATE_LOOKUP_URL.replace("{plate}", plate)
    headers = {"Accept": "application/json"}
    if settings.PLATE_LOOKUP_TOKEN:
        headers[settings.PLATE_LOOKUP_AUTH_HEADER] = settings.PLATE_LOOKUP_TOKEN

    try:
        payload = _fetch(url, headers, settings.PLATE_LOOKUP_TIMEOUT)
    except Exception as exc:  # noqa: BLE001 — falha do provedor não pode derrubar o fluxo
        logger.warning("Consulta de placa falhou (%s): %s", plate, exc)
        return None

    root = _dig(payload, settings.PLATE_LOOKUP_ROOT) if settings.PLATE_LOOKUP_ROOT else payload
    if not isinstance(root, dict):
        return None

    mapping = settings.PLATE_LOOKUP_MAP or DEFAULT_MAP
    out = {}
    for field, path in mapping.items():
        val = _dig(root, path)
        if val is not None and val != "":
            out[field] = val

    # Sem marca nem modelo não há nada útil para pré-preencher.
    if not out.get("brand") and not out.get("model"):
        return None

    if "year" in out:
        try:
            out["year"] = int(str(out["year"])[:4])
        except (ValueError, TypeError):
            out.pop("year", None)

    for k in ("brand", "model", "color", "fuel_type"):
        if k in out:
            out[k] = str(out[k]).strip()

    out["plate"] = plate
    return out
