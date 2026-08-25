from django.db import migrations


def mark_existing_verified(apps, schema_editor):
    # Clientes que já existiam antes da feature de verificação são considerados
    # verificados (não faz sentido travar quem já usava o app).
    Customer = apps.get_model("customer_api", "Customer")
    Customer.objects.update(email_verified=True)


class Migration(migrations.Migration):
    dependencies = [
        ("customer_api", "0002_customer_email_verified_emailverificationtoken"),
    ]
    operations = [
        migrations.RunPython(mark_existing_verified, migrations.RunPython.noop),
    ]
