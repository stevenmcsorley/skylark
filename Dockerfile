FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends bash build-essential libpq-dev netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Python deps
# constraints.txt pins EVERY package (including transitive ones) to the versions that were running in production. Without it a rebuild pulls the
# newest kombu (5.7), which needs redis-py 6.1 and crashed the Celery worker. Refresh it deliberately, not by accident.
COPY requirements.txt constraints.txt /app/
RUN pip install -r requirements.txt -c constraints.txt

# App code
COPY . /app

RUN chmod +x /app/scripts/*.sh || true

EXPOSE 8000
