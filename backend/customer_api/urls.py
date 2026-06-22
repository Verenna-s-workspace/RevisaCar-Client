from django.urls import path
from . import views

app_name = "customer_api"

urlpatterns = [
    path("", views.api_root, name="root"),

    # ── Auth ──────────────────────────────────────────────────────────────────
    path("customer/auth/register",        views.register,       name="register"),
    path("customer/auth/login",           views.login,          name="login"),
    path("customer/auth/refresh",         views.token_refresh,  name="token-refresh"),
    path("customer/auth/forgot-password", views.forgot_password,name="forgot-password"),

    # ── Profile ───────────────────────────────────────────────────────────────
    path("customer/me",                   views.profile,         name="profile"),
    path("customer/me/change-password",   views.change_password, name="change-password"),

    # ── Dashboard ─────────────────────────────────────────────────────────────
    path("customer/dashboard",            views.dashboard,       name="dashboard"),

    # ── Vehicles ──────────────────────────────────────────────────────────────
    path("customer/vehicles",                            views.vehicles_list,     name="vehicles-list"),
    path("customer/vehicles/<str:vehicle_id>",           views.vehicle_detail,    name="vehicle-detail"),
    path("customer/vehicles/<str:vehicle_id>/health",    views.vehicle_health,    name="vehicle-health"),
    path("customer/vehicles/<str:vehicle_id>/qr",        views.vehicle_qr,        name="vehicle-qr"),
    path("customer/vehicles/<str:vehicle_id>/qr/refresh",views.vehicle_qr_refresh,name="vehicle-qr-refresh"),

    # ── QR (public resolve) ───────────────────────────────────────────────────
    path("qr/<str:uuid_str>",             views.qr_resolve,      name="qr-resolve"),

    # ── Documents ─────────────────────────────────────────────────────────────
    path("customer/documents",            views.documents_list,  name="documents-list"),
    path("customer/documents/<str:doc_id>",views.document_detail,name="document-detail"),

    # ── Appointments ──────────────────────────────────────────────────────────
    path("customer/appointments",                          views.appointments_list,  name="appointments-list"),
    path("customer/appointments/<str:appointment_id>",     views.appointment_detail, name="appointment-detail"),

    # ── Availability ──────────────────────────────────────────────────────────
    path("customer/availability",         views.available_days,  name="available-days"),
    path("customer/availability/times",   views.available_times, name="available-times"),

    # ── Estimates ─────────────────────────────────────────────────────────────
    path("customer/estimates",                         views.estimates_list,  name="estimates-list"),
    path("customer/estimates/<str:estimate_id>",       views.estimate_detail, name="estimate-detail"),

    # ── History ───────────────────────────────────────────────────────────────
    path("customer/history",                           views.history_list,   name="history-list"),
    path("customer/history/<str:history_id>",          views.history_detail, name="history-detail"),

    # ── Notifications ─────────────────────────────────────────────────────────
    path("customer/notifications",                                    views.notifications_list,  name="notifications-list"),
    path("customer/notifications/read-all",                           views.notifications_read_all,name="notifications-read-all"),
    path("customer/notifications/<str:notification_id>/read",         views.notification_read,   name="notification-read"),

    # ── Reminders ─────────────────────────────────────────────────────────────
    path("customer/reminders",            views.reminders_list,  name="reminders-list"),
]
