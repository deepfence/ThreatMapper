import os

from redis import Redis

redis = Redis(
    host=os.environ.get("REDIS_HOST"),
    port=os.environ.get("REDIS_PORT"),
    db=os.environ.get("REDIS_DB_NUMBER"),
    decode_responses=True
)
