from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

cors = CORS(max_age=3600)

jwt = JWTManager()

db = SQLAlchemy()

migrate = Migrate()
