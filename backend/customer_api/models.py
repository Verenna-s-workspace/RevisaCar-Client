"""Models do ORM (migração da camada Supabase-REST para Postgres direto).

O Django passa a ser o dono do schema (migrations). Os nomes de tabela batem
com o schema.sql anterior para facilitar a transição. Isolamento por cliente
(multi-tenant) é sempre via FK `customer` + filtro nas queries — e, com o
Postgres direto, dá para reforçar com RLS/roles no banco.
"""
import uuid

from django.db import models


class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, default="")
    cpf = models.CharField(max_length=14, blank=True, default="")
    address = models.TextField(blank=True, default="")
    pwhash = models.CharField(max_length=255)
    avatar_url = models.URLField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "customers"


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
