FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn uvicorn

COPY . .

EXPOSE 8000
# start.sh migra no boot (free tier do Render não tem preDeployCommand) e sobe o gunicorn.
CMD ["sh", "start.sh"]
