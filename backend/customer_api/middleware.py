"""Middleware de RLS: injeta o cliente autenticado como variável de sessão do
Postgres (`app.customer_id`), que as políticas RLS usam para isolar os dados.

Defesa em profundidade: mesmo que uma query esqueça o `.filter(customer_id=...)`,
o banco só devolve/aceita linhas do cliente do token. Requisições sem token
(login, registro, resolve público de QR) rodam sem o valor setado — as tabelas
com RLS ficam vazias para elas (fail-safe), e essas rotas não dependem delas.

Usa o session pooler (a variável persiste na conexão); reseta ao fim de cada
request para não vazar contexto entre requisições numa conexão reaproveitada.
"""
from django.db import connection


class RLSMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from .views import _decode_bearer  # import tardio evita ciclo

        customer = _decode_bearer(request)
        customer_id = customer.get("id") if customer else None

        self._set(customer_id)
        try:
            return self.get_response(request)
        finally:
            self._set(None)

    @staticmethod
    def _set(customer_id):
        # sqlite (testes) não tem GUC/RLS — ignora silenciosamente.
        if connection.vendor != "postgresql":
            return
        try:
            with connection.cursor() as cur:
                if customer_id:
                    cur.execute("SELECT set_config('app.customer_id', %s, false)", [str(customer_id)])
                else:
                    cur.execute("SELECT set_config('app.customer_id', '', false)")
        except Exception:
            # nunca derruba a request por causa do RLS setup.
            pass
