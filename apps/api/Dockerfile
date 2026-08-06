FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app app
COPY pyproject.toml ./
COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic
COPY start.sh ./start.sh
RUN pip install --no-cache-dir .
RUN chmod +x ./start.sh

USER app
EXPOSE 8000
CMD ["./start.sh"]
