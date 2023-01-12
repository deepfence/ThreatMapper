import os
import datetime
from celery import Celery


class ProdConfig:
    debug = os.environ.get("DEBUG")
    DEBUG = False
    if debug == "true" or debug == "True":
        DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'postgresql://{}:{}@{}:{}/{}'.format(
        os.environ.get("POSTGRES_USER_DB_USER"),
        os.environ.get("POSTGRES_USER_DB_PASSWORD"),
        os.environ.get("POSTGRES_USER_DB_HOST"),
        os.environ.get("POSTGRES_USER_DB_PORT"),
        os.environ.get("POSTGRES_USER_DB_NAME")
    )
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 3600,
        'pool_timeout': 60,
        'pool_size': 200,
        'max_overflow': 5,
    }
    TEMPLATES_AUTO_RELOAD = False
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM")
    JWT_PUBLIC_KEY = open('/app/code/rs256.pub').read()
    JWT_PRIVATE_KEY = open('/app/code/rs256.pem').read()
    JWT_ACCESS_TOKEN_EXPIRES = datetime.timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = datetime.timedelta(days=30)
    JWT_ENCODE_NBF = False

    # celery
    CELERY_BROKER_URL = 'redis://{host}:{port}/{db_number}'.format(
        host=os.environ.get("REDIS_HOST"),
        port=os.environ.get("REDIS_PORT"),
        db_number=os.environ.get("REDIS_DB_NUMBER")
    )


celery_app = Celery(__name__, broker=ProdConfig.CELERY_BROKER_URL)
