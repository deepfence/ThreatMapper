FROM python:3.9-slim-buster

WORKDIR /app

COPY . .

RUN apt-get update \
    && apt-get install bash \
    && pip install -r requirements.txt \
    && chmod +x /app/entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["/app/entrypoint.sh"]