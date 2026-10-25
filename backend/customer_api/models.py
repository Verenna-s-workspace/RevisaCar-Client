"""Models do ORM (migração da camada Supabase-REST para Postgres direto).

O Django passa a ser o dono do schema (migrations). Os nomes de tabela batem
com o schema.sql anterior para facilitar a transição. Isolamento por cliente
(multi-tenant) é sempre via FK `customer` + filtro nas queries — e, com o
Postgres direto, dá para reforçar com RLS/roles no banco.
"""
import uuid

from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower


class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    # Contas do app têm e-mail e senha. Cadastros de balcão (origem="oficina") são
    # criados pela oficina, podem não ter nenhum dos dois e NUNCA fazem login aqui.
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True, default="")
    cpf = models.CharField(max_length=14, blank=True, default="")
    address = models.TextField(blank=True, default="")
    pwhash = models.CharField(max_length=255, null=True, blank=True)
    avatar_url = models.URLField(null=True, blank=True)
    email_verified = models.BooleanField(default=False)
    origem = models.CharField(max_length=10, default="app")  # "app" | "oficina"
    oficina_origem_doc = models.CharField(max_length=40, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "customers"
        constraints = [
            # Mesmo índice do banco (migration SQL 0003): e-mail único só entre contas do app.
            models.UniqueConstraint(
                Lower("email"), condition=Q(origem="app", email__isnull=False), name="customers_email_app_uk"
            ),
        ]


class CustomerVehicle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="vehicles", db_column="customer_id")
    brand = models.CharField(max_length=60)
    model = models.CharField(max_length=80)
    year = models.IntegerField()
    plate = models.CharField(max_length=10)
    color = models.CharField(max_length=40, blank=True, default="")
    fuel_type = models.CharField(max_length=20, default="flex")
    mileage = models.IntegerField(default=0)
    vin = models.CharField(max_length=17, blank=True, default="")
    renavam = models.CharField(max_length=11, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "customer_vehicles"
        indexes = [models.Index(fields=["customer"])]


class Appointment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="appointments", db_column="customer_id")
    vehicle = models.ForeignKey(CustomerVehicle, on_delete=models.SET_NULL, null=True, db_column="vehicle_id")
    vehicle_label = models.CharField(max_length=120, blank=True, default="")
    service_type = models.CharField(max_length=100)
    service_description = models.TextField(blank=True, default="")
    date = models.DateField()
    time_slot = models.TimeField()
    status = models.CharField(max_length=20, default="pendente")
    notes = models.TextField(blank=True, default="")
    rejection_reason = models.TextField(blank=True, default="")
    # Oficina que vai atender (admins.doc). Obrigatória para pedidos novos; nula só em pedidos antigos.
    oficina_doc = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "appointments"
        indexes = [models.Index(fields=["customer"]), models.Index(fields=["date"])]


class AvailabilitySlot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField()
    time_slot = models.TimeField()
    is_available = models.BooleanField(default=True)
    # Nulo = horário geral (vale para qualquer oficina); preenchido = só daquela oficina.
    oficina_doc = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "availability_slots"
        indexes = [models.Index(fields=["date"])]


class Estimate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=40, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="estimates", db_column="customer_id")
    vehicle = models.ForeignKey(CustomerVehicle, on_delete=models.SET_NULL, null=True, db_column="vehicle_id")
    vehicle_label = models.CharField(max_length=120, blank=True, default="")
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True, db_column="appointment_id")
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default="pendente")
    notes = models.TextField(blank=True, default="")
    customer_comment = models.TextField(blank=True, default="")
    valid_until = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "estimates"
        indexes = [models.Index(fields=["customer"])]


class EstimateItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    estimate = models.ForeignKey(Estimate, on_delete=models.CASCADE, related_name="items", db_column="estimate_id")
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=8, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    item_type = models.CharField(max_length=20, default="peca")

    class Meta:
        db_table = "estimate_items"


class ServiceHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="history", db_column="customer_id")
    vehicle = models.ForeignKey(CustomerVehicle, on_delete=models.SET_NULL, null=True, db_column="vehicle_id")
    vehicle_label = models.CharField(max_length=120, blank=True, default="")
    service_date = models.DateField()
    mileage_at_service = models.IntegerField(null=True, blank=True)
    service_type = models.CharField(max_length=120)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    mechanic_notes = models.TextField(blank=True, default="")
    estimate = models.ForeignKey(Estimate, on_delete=models.SET_NULL, null=True, blank=True, db_column="estimate_id")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "service_history"
        indexes = [models.Index(fields=["customer"])]


class ServiceHistoryItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_history = models.ForeignKey(ServiceHistory, on_delete=models.CASCADE, related_name="items", db_column="service_history_id")
    description = models.CharField(max_length=255)
    part_replaced = models.BooleanField(default=False)
    part_name = models.CharField(max_length=120, blank=True, default="")

    class Meta:
        db_table = "service_history_items"


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="notifications", db_column="customer_id")
    title = models.CharField(max_length=150)
    message = models.TextField(blank=True, default="")
    type = models.CharField(max_length=30)
    is_read = models.BooleanField(default=False)
    action_url = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        indexes = [models.Index(fields=["customer"])]


