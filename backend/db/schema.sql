-- RevisaCar — Customer App · schema completo (idempotente)
-- Rode uma vez no SQL Editor do Supabase (Dashboard > SQL Editor > New query > cole > Run).
-- Seguro re-rodar: usa "create table if not exists" e "create index if not exists".

-- ── Clientes ────────────────────────────────────────────────────────────────
create table if not exists customers (
  id          uuid primary key,
  name        text not null,
  email       text unique not null,
  phone       text,
  cpf         text,
  address     text,
  pwhash      text not null,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_customers_email on customers (email);

-- ── Veículos do cliente ─────────────────────────────────────────────────────
create table if not exists customer_vehicles (
  id          uuid primary key,
  customer_id uuid references customers(id) on delete cascade,
  brand       text not null,
  model       text not null,
  year        integer not null,
  plate       text not null,
  color       text,
  fuel_type   text default 'flex',
  mileage     integer default 0,
  vin         text,
  renavam     text,
  notes       text,
  is_active   boolean default true,
  deleted     boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_vehicles_customer on customer_vehicles (customer_id);

-- ── Agendamentos ────────────────────────────────────────────────────────────
create table if not exists appointments (
  id                  uuid primary key,
  customer_id         uuid references customers(id) on delete cascade,
  vehicle_id          uuid references customer_vehicles(id),
  vehicle_label       text,
  service_type        text not null,
  service_description  text,
  date                date not null,
  time_slot           time not null,
  status              text default 'pendente',
  notes               text,
  rejection_reason    text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index if not exists idx_appointments_customer on appointments (customer_id);
create index if not exists idx_appointments_date on appointments (date);

-- ── Disponibilidade de horários ─────────────────────────────────────────────
create table if not exists availability_slots (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  time_slot   time not null,
  is_available boolean default true
);
create index if not exists idx_slots_date on availability_slots (date);

-- ── Orçamentos ──────────────────────────────────────────────────────────────
create table if not exists estimates (
  id              uuid primary key,
  number          text unique not null,
  customer_id     uuid references customers(id) on delete cascade,
  vehicle_id      uuid references customer_vehicles(id),
  vehicle_label   text,
  appointment_id  uuid references appointments(id),
  subtotal        numeric(10,2) default 0,
  discount        numeric(10,2) default 0,
  total           numeric(10,2) default 0,
  status          text default 'pendente',
  notes           text,
  customer_comment text,
  valid_until     date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists idx_estimates_customer on estimates (customer_id);

create table if not exists estimate_items (
  id          uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id) on delete cascade,
  description text not null,
  quantity    numeric(8,2) default 1,
  unit_price  numeric(10,2) not null,
  item_type   text default 'peca',
  subtotal    numeric(10,2) generated always as (quantity * unit_price) stored
);

-- ── Histórico de serviços ───────────────────────────────────────────────────
create table if not exists service_history (
  id                 uuid primary key,
  customer_id        uuid references customers(id) on delete cascade,
  vehicle_id         uuid references customer_vehicles(id),
  vehicle_label      text,
  service_date       date not null,
  mileage_at_service integer,
  service_type       text not null,
  total_cost         numeric(10,2),
  mechanic_notes     text,
  estimate_id        uuid references estimates(id),
  created_at         timestamptz default now()
);
create index if not exists idx_history_customer on service_history (customer_id);

create table if not exists service_history_items (
  id                 uuid primary key default gen_random_uuid(),
  service_history_id uuid references service_history(id) on delete cascade,
  description        text not null,
  part_replaced      boolean default false,
  part_name          text
);

-- ── Notificações ────────────────────────────────────────────────────────────
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  title       text not null,
  message     text,
  type        text not null,
  is_read     boolean default false,
  action_url  text,
  created_at  timestamptz default now()
);
create index if not exists idx_notifications_customer on notifications (customer_id);

-- ── Lembretes de manutenção ─────────────────────────────────────────────────
create table if not exists maintenance_reminders (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid references customers(id) on delete cascade,
  vehicle_id        uuid references customer_vehicles(id) on delete cascade,
  service_name      text not null,
  interval_km       integer,
  interval_months   integer,
  last_service_km   integer,
  last_service_date date,
  next_service_km   integer,
  next_service_date date,
  urgency           text default 'ok',
  urgency_score     integer default 0,
  progress_pct      numeric(5,2) default 0,
  km_remaining      integer
);
create index if not exists idx_reminders_vehicle on maintenance_reminders (vehicle_id);

-- ── QR Code do veículo ──────────────────────────────────────────────────────
create table if not exists vehicle_qr_links (
  id          uuid primary key,
  uuid        uuid unique not null,
  vehicle_id  uuid references customer_vehicles(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  is_active   boolean default true,
  created_at  timestamptz default now(),
  expires_at  timestamptz
);
create index if not exists idx_qr_uuid on vehicle_qr_links (uuid);
create index if not exists idx_qr_vehicle on vehicle_qr_links (vehicle_id);

-- ── Documentos do veículo ───────────────────────────────────────────────────
create table if not exists vehicle_documents (
  id            uuid primary key,
  customer_id   uuid references customers(id) on delete cascade,
  vehicle_id    uuid references customer_vehicles(id) on delete cascade,
  vehicle_label text,
  type          text not null,
  title         text not null,
  file_name     text,
  expiry_date   date,
  notes         text,
  created_at    timestamptz default now()
);
create index if not exists idx_documents_customer on vehicle_documents (customer_id);

-- ── Seed opcional: horários disponíveis para os próximos 30 dias ─────────────
-- (08:00–17:00 de seg a sáb). Descomente para popular a agenda de exemplo.
-- insert into availability_slots (date, time_slot, is_available)
-- select d::date, t::time, true
-- from generate_series(current_date, current_date + 30, '1 day') d
-- cross join unnest(array['08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00']) t
-- where extract(dow from d) between 1 and 6
-- on conflict do nothing;
