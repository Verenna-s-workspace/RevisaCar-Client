# Deploy — RevisaCar Client (tudo no Render)

Três peças: **frontend (Static Site)** e **backend (Web Service Docker)** no Render,
**banco/storage no Supabase** (já existente).

```
Render Static Site (React/PWA)  ──HTTPS──►  Render Web Service (Django/gunicorn)  ──►  Supabase (Postgres + Storage)
```

Tudo é criado por um único **Blueprint**: o `render.yaml` na raiz define os dois
serviços. (O `frontend/vercel.json` continua no repo caso queira usar a Vercel.)

## Deploy por Blueprint (recomendado)
1. **New → Blueprint** → conecte o repositório `Verenna-s-workspace/RevisaCar-Client`.
   O Render lê o `render.yaml` e propõe **dois serviços**:
   - `revisacar-customer-api` (Docker, backend) — migra no boot, gera `DJANGO_SECRET_KEY`.
   - `revisacar-customer-web` (Static Site, frontend) — build `npm ci && npm run build`, publica `dist/`.
2. O Render vai pedir os envs marcados como *secret* (`sync:false`):
   - **`DATABASE_URL`** (no backend) — connection string do Supabase (pooler, porta 5432).
   - **`VITE_API_URL`** (no frontend) — deixe em branco por ora se o backend ainda
     não tem URL; preencha depois (passo 3).
3. Aplique. Quando o **backend** terminar de subir, copie a URL dele
   (`https://revisacar-customer-api.onrender.com`) e no serviço **web** defina
   `VITE_API_URL = https://revisacar-customer-api.onrender.com/api` (com `/api`, sem
   barra final) e faça **Manual Deploy → Clear build cache & deploy** do front.
   > O `VITE_API_URL` é lido em **tempo de build** pelo Vite, então toda vez que ele
   > mudar é preciso rebuildar o front.

O que é automático (não precisa mexer):
- `CORS_ALLOWED_ORIGINS` e `FRONTEND_URL` do backend são preenchidos via
  `fromService` com o host do front — o `settings.py` prefixa `https://` sozinho.
- `DEBUG=False`, `REFRESH_COOKIE_SAMESITE=None`, `REFRESH_COOKIE_SECURE=True`,
  e o `ALLOWED_HOSTS` (via `RENDER_EXTERNAL_HOSTNAME`).

> As **migrações rodam no boot** (`backend/start.sh`) porque o free tier do Render
> não tem `preDeployCommand`. Se você ativar a RLS e o `DATABASE_URL` virar o role
> `revisacar_app` (sem DDL), rode `migrate` uma vez com o usuário admin — o boot
> tolera a falha e sobe assim mesmo.

## Pós-deploy (checklist)
- [ ] Backend responde em `https://…onrender.com/api/` (health check verde).
- [ ] `VITE_API_URL` do front aponta pro backend + rebuild feito.
- [ ] Login/cadastro funcionam ponta a ponta (sem erro de CORS no console).
- [ ] **RLS** (recomendado): rode `backend/db/rls.sql`, troque o `DATABASE_URL` para o
      role `revisacar_app` e confirme com `python manage.py check_rls`.
- [ ] Opcionais quando tiver as chaves: `USE_S3` (upload real), `PLATE_LOOKUP_URL`
      (consulta de placa), `VAPID_*` (push), `EMAIL_HOST` (e-mails).

## Tropeços comuns (todos de config)
| Sintoma | Causa |
|---|---|
| Front carrega mas toda chamada falha | `VITE_API_URL` errado ou front não foi rebuildado após setá-lo |
| CORS bloqueado no navegador | origem do front não liberada — confira que o serviço web subiu e o backend redeployou depois |
| 401 no refresh após login | falta `REFRESH_COOKIE_SAMESITE=None` + `SECURE=True` (já vêm do blueprint) |
| `DisallowedHost` | domínio do Render fora do `ALLOWED_HOSTS` (normalmente automático via `RENDER_EXTERNAL_HOSTNAME`) |
| Spin-down (primeira req lenta) | plano `free` hiberna — suba o backend pra `starter` se incomodar |

> Alternativa "tudo num container": há `docker-compose.yml` + Dockerfiles no repo para
> rodar em VPS/Railway/Fly. Para desenvolvimento local, use `./dev.sh`.
