# Deploy — RevisaCar Client

Três peças: **frontend na Vercel**, **backend no Render (Docker)**, **banco/storage no Supabase** (já existente).

```
Vercel (React/PWA)  ──HTTPS──►  Render (Django/gunicorn)  ──►  Supabase (Postgres + Storage)
```

Os arquivos de deploy já estão no repo: `render.yaml` (backend) e `frontend/vercel.json` (front).

## 1. Backend no Render
1. **New → Blueprint** → aponta pro repositório. O Render lê o `render.yaml` e cria o serviço (Docker, migra no pre-deploy, gera o `DJANGO_SECRET_KEY`).
2. Preencha os envs marcados como *secret* no painel:
   - `DATABASE_URL` — connection string do Supabase (pooler, porta 5432).
   - `CORS_ALLOWED_ORIGINS` — `https://SEU-FRONT.vercel.app` (domínio exato, com `https://`, sem barra final).
   - `FRONTEND_URL` — mesmo domínio do front.
3. `DEBUG=False`, `REFRESH_COOKIE_SAMESITE=None`, `REFRESH_COOKIE_SECURE=True` e o host já vêm do blueprint / automáticos (`RENDER_EXTERNAL_HOSTNAME`).

## 2. Frontend na Vercel
1. **New Project** → importa o repo → **Root Directory: `frontend`** (o `vercel.json` cuida do build e do SPA routing).
2. Env var: `VITE_API_URL=https://SEU-APP.onrender.com/api`.
3. **Não** setar `VITE_BYPASS_LOGIN` nem `VITE_SHOWCASE` → produção real (sem mocks, sem telas de vitrine).

## 3. Pós-deploy (checklist)
- [ ] Migrações rodaram (pre-deploy do Render).
- [ ] Login/cadastro funcionam ponta a ponta.
- [ ] **RLS** (recomendado): rode `backend/db/rls.sql`, troque o `DATABASE_URL` para o role `revisacar_app` e confirme com `python manage.py check_rls`.
- [ ] Opcionais quando tiver as chaves: `USE_S3` (upload real), `PLATE_LOOKUP_URL` (consulta de placa), `VAPID_*` (push), `EMAIL_HOST` (e-mails).

## Tropeços comuns (todos de config)
| Sintoma | Causa |
|---|---|
| 401 no refresh após login | falta `REFRESH_COOKIE_SAMESITE=None` + `SECURE=True`, ou CORS sem o domínio exato |
| `DisallowedHost` | domínio do Render fora do `ALLOWED_HOSTS` (normalmente automático via `RENDER_EXTERNAL_HOSTNAME`) |
| CORS bloqueado no navegador | `CORS_ALLOWED_ORIGINS` tem que ser o domínio do Vercel, com `https://` e sem barra final |

> Alternativa "tudo num lugar só": há `docker-compose.yml` + Dockerfiles no repo para rodar em VPS/Railway/Fly.
> Para desenvolvimento local, use `./dev.sh` (backend + frontend juntos).