class MaintenanceReminder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="reminders", db_column="customer_id")
    vehicle = models.ForeignKey(CustomerVehicle, on_delete=models.CASCADE, db_column="vehicle_id")
    service_name = models.CharField(max_length=120)
    interval_km = models.IntegerField(null=True, blank=True)
    interval_months = models.IntegerField(null=True, blank=True)
    last_service_km = models.IntegerField(null=True, blank=True)
    last_service_date = models.DateField(null=True, blank=True)
    next_service_km = models.IntegerField(null=True, blank=True)
    next_service_date = models.DateField(null=True, blank=True)
    urgency = models.CharField(max_length=20, default="ok")
    urgency_score = models.IntegerField(default=0)
    progress_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    km_remaining = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "maintenance_reminders"
        indexes = [models.Index(fields=["vehicle"])]


class VehicleQrLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    uuid = models.UUIDField(unique=True, default=uuid.uuid4)
    vehicle = models.ForeignKey(CustomerVehicle, on_delete=models.CASCADE, db_column="vehicle_id")
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, db_column="customer_id")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "vehicle_qr_links"
        indexes = [models.Index(fields=["uuid"]), models.Index(fields=["vehicle"])]


class VehicleDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="documents", db_column="customer_id")
    vehicle = models.ForeignKey(CustomerVehicle, on_delete=models.CASCADE, db_column="vehicle_id")
    vehicle_label = models.CharField(max_length=120, blank=True, default="")
    type = models.CharField(max_length=30)
    title = models.CharField(max_length=150)
    file_name = models.CharField(max_length=255, blank=True, default="")
    expiry_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "vehicle_documents"
        indexes = [models.Index(fields=["customer"])]


# ── Segurança (rate limiting + reset de senha) ────────────────────────────────

class AuthRateLimit(models.Model):
    bucket = models.CharField(max_length=255)
    kind = models.CharField(max_length=30)
    created_at = models.FloatField()  # epoch (segundos)

    class Meta:
        db_table = "auth_rate_limit"
        indexes = [models.Index(fields=["bucket", "kind"])]


class PasswordResetToken(models.Model):
    token_hash = models.CharField(max_length=64, primary_key=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, db_column="customer_id")
    email = models.EmailField()
    expires_at = models.FloatField()  # epoch (segundos)
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "password_reset_tokens"


class EmailVerificationToken(models.Model):
    token_hash = models.CharField(max_length=64, primary_key=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, db_column="customer_id")
    email = models.EmailField()
    expires_at = models.FloatField()  # epoch (segundos)
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "email_verification_tokens"


class PushSubscription(models.Model):
    """Inscrição de Web Push (um endpoint por dispositivo/navegador do cliente)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="push_subscriptions", db_column="customer_id")
    endpoint = models.TextField(unique=True)
    p256dh = models.CharField(max_length=255)
    auth = models.CharField(max_length=255)
    user_agent = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "push_subscriptions"
        indexes = [models.Index(fields=["customer"])]


# ── Carteira de oficinas (criada na migration SQL 0003; compartilhada com o app da oficina) ──────

class OficinaCliente(models.Model):
    """Vínculo cliente ↔ oficina. O app do cliente só LÊ; quem cria é a função SQL `oficina_convite_usar`."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    oficina_doc = models.TextField()
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="oficinas", db_column="customer_id")
    origem = models.CharField(max_length=20)
    status = models.CharField(max_length=20, default="ativo")
    observacoes = models.TextField(blank=True, default="")
    confirmado_em = models.DateTimeField(null=True, blank=True)
    revogado_em = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "oficina_clientes"
        constraints = [models.UniqueConstraint(fields=["oficina_doc", "customer"], name="oficina_clientes_oficina_cliente_uk")]


# ── Tabelas do app da OFICINA, só leitura aqui (managed=False: o Django nunca as cria nem altera) ──
# Cada model mapeia apenas as colunas que o cliente pode ver. Colunas internas da oficina
# (pwhash de admins, custo_unitario de orcamento_itens...) ficam de fora de propósito:
# o ORM nunca as seleciona, então não há como vazarem por engano.

class Oficina(models.Model):
    id = models.IntegerField(primary_key=True)
    doc = models.TextField()
    nome = models.TextField()

    class Meta:
        managed = False
        db_table = "admins"


class Ordem(models.Model):
    id = models.TextField(primary_key=True)
    oficina_doc = models.TextField()
    customer_id = models.UUIDField(null=True)
    os_num = models.TextField(null=True)
    placa = models.TextField(null=True)
    modelo = models.TextField(null=True)
    status = models.TextField(null=True)

    class Meta:
        managed = False
        db_table = "ordens"


class Orcamento(models.Model):
    id = models.UUIDField(primary_key=True)
    oficina_doc = models.TextField()
    ordem_id = models.TextField()
    versao = models.IntegerField()
    status = models.TextField()
    validade_ate = models.DateField(null=True)
    observacoes = models.TextField(default="")
    total = models.DecimalField(max_digits=12, decimal_places=2)
    enviado_em = models.DateTimeField(null=True)
    aprovado_em = models.DateTimeField(null=True)
    recusado_em = models.DateTimeField(null=True)
    motivo_recusa = models.TextField(null=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "orcamentos"


class OrcamentoItem(models.Model):
    id = models.UUIDField(primary_key=True)
    orcamento_id = models.UUIDField()
    posicao = models.IntegerField(default=0)
    tipo = models.TextField()
    descricao = models.TextField()
    marca = models.TextField(default="")
    quantidade = models.DecimalField(max_digits=12, decimal_places=3)
    preco_unitario = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        managed = False
        db_table = "orcamento_itens"
