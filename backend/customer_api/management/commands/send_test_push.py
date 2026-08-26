"""Envia uma notificação push de teste para um cliente — verificação pós-setup.

Rode DEPOIS de configurar as chaves VAPID e o cliente ter aceitado as
notificações no navegador (ao menos uma inscrição salva):

    python manage.py send_test_push cliente@email.com

Sai != 0 se as chaves não estiverem configuradas ou não houver inscrição.
"""
from django.core.management.base import BaseCommand, CommandError

from customer_api import push
from customer_api.models import Customer, PushSubscription


class Command(BaseCommand):
    help = "Envia um push de teste para o cliente informado (por e-mail)."

    def add_arguments(self, parser):
        parser.add_argument("email", help="E-mail do cliente que receberá o teste")
        parser.add_argument("--title", default="RevisaCar")
        parser.add_argument("--body", default="Notificações ativadas com sucesso! 🚗")

    def handle(self, *args, **opts):
        if not push.is_enabled():
            raise CommandError(
                "VAPID não configurada (defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY)."
            )
        try:
            customer = Customer.objects.get(email=opts["email"])
        except Customer.DoesNotExist:
            raise CommandError(f"Cliente {opts['email']} não encontrado.")

        subs = PushSubscription.objects.filter(customer_id=customer.id).count()
        if subs == 0:
            raise CommandError(
                f"{opts['email']} não tem nenhuma inscrição de push "
                f"(o cliente precisa aceitar as notificações no app primeiro)."
            )

        sent = push.send_to_customer(customer.id, opts["title"], opts["body"], url="/notificacoes")
        self.stdout.write(self.style.SUCCESS(
            f"Enviado para {sent}/{subs} dispositivo(s) de {opts['email']}."
        ))
