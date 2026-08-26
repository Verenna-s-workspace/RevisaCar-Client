# Atalhos de desenvolvimento do RevisaCar-Client.
.PHONY: dev backend frontend install

# Sobe backend (:8001) e frontend (:5174) juntos — Ctrl-C encerra os dois.
dev:
	@./dev.sh

# Só o backend (Django).
backend:
	cd backend && DEBUG=True python manage.py runserver 127.0.0.1:8001

# Só o frontend (Vite).
frontend:
	cd frontend && npm run dev

# Instala as dependências dos dois.
install:
	cd backend && pip install -r requirements-dev.txt
	cd frontend && npm ci
