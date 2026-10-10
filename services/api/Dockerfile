FROM ghcr.io/astral-sh/uv:latest AS uv
FROM python:3.14-slim
COPY --from=uv /uv /uvx /usr/local/bin/
WORKDIR /app
COPY services/api /app/services/api
COPY data /app/data
WORKDIR /app/services/api
RUN uv sync --frozen --no-dev --python /usr/local/bin/python
ENV PATH="/app/services/api/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
