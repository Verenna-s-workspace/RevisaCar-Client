"""Testes da lógica pura da camada de serviço (sem rede/Supabase):
urgência, categorização e score de saúde do veículo."""
from customer_api.services import _urgency_penalty, _match_category, compute_health


# ── Penalidade por urgência ───────────────────────────────────────────────────

def test_urgency_penalty():
    assert _urgency_penalty("urgente") == 18
    assert _urgency_penalty("atencao") == 8
    assert _urgency_penalty("ok") == 0
    assert _urgency_penalty("desconhecido") == 0  # fallback


# ── Categorização de serviço por palavra-chave ────────────────────────────────

def test_match_category():
    assert _match_category("Troca de óleo e filtro") == "Motor"
    assert _match_category("Pastilha de freio dianteira") == "Freios"
    assert _match_category("Alinhamento e balanceamento") == "Pneus"
    assert _match_category("Troca de amortecedor") == "Suspensão"
    assert _match_category("Bateria descarregada") == "Elétrica"
    assert _match_category("Revisão da embreagem") == "Câmbio"
    assert _match_category("Serviço aleatório sem palavra-chave") == "Geral"


# ── Score de saúde ────────────────────────────────────────────────────────────

def test_health_sem_lembretes_e_perfeito():
    health = compute_health([])
    assert health["overall_score"] == 100
    # categorias padrão quando não há lembretes
    assert {c["name"] for c in health["categories"]} == {"Motor", "Freios", "Pneus", "Suspensão"}
    assert all(c["score"] == 100 for c in health["categories"])


def test_health_penaliza_por_urgencia():
    reminders = [
        {"service_name": "Troca de óleo", "urgency": "urgente"},  # -18
        {"service_name": "Freio", "urgency": "atencao"},          # -8
    ]
    health = compute_health(reminders)
    assert health["overall_score"] == 100 - 18 - 8  # 74


def test_health_score_nao_fica_negativo():
    reminders = [{"service_name": f"óleo {i}", "urgency": "urgente"} for i in range(10)]
    health = compute_health(reminders)
    assert health["overall_score"] == 0  # limitado a [0, 100]


def test_health_categorias_ordenadas_por_score_e_limitadas_a_6():
    reminders = [
        {"service_name": "óleo", "urgency": "urgente"},       # Motor  -> score 64
        {"service_name": "pastilha", "urgency": "ok"},        # Freios -> 100
        {"service_name": "pneu", "urgency": "atencao"},       # Pneus  -> 84
    ]
    health = compute_health(reminders)
    scores = [c["score"] for c in health["categories"]]
    assert scores == sorted(scores)          # pior primeiro
    assert health["categories"][0]["name"] == "Motor"
    assert len(health["categories"]) <= 6
