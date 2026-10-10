FROM ghcr.io/astral-sh/uv:latest AS uv
FROM python:3.14-slim
COPY --from=uv /uv /uvx /usr/local/bin/
WORKDIR /app
COPY services/api /app/services/api
COPY data /app/data
WORKDIR /app/services/api
RUN uv sync --frozen --no-dev --python /usr/local/bin/python
ENV PATH="/app/services/api/.venv/bin:$PATH"

# Run as a non-root user.
RUN useradd --system --create-home appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health').status==200 else 1)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
