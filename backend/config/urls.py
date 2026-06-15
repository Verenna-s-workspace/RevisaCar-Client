from django.urls import path, include

urlpatterns = [
    path("api/", include("customer_api.urls")),
]
