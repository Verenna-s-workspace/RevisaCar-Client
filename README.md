# RevisaCar — Customer PWA

Complete customer-facing Progressive Web App for the RevisaCar mechanic platform.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · TypeScript · Vite · TailwindCSS · Framer Motion |
| State | Zustand (auth + schedule wizard) · React Query (server state) |
| Forms | React Hook Form + Zod validation |
| Backend | Python · Django 4.2 · Django REST Framework |
| Auth | JWT (SimpleJWT) — access + refresh tokens |
| Database | Supabase (shared with mechanic app) |
| PWA | vite-plugin-pwa · Workbox · Service Worker |
| Deploy | Docker + Docker Compose + Nginx |

---

## Screens

| Route | Screen |
|---|---|
| `/login` | Login / Register |
| `/` | Dashboard (summary, vehicle hero, reminders, notifications) |
| `/veiculos` | My Vehicles (add/edit/delete with modal) |
| `/agendar` | Schedule Maintenance (4-step wizard) |
| `/historico` | Service History (search + filter + detail modal) |
| `/manutencoes` | Scheduled Maintenance (progress bars + urgency) |
| `/orcamentos` | Estimates (approve/reject with comment) |
| `/notificacoes` | Notifications (mark read, mark all) |
| `/perfil` | Profile (edit + change password + logout) |

---

## Backend API Endpoints

```
POST   /api/customer/auth/register
POST   /api/customer/auth/login
POST   /api/customer/auth/refresh
POST   /api/customer/auth/forgot-password

GET    /api/customer/dashboard
GET    /api/customer/me
PUT    /api/customer/me
POST   /api/customer/me/change-password

GET    /api/customer/vehicles
POST   /api/customer/vehicles
GET    /api/customer/vehicles/:id
PATCH  /api/customer/vehicles/:id
DELETE /api/customer/vehicles/:id

GET    /api/customer/appointments
POST   /api/customer/appointments
GET    /api/customer/appointments/:id
DELETE /api/customer/appointments/:id   (cancel)

GET    /api/customer/availability?year=&month=
GET    /api/customer/availability/times?date=

GET    /api/customer/estimates
GET    /api/customer/estimates/:id
POST   /api/customer/estimates/:id      (approve/reject)

GET    /api/customer/history
GET    /api/customer/history/:id

GET    /api/customer/notifications
POST   /api/customer/notifications/read-all
POST   /api/customer/notifications/:id/read

GET    /api/customer/reminders
```

---

## Supabase Tables Required

```sql
-- customers
create table customers (
  id uuid primary key,
  name text not null,
  email text unique not null,
  phone text,
  cpf text,
  address text,
  pwhash text not null,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- customer_vehicles
create table customer_vehicles (
  id uuid primary key,
  customer_id uuid references customers(id),
  brand text not null,
  model text not null,
  year integer not null,
  plate text not null,
  color text,
  fuel_type text default 'flex',
  mileage integer default 0,
  vin text,
  renavam text,
  notes text,
  is_active boolean default true,
  deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- appointments
create table appointments (
  id uuid primary key,
  customer_id uuid references customers(id),
  vehicle_id uuid references customer_vehicles(id),
  vehicle_label text,
  service_type text not null,
  service_description text,
  date date not null,
  time_slot time not null,
  status text default 'pendente',
  notes text,
  rejection_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- availability_slots
create table availability_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time_slot time not null,
  is_available boolean default true
);

-- estimates
create table estimates (
  id uuid primary key,
  number text unique not null,
  customer_id uuid references customers(id),
  vehicle_id uuid references customer_vehicles(id),
  vehicle_label text,
  appointment_id uuid references appointments(id),
  subtotal numeric(10,2) default 0,
  discount numeric(10,2) default 0,
  total numeric(10,2) default 0,
  status text default 'pendente',
  notes text,
  customer_comment text,
  valid_until date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- estimate_items
create table estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id) on delete cascade,
  description text not null,
  quantity numeric(8,2) default 1,
  unit_price numeric(10,2) not null,
  item_type text default 'peca',
  subtotal numeric(10,2) generated always as (quantity * unit_price) stored
);

-- service_history
create table service_history (
  id uuid primary key,
  customer_id uuid references customers(id),
  vehicle_id uuid references customer_vehicles(id),
  vehicle_label text,
  service_date date not null,
  mileage_at_service integer,
  service_type text not null,
  total_cost numeric(10,2),
  mechanic_notes text,
  estimate_id uuid references estimates(id),
  created_at timestamptz default now()
);

-- service_history_items
create table service_history_items (
  id uuid primary key default gen_random_uuid(),
  service_history_id uuid references service_history(id) on delete cascade,
  description text not null,
  part_replaced boolean default false,
  part_name text
);

-- notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  title text not null,
  message text,
  type text not null,
  is_read boolean default false,
  action_url text,
  created_at timestamptz default now()
);

-- maintenance_reminders
create table maintenance_reminders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  vehicle_id uuid references customer_vehicles(id),
  service_name text not null,
  interval_km integer,
  interval_months integer,
  last_service_km integer,
  last_service_date date,
  next_service_km integer,
  next_service_date date,
  urgency text default 'ok',
  urgency_score integer default 0,
  progress_pct numeric(5,2) default 0,
  km_remaining integer
);
```

---

## Quick Start

### 1. Clone & configure

```bash
git clone <repo>
cd revisacar-customer

# Backend env
cp backend/.env.example backend/.env
# Fill in SUPABASE_URL and SUPABASE_KEY

# Frontend env
cp frontend/.env.example frontend/.env
# VITE_API_URL=http://localhost:8001/api
```

### 2. Docker (recommended)

```bash
docker compose up --build
# Customer App: http://localhost:5174
# Customer API: http://localhost:8001/api
```

### 3. Local dev

```bash
# Backend
cd backend
pip install -r requirements.txt
python manage.py runserver 8001

# Frontend
cd frontend
npm install
npm run dev   # → http://localhost:5174
```

---

## Tests & CI

```bash
# Backend — pytest (sem rede/banco; env dummy via pytest-env)
cd backend && pip install -r requirements-dev.txt && pytest      # 26 tests

# Frontend — Vitest
cd frontend && npm install && npm test                          # 7 tests
```

Cobertura atual: validações de serializer (CPF, placa, confirmação de senha,
data de agendamento no passado, hash de senha), lógica de score de saúde do
veículo (`compute_health`, urgência e categorização) e os stores Zustand
(sessão de auth + wizard de agendamento).

CI em [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda a cada push/PR
para `main`: backend (flake8 + pytest) e frontend (typecheck + Vitest + build).

## PWA Features

- ✅ Installable on iOS / Android / Desktop
- ✅ Offline fallback (cached shell + last API responses)
- ✅ Service Worker with Workbox
- ✅ App shortcuts (Schedule, Vehicles)
- ✅ Splash screen + theme color
- ✅ Safe-area insets for notch phones

---

## Architecture Decisions

- **Separate app, shared backend** — the customer app runs on port 5174/8001, the mechanic app keeps its existing ports. They share the same Supabase project and can be deployed independently.
- **JWT stateless auth** — tokens stored in Zustand (persisted) + localStorage (for Axios interceptor). Refresh token auto-rotates on 401.
- **React Query for server state** — all API data is cached, refetched on focus, and invalidated after mutations. No prop drilling.
- **Zustand for client state** — auth session and schedule wizard state only. Everything else is React Query.
- **Bottom sheet modals** — all add/edit/confirm flows use bottom sheets with spring animations (Framer Motion) to match the mobile-first design.
- **Soft deletes** — vehicles are never hard-deleted (`deleted: true` flag).
