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
# Dev: disco local (MEDIA_ROOT). Produção: configure django-storages (S3 /
# Supabase Storage S3) via DEFAULT_FILE_STORAGE — services.upload_document_file
# usa default_storage, então nada no código muda.
MEDIA_URL = os.getenv("MEDIA_URL", "/media/")
MEDIA_ROOT = os.getenv("MEDIA_ROOT", str(BASE_DIR / "media"))
STORAGE_PREFIX = os.getenv("STORAGE_PREFIX", "customer-docs")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
