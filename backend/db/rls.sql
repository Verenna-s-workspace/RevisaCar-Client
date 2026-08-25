-- ============================================================================
-- RLS (Row-Level Security) — defesa em profundidade no Postgres.
--
-- POR QUÊ: hoje o isolamento por cliente é garantido no código (todo query do
-- ORM filtra customer_id — ver customer_api/tests/test_tenancy.py). A RLS
-- adiciona uma 2ª camada: mesmo que um dia uma query esqueça o filtro, o BANCO
-- só devolve/aceita linhas do cliente do token.
--
-- IMPORTANTE — o usuário `postgres` do Supabase tem BYPASSRLS=true (ignora RLS).
-- Por isso o app NÃO pode conectar como `postgres` para a RLS valer. Este script
-- cria um role dedicado `revisacar_app` (sem bypassrls) e o app passa a conectar
-- com ele. O `app.customer_id` é setado por requisição pelo RLSMiddleware.
--
-- COMO APLICAR (uma vez, no SQL Editor do Supabase ou via psql):
--   1) Troque __DEFINA_UMA_SENHA_FORTE__ por uma senha forte.
--   2) Rode este arquivo inteiro.
--   3) Atualize o DATABASE_URL do backend para conectar como revisacar_app:
--      postgresql://revisacar_app.<REF>:<SENHA>@aws-0-<regiao>.pooler.supabase.com:5432/postgres
--   4) Reinicie o backend e teste (login, dashboard, criar veículo).
--
-- REVERTER: ver o bloco comentado no fim do arquivo.
-- ============================================================================

-- ── 1) Role da aplicação (sem bypassrls, sem superuser) ─────────────────────
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'revisacar_app') then
    create role revisacar_app login password '__DEFINA_UMA_SENHA_FORTE__' nosuperuser nobypassrls nocreatedb nocreaterole;
  end if;
end$$;

grant usage on schema public to revisacar_app;
grant select, insert, update, delete on all tables in schema public to revisacar_app;
grant usage, select on all sequences in schema public to revisacar_app;
-- objetos futuros herdam os grants automaticamente
alter default privileges in schema public grant select, insert, update, delete on tables to revisacar_app;
alter default privileges in schema public grant usage, select on sequences to revisacar_app;

-- ── 2) Função helper: o cliente do contexto da requisição ───────────────────
create or replace function app_current_customer() returns uuid as $$
  select nullif(current_setting('app.customer_id', true), '')::uuid
$$ language sql stable;

-- ── 3) RLS + política nas tabelas com customer_id direto ────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'customer_vehicles','appointments','estimates','service_history',
    'notifications','maintenance_reminders','vehicle_documents'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists %I on %I', t||'_isolation', t);
    execute format(
      'create policy %I on %I using (customer_id = app_current_customer()) with check (customer_id = app_current_customer())',
      t||'_isolation', t);
  end loop;
end$$;

-- ── 4) Tabelas-filhas (sem customer_id direto) — isola via o pai ────────────
alter table estimate_items enable row level security;
alter table estimate_items force row level security;
drop policy if exists estimate_items_isolation on estimate_items;
create policy estimate_items_isolation on estimate_items
  using (estimate_id in (select id from estimates where customer_id = app_current_customer()))
  with check (estimate_id in (select id from estimates where customer_id = app_current_customer()));

alter table service_history_items enable row level security;
alter table service_history_items force row level security;
drop policy if exists service_history_items_isolation on service_history_items;
create policy service_history_items_isolation on service_history_items
  using (service_history_id in (select id from service_history where customer_id = app_current_customer()))
  with check (service_history_id in (select id from service_history where customer_id = app_current_customer()));

-- OBS: NÃO habilitamos RLS em:
--   customers            -> o login busca por e-mail ANTES de haver contexto de cliente;
--   auth_rate_limit / password_reset_tokens -> fluxos sem sessão;
--   availability_slots   -> dado público (agenda da oficina);
--   vehicle_qr_links     -> resolve público por uuid (sem PII sensível).
-- O acesso a essas tabelas continua controlado pelo código.

-- ============================================================================
-- REVERTER (se necessário):
-- do $$ declare t text; begin
--   foreach t in array array['customer_vehicles','appointments','estimates',
--     'service_history','notifications','maintenance_reminders','vehicle_documents',
--     'estimate_items','service_history_items'] loop
--     execute format('drop policy if exists %I on %I', t||'_isolation', t);
--     execute format('alter table %I no force row level security', t);
--     execute format('alter table %I disable row level security', t);
--   end loop;
-- end$$;
-- (e volte o DATABASE_URL para o usuário postgres)
-- ============================================================================
