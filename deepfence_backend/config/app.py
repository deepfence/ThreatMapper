import logging
from flask import Flask
from celery import Celery
import os
from config import commands
from config.redisconfig import redis
from config.config import ProdConfig
from utils.response import set_response
from utils.custom_exception import CustomException
from config.error_handlers import handle_invalid_usage
from config.extensions import cors, jwt, db, migrate
from utils.constants import API_URL_PREFIX
from api import user_api, threat_graph, common_api, vulnerability_api, resource_api, reports_api, \
    cloud_compliance_api, setting_api, internal_api, secret_scan_api, license_api, malware_scan_api


def create_app(config_object):
    app = Flask(__name__)
    app.config.from_object(config_object)
    # Set log level.
    if app.config['DEBUG']:
        log_level = logging.DEBUG
    else:
        log_level = logging.INFO
    stream_handler = logging.StreamHandler()

    stream_handler.setFormatter(logging.Formatter(
        fmt='[%(asctime)s] [%(process)d] [%(levelname)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S %z'
    ))
    stream_handler.setLevel(log_level)
    while app.logger.handlers:
        app.logger.handlers.pop()
    app.logger.addHandler(stream_handler)

    register_extensions(app)
    register_blueprints(app)
    register_error_handlers(app)
    register_commands(app)

    configure_jwt()

    # Internal app
    internal_app = Flask(__name__)
    internal_app.config.from_object(config_object)
    internal_app.logger.addHandler(stream_handler)

    register_extensions(internal_app)
    register_internal_app_blueprints(internal_app)
    register_error_handlers(internal_app)

    return app, internal_app


def register_blueprints(app):
    app.register_blueprint(user_api.user_api, url_prefix=API_URL_PREFIX)
    app.register_blueprint(common_api.common_api, url_prefix=API_URL_PREFIX)
    app.register_blueprint(threat_graph.threat_graph_api, url_prefix=API_URL_PREFIX)
    app.register_blueprint(cloud_compliance_api.cloud_compliance_api, url_prefix=API_URL_PREFIX)
    app.register_blueprint(vulnerability_api.vulnerability_api, url_prefix=API_URL_PREFIX)
    app.register_blueprint(resource_api.resource_api, url_prefix=API_URL_PREFIX)
    app.register_blueprint(reports_api.reports_api, url_prefix=API_URL_PREFIX)
    app.register_blueprint(setting_api.setting_api, url_prefix=API_URL_PREFIX)
    app.register_blueprint(secret_scan_api.secret_api, url_prefix=API_URL_PREFIX)
    app.register_blueprint(malware_scan_api.malware_api, url_prefix=API_URL_PREFIX)
    app.register_blueprint(license_api.license_api, url_prefix=API_URL_PREFIX)


def register_internal_app_blueprints(internal_app):
    internal_app.register_blueprint(internal_api.internal_api)


def register_extensions(app):
    # Don't remove these imports.
    # These are required for flask-migrate to make migrations.
    from models.integration import Integration
    from models.notification import VulnerabilityNotification, UserActivityNotification, MalwareNotification, SecretNotification
    from models.system_events import SystemEvents
    from models.node_tags import NodeTags
    from models.compliance_rules import ComplianceRules
    from models.compliance_rules_disabled import ComplianceRulesDisabled
    from models.scheduler import Scheduler
    from models.user_activity_log import UserActivityLog
    from models.email_configuration import EmailConfiguration
    from models.masked_cve import MaskedCVE
    from models.cloud_compliance_node import CloudComplianceNode
    from models.cloud_resource_node import CloudResourceNode

    cors.init_app(app, max_age=3600)
    jwt.init_app(app)

    db.init_app(app)
    migrate.init_app(app, db)


def register_error_handlers(app):
    app.errorhandler(CustomException)(handle_invalid_usage)


def register_commands(app):
    app.cli.add_command(commands.initialize)
    app.cli.add_command(commands.reset_password)
    app.cli.add_command(commands.migrate_sbom_es_index)


def configure_jwt():
    @jwt.expired_token_loader
    def my_expired_token_callback(jwt_headers=None, jwt_payload=None):
        return set_response(error={
            'code': 'token_expired',
            'message': 'The token has expired'
        }, status=401)

    @jwt.invalid_token_loader
    def my_invalid_token_callback(error_string):
        return set_response(error={
            'code': 'token_expired',
            'message': 'The token has expired'
        }, status=401)

    @jwt.token_in_blocklist_loader
    def check_if_token_is_revoked(jwt_headers=None, jwt_payload=None):
        if not jwt_payload:
            jwt_payload = {}
        jti = jwt_payload.get("jti", "")
        user_id = jwt_payload.get("sub").get("id") if jwt_payload.get("sub") else None
        if user_id:
            if redis.get("DELETED_USER_"+str(user_id)) == "true":
                return True
        entry = redis.get(jti)
        if entry is None:
            return True
        return entry == 'true'


app, internal_app = create_app(ProdConfig)
celery_app = Celery(__name__, broker=ProdConfig.CELERY_BROKER_URL)
app.app_context().push()
internal_app.app_context().push()


@app.teardown_appcontext
def shutdown_session(exception=None):
    from config.extensions import db
    db.session.remove()


@internal_app.teardown_appcontext
def shutdown_session(exception=None):
    from config.extensions import db
    db.session.remove()
