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
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {}  # Supabase via REST — no local DB

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

# ── Supabase ──────────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "customer-docs")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
