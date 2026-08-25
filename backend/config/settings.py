import json
import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DEBUG = os.getenv("DEBUG", "False") == "True"

# Em produção a chave TEM que vir do ambiente — nunca um default embutido no
# repositório. Em dev (DEBUG=True) cai num placeholder para não travar o setup.
_secret = os.environ.get("DJANGO_SECRET_KEY")
if not _secret:
    if DEBUG:
        _secret = "insecure-customer-dev-key-change-in-production"
    else:
        raise RuntimeError(
            "DJANGO_SECRET_KEY não configurada. Defina a variável de ambiente antes de iniciar em produção."
        )
SECRET_KEY = _secret

# Em produção defina ALLOWED_HOSTS com os domínios reais (separados por vírgula).
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "customer_api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "customer_api.middleware.RLSMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# Postgres direto (migração para ORM). Defina DATABASE_URL no .env com a
# connection string do Supabase (Settings > Database > Connection string / URI).
# Ex.: postgresql://postgres.<ref>:<senha>@aws-0-<região>.pooler.supabase.com:6543/postgres
import dj_database_url  # noqa: E402

_db_url = os.getenv("DATABASE_URL", "")
if _db_url:
    DATABASES = {
        "default": dj_database_url.parse(_db_url, conn_max_age=600, ssl_require=not DEBUG),
    }
else:
    # Sem DATABASE_URL (ex.: testes/CI ou ainda no modo REST): sqlite em memória
    # só para o Django subir. As views ainda usam a camada Supabase REST.
    DATABASES = {
        "default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"},
    }

# ── JWT ───────────────────────────────────────────────────────────────────────

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ── Refresh token via cookie httpOnly ──────────────────────────────────────────
# O refresh token deixa de ser exposto ao JavaScript (proteção contra XSS): vai
# num cookie httpOnly e o front nunca o lê. O access token (curto, 2h) continua
# no corpo da resposta / memória. Para cross-site (front no Vercel, API no
# Render), produção precisa de REFRESH_COOKIE_SAMESITE=None + REFRESH_COOKIE_SECURE=True.
REFRESH_COOKIE_NAME = os.getenv("REFRESH_COOKIE_NAME", "revisacar_refresh")
REFRESH_COOKIE_SAMESITE = os.getenv("REFRESH_COOKIE_SAMESITE", "Lax")
REFRESH_COOKIE_SECURE = os.getenv("REFRESH_COOKIE_SECURE", str(not DEBUG)) == "True"
REFRESH_COOKIE_PATH = os.getenv("REFRESH_COOKIE_PATH", "/api/customer/auth")
REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60  # 30 dias (== REFRESH_TOKEN_LIFETIME)

# ── DRF ───────────────────────────────────────────────────────────────────────

# A autenticação é feita dentro de cada view via _require_auth() (JWT customizado
# com claim customer_id) — ver customer_api/views.py. O DRF NÃO deve autenticar
# globalmente: a JWTAuthentication do SimpleJWT espera um claim user_id + um
# modelo de usuário Django, que este app não usa, e rejeitava todo token válido
# ("token_not_valid"). SimpleJWT continua sendo usado só como biblioteca de tokens.
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

# ── CORS ──────────────────────────────────────────────────────────────────────

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3001",
    "http://127.0.0.1:5174",
]
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOW_CREDENTIALS = True

# ── Storage de arquivos (documentos) ──────────────────────────────────────────
# Dev: disco local (MEDIA_ROOT). Produção: ligue USE_S3=True e o storage passa a
# ser S3 / Supabase Storage (S3-compatível) — services.upload_document_file usa
# default_storage, então nenhum código de negócio muda.
MEDIA_URL = os.getenv("MEDIA_URL", "/media/")
MEDIA_ROOT = os.getenv("MEDIA_ROOT", str(BASE_DIR / "media"))
STORAGE_PREFIX = os.getenv("STORAGE_PREFIX", "customer-docs")

USE_S3 = os.getenv("USE_S3", "False") == "True"
if USE_S3:
    # Credenciais S3. Para o Supabase Storage, use o endpoint S3 do projeto
    # (Storage > Settings > S3 connection) e as chaves de acesso S3.
    AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME", "")
    AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "")
    AWS_S3_ENDPOINT_URL = os.getenv("AWS_S3_ENDPOINT_URL") or None
    AWS_S3_CUSTOM_DOMAIN = os.getenv("AWS_S3_CUSTOM_DOMAIN") or None
    # Documentos são privados: sem ACL pública e com URLs assinadas por padrão.
    AWS_DEFAULT_ACL = None
    AWS_S3_FILE_OVERWRITE = False
    AWS_QUERYSTRING_AUTH = os.getenv("AWS_QUERYSTRING_AUTH", "True") == "True"
    AWS_QUERYSTRING_EXPIRE = int(os.getenv("AWS_QUERYSTRING_EXPIRE", "3600"))
    STORAGES = {
        "default": {"BACKEND": "storages.backends.s3.S3Storage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }

# ── E-mail (recuperação de senha) ─────────────────────────────────────────────
# Em dev sem SMTP, usa o backend de console (imprime o e-mail no stdout).
# Em produção defina EMAIL_HOST/USER/PASSWORD para enviar de verdade.
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend" if os.getenv("EMAIL_HOST")
    else "django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True") == "True"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "RevisaCar <nao-responder@revisacar.com>")

# URL do app do cliente (usada no link de redefinição de senha).
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5174")

# Tempo de vida do token de reset (15 min).
RESET_TOKEN_LIFETIME_SECONDS = int(os.getenv("RESET_TOKEN_LIFETIME_SECONDS", "900"))

# ── Consulta de placa (provedor externo, opcional) ────────────────────────────
# Não há API DETRAN oficial gratuita — a consulta real exige provedor pago.
# Fica desligada até PLATE_LOOKUP_URL ser definida (use {plate} como placeholder).
# PLATE_LOOKUP_MAP mapeia campos da resposta do provedor (JSON), ex.:
#   PLATE_LOOKUP_MAP='{"brand":"data.marca","model":"data.modelo","year":"data.ano"}'
PLATE_LOOKUP_URL = os.getenv("PLATE_LOOKUP_URL", "")
PLATE_LOOKUP_TOKEN = os.getenv("PLATE_LOOKUP_TOKEN", "")
PLATE_LOOKUP_AUTH_HEADER = os.getenv("PLATE_LOOKUP_AUTH_HEADER", "Authorization")
PLATE_LOOKUP_TIMEOUT = float(os.getenv("PLATE_LOOKUP_TIMEOUT", "6"))
PLATE_LOOKUP_ROOT = os.getenv("PLATE_LOOKUP_ROOT", "")  # raiz opcional (ex.: "data")
_pl_map = os.getenv("PLATE_LOOKUP_MAP", "")
try:
    PLATE_LOOKUP_MAP = json.loads(_pl_map) if _pl_map else None
except (ValueError, TypeError):
    PLATE_LOOKUP_MAP = None

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
