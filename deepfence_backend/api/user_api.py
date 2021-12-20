import datetime
import urllib.parse
import arrow
import secrets
import requests
import sqlalchemy
from sqlalchemy import func
import re
import json
from flask import Blueprint, request, redirect, session
from flask import current_app as app
from flask.views import MethodView
from flask_jwt_extended import get_jti, get_raw_jwt, jwt_required, get_jwt_identity, create_access_token, \
    create_refresh_token, jwt_refresh_token_required
from elasticsearch import exceptions
from models.user import User, Role, Company, Invite, PasswordReset
from models.user_activity_log import UserActivityLog
from collections import defaultdict
from models.integration import Integration
from models.notification import VulnerabilityNotification, UserActivityNotification
from utils.common import password_policy_check, unique_execution_id, \
    mask_url, mask_api_key
from utils.custom_exception import InvalidUsage, NotFound, Forbidden, MultipleCompaniesFound, DFError
from utils.constants import INTEGRATION_TYPE_GOOGLE_CHRONICLE, USER_ROLES, SECRET_TOKEN_LENGTH, \
    INVITE_ACCEPT_LINK, INVITE_USER_EMAIL_SUBJECT, INVITE_USER_EMAIL_HTML, PASSWORD_RESET_LINK, \
    PASSWORD_CHANGE_EMAIL_SUBJECT, PASSWORD_CHANGE_EMAIL_HTML, PASSWORD_RESET_EMAIL_HTML, PASSWORD_RESET_EMAIL_SUBJECT, \
    PASSWORD_RESET_CODE_EXPIRY, PASSWORD_RESET_SUCCESS_EMAIL_SUBJECT, PASSWORD_RESET_SUCCESS_EMAIL_HTML, \
    INTEGRATION_TYPES, DURATION_IN_MINS, \
    CVE_INDEX, INTEGRATION_TYPE_EMAIL, INTEGRATION_TYPE_ES, INTEGRATION_TYPE_SUMO_LOGIC, \
    INTEGRATION_TYPE_HTTP, INTEGRATION_TYPE_JIRA, INTEGRATION_TYPE_PAGERDUTY, INTEGRATION_TYPE_S3, \
    INTEGRATION_TYPE_SLACK, INTEGRATION_TYPE_SPLUNK, INTEGRATION_TYPE_MICROSOFT_TEAMS, \
    NOTIFICATION_TYPE_USER_ACTIVITY, NOTIFICATION_TYPE_VULNERABILITY, NOTIFICATION_TYPES, \
    TOPOLOGY_USER_HOST_COUNT_MAP_REDIS_KEY, INTEGRATION_FILTER_TYPES, DEEPFENCE_KEY, DEEPFENCE_COMMUNITY_EMAIL, \
    INVITE_EXPIRY
from utils import constants
from config.redisconfig import redis
from utils.response import set_response
from utils.esconn import ESConn
from utils.decorators import user_permission, non_read_only_user
from flask_restful import Api
from utils.helper import validateJiraCredentials, validate_url, \
    validate_email, redact_sensitive_info, validate_domain, validate_ip
from jira import JIRAError
from pdpyras import APISession
from models.setting import Setting
from urllib.parse import urlparse

user_api = Blueprint("user_api", __name__)

user_api_restful = Api(user_api)


@user_api.route("/users/register", methods=["POST"])
def register():
    """
    Register api.
    This api is used for creating an admin user only.

    Admin can invite other users using invite api.

    ```
    Password should contain
    - at least 1 uppercase character (A-Z)
    - at least 1 lowercase character (a-z)
    - at least 1 digit (0-9)
    - at least 1 special character (punctuation)
    ```
    ---
    tags:
      - User Management API
    parameters:
      - name: body
        in: body
        description: JSON parameters.
        schema:
          properties:
            email:
              type: string
              description: email id
              example: sam@gm.com
            first_name:
              type: string
              description: First name
              example: John
            last_name:
              type: string
              description: Last name
              example: Doe
            phone_number:
              type: string
              description: phone_number
              example: +9112345678
            company:
              type: string
              description: company name
              example: deepfence
            console_url:
              type: string
              description: Deepfence Console URL to be used for sending emails
              example: https://console.deepfence.io
            password:
              type: string
              description: password
              example: Password123!
            confirm_password:
              type: string
              description: password
              example: Password123!
    responses:
      201:
        description: User created successfully.
      400:
        description: Bad request.
      404:
        description: User not found.
    """

    def _is_email_valid():
        users = User.query.filter_by(email=email).all()
        if users:
            return False
        return True

    if not request.is_json:
        raise InvalidUsage("Missing JSON in request")

    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    email = request.json.get('email', None)
    first_name = request.json.get('first_name', None)
    last_name = request.json.get('last_name', None)
    password = request.json.get('password', None)
    confirm_password = request.json.get('confirm_password', None)
    company = request.json.get('company', None)
    phone_number = request.json.get('phone_number', None)
    console_url = request.json.get('console_url', None)

    if not email:
        raise InvalidUsage("email is required")
    elif not first_name:
        raise InvalidUsage("first_name is required")
    elif not last_name:
        raise InvalidUsage("last_name is required")
    elif not password:
        raise InvalidUsage("password is required")
    elif not confirm_password:
        raise InvalidUsage("confirm password is required")
    elif not company:
        raise InvalidUsage("Company is required.")
    elif not console_url:
        raise InvalidUsage("Deepfence Console URL is required.")

    if not _is_email_valid():
        raise InvalidUsage("Email {} already exists".format(email))

    is_password_valid, msg = password_policy_check(password)
    if not is_password_valid:
        raise InvalidUsage(msg)
    if password != confirm_password:
        raise InvalidUsage("Passwords don't match")

    admin_role = Role.query.filter_by(name=USER_ROLES.ADMIN_USER).first()

    if "http://" in console_url or "https://" in console_url:
        console_url = urlparse(console_url).netloc
    if not (validate_ip(console_url) or validate_domain(console_url)):
        raise InvalidUsage("Console URL is not valid")
    console_url_setting_val = {
        "value": "https://" + console_url,
        "label": "Deepfence Console URL",
        "description": "Deepfence Console URL used for sending emails with links to the console",
        "is_visible_on_ui": True,
    }
    console_url_setting = Setting.query.filter_by(key="console_url").one_or_none()
    if console_url_setting:
        if not console_url_setting.value or not console_url_setting.value.get("value"):
            console_url_setting.value = console_url_setting_val
            console_url_setting.save()
    else:
        console_url_setting = Setting(
            key="console_url",
            value=console_url_setting_val
        )
        console_url_setting.save()
    user_company = Company.query.filter_by(name=company.lower()).first()
    if user_company:
        # Company already exists.
        admin_user = User.query.filter_by(company=user_company, role=admin_role).first()
        if not admin_user:
            raise InvalidUsage("Please request an invite from your admin")
        raise InvalidUsage("Please request an invite from admin {}".format(admin_user.email))
    else:
        user_company = Company(name=company)
    try:
        user_company.save()
    except MultipleCompaniesFound:
        raise InvalidUsage("Cannot register, Please contact your administrator for an invite")
    api_key = unique_execution_id()
    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone_number=phone_number,
        role=admin_role,
        company=user_company,
        api_key=api_key
    )

    user.set_password(password)
    user.save()
    redis.hset(DEEPFENCE_KEY, api_key, user.id)
    access_token = create_access_token(identity=user.get_identity())
    refresh_token = create_refresh_token(identity=user.get_identity())

    access_expires = app.config["JWT_ACCESS_TOKEN_EXPIRES"]
    refresh_expires = app.config["JWT_REFRESH_TOKEN_EXPIRES"]

    # Store the tokens in redis with a status of not currently revoked. We
    # can use the `get_jti()` method to get the unique identifier string for
    # each token. We can also set an expires time on these tokens in redis,
    # so they will get automatically removed after they expire. We will set
    # everything to be automatically removed shortly after the token expires
    access_jti = get_jti(encoded_token=access_token)
    refresh_jti = get_jti(encoded_token=refresh_token)
    redis.set(access_jti, 'false', access_expires * 1.2)
    redis.set(refresh_jti, 'false', refresh_expires * 1.2)

    # Identity can be any data that is json serializable
    ret = {
        "access_token": access_token,
        "refresh_token": refresh_token
    }

    return set_response(data=ret, status=201)


@user_api.route("/users/auth", methods=["POST"], endpoint='api_v1_5_user_auth')
def api_auth():
    """
    Authentication for API access
    ---
    tags:
      - Authentication
    operationId: authenticateApi
    produces:
      - application/json
    parameters:
      - name: body
        in: body
        description: JSON parameters.
        schema:
          properties:
            api_key:
              required: true
              type: string
              description: api_key
              example: qwjefwqkjfqkbvfq
    responses:
      200:
        description: Authentication successful.
        examples:
          application/json: |-
            {
              "data": {
                "access_token": "",
                "refresh_token": "",
              },
              "error": null,
              "success": true
            }
        properties:
          data:
            type: object
            description: User details
          error:
            type: string
            description: Error message, if any. Otherwise `null`
          success:
            type: boolean
            description: Success status
            enum: [true, false]
      400:
        description: Bad request.
        examples:
          application/json: |-
            {
              "data": null,
              "error": {
                "message": "api_key is required"
              },
              "success": false
            }
      404:
        description: API key not found.
        examples:
          application/json: |-
            {
              "data": null,
              "error": {
                "message": "user with api_key aaaaa not found"
              },
              "success": false
            }
    """
    if not request.is_json:
        raise InvalidUsage("Missing JSON in request")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    api_key = request.json.get('api_key', None)
    if not api_key:
        raise InvalidUsage("api_key is required")

    from config.app import db

    no_of_users = db.session.query(func.count(User.id)).scalar()
    if no_of_users == 0:
        raise NotFound("user with api_key {} not found.\n Note: This is a fresh installation.".format(api_key))

    user = User.query.filter_by(api_key=api_key, isActive=True).first()
    if not user:
        raise NotFound("user with api_key {} not found".format(api_key))

    access_token = create_access_token(identity=user.get_identity())
    refresh_token = create_refresh_token(identity=user.get_identity())

    access_expires = app.config["JWT_ACCESS_TOKEN_EXPIRES"]
    refresh_expires = app.config["JWT_REFRESH_TOKEN_EXPIRES"]

    # Store the tokens in redis with a status of not currently revoked. We
    # can use the `get_jti()` method to get the unique identifier string for
    # each token. We can also set an expires time on these tokens in redis,
    # so they will get automatically removed after they expire. We will set
    # everything to be automatically removed shortly after the token expires
    access_jti = get_jti(encoded_token=access_token)
    refresh_jti = get_jti(encoded_token=refresh_token)
    redis.set(access_jti, 'false', access_expires * 1.2)
    redis.set(refresh_jti, 'false', refresh_expires * 1.2)

    # Identity can be any data that is json serializable
    ret = {
        "access_token": access_token,
        "refresh_token": refresh_token
    }
    return set_response(data=ret)


@user_api.route("/users/me", methods=["GET"], endpoint='api_v1_5_user_details')
@jwt_required
def user_details():
    """
    User details.

    Permission: ALL
    ---
    tags:
      - Authentication
    operationId: getUserDetails
    produces:
      - application/json
    security:
      - Bearer: []
    responses:
      200:
        description: Request success.
        schema:
          type: object
          properties:
            data:
              type: object
              description: User details
            error:
              type: string
              description: Error message, if any. Otherwise `null`
            success:
              type: boolean
              description: Success status
              enum: [true, false]
      400:
        description: Bad request.
      404:
        description: User not found.
    """
    current_user = get_jwt_identity()

    return set_response(data=current_user)


@user_api.route("/users/refresh/token", methods=["POST"], endpoint='api_v1_5_refresh_jwt_token')
@jwt_refresh_token_required
def refresh_jwt_token():
    """
    Generate a new access token using refresh token
    ---
    tags:
      - Authentication
    operationId: refreshJwtToken
    security:
      - Bearer: []
    produces:
      - application/json
    description: "Generate a new access token using refresh token. Usage (In header): Authorization: Bearer <refresh_token>"
    responses:
      200:
        description: Login successful.
        examples:
          application/json: |-
            {
              "data": {
                "access_token": ""
              },
              "error": null,
              "success": true
            }
        properties:
          data:
            type: object
            description: User details
            properties:
              access_token:
                type: string
          error:
            type: string
            description: Error message, if any. Otherwise `null`
          success:
            type: boolean
            description: Success status
            enum: [true, false]
      400:
        description: Bad request
      404:
        description: User not found
    """
    current_user = get_jwt_identity()

    user = User.query.filter_by(id=current_user['id'], isActive=True).first()
    if not user:
        raise NotFound("Active user not found")

    access_token = create_access_token(identity=user.get_identity())

    access_expires = app.config["JWT_ACCESS_TOKEN_EXPIRES"]
    access_jti = get_jti(encoded_token=access_token)
    redis.set(access_jti, 'false', access_expires * 1.2)

    ret = {
        'access_token': access_token
    }

    return set_response(data=ret)


@user_api.route("/users", methods=["GET"], endpoint='api_v1_5_users')
@jwt_required
def user_list():
    current_user = get_jwt_identity()
    current_user_obj = User.query.filter_by(id=current_user["id"]).one_or_none()
    current_user_id = current_user_obj.get_identity().get("id")
    all_users = User.query.all()
    result = []
    user_identities = [x.get_identity() for x in all_users]
    agent_count_by_user_str = redis.get(TOPOLOGY_USER_HOST_COUNT_MAP_REDIS_KEY)
    if not agent_count_by_user_str:
        agent_count_by_user_str = "{}"
    agent_count_by_user = json.loads(agent_count_by_user_str)
    for identity in user_identities:
        copy_identity = identity.copy()
        api_key = copy_identity.get('api_key', '')
        copy_identity["count_of_hosts"] = agent_count_by_user.get(api_key, 0)
        if copy_identity.get("id") != current_user_id:
            copy_identity["api_key"] = ""
        result.append(copy_identity)
    return set_response(data=result)


@user_api.route("/user/<int:user_id>", methods=["POST"], endpoint='api_v1_5_user_update')
@jwt_required
@non_read_only_user
def user_update(user_id):
    current_user = get_jwt_identity()
    current_user_obj = User.query.filter_by(id=current_user["id"]).one_or_none()
    admin_role = Role.query.filter_by(name=USER_ROLES.ADMIN_USER).first()
    same_user = False
    if user_id == current_user["id"]:
        user = current_user_obj
        same_user = True
    else:
        if current_user_obj.role != admin_role:
            raise InvalidUsage("User does not have permission to edit this user")
        user = User.query.filter_by(id=user_id).one_or_none()
    if user is None:
        raise InvalidUsage("User not found")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    first_name = request.json.get("first_name")
    last_name = request.json.get("last_name")
    phone_number = request.json.get("phone_number")
    role_name = request.json.get("role")
    is_active = request.json.get("isActive", True)

    if not first_name:
        raise InvalidUsage("first_name is required")
    elif not last_name:
        raise InvalidUsage("last_name is required")
    elif not role_name:
        raise InvalidUsage("Role is required")
    if role_name not in [USER_ROLES.ADMIN_USER, USER_ROLES.NORMAL_USER, USER_ROLES.READ_ONLY_USER]:
        raise InvalidUsage("Invalid role.")
    if type(is_active) != bool:
        raise InvalidUsage("isActive should be true or false")

    role = Role.query.filter_by(name=role_name).one_or_none()
    wants_to_change_role = user.role.name != role_name
    wants_to_change_status = user.isActive != is_active

    if wants_to_change_role and user.isActive is False:
        raise InvalidUsage("Cannot change role of an inactive user")

    if wants_to_change_role or wants_to_change_status:
        user_is_not_admin = current_user_obj.role != admin_role
        if user_is_not_admin:
            raise InvalidUsage("Not Authorized")

        # Check if the role has to be changed for the only admin user
        if user.role.name == USER_ROLES.ADMIN_USER:
            admin_user_count = User.query.filter_by(role=admin_role, isActive=True).count()
            if wants_to_change_role and role != admin_role and admin_user_count == 1:
                raise InvalidUsage("There needs to be at least one admin user")
            if user.role == admin_role and is_active is False and admin_user_count == 1:
                raise InvalidUsage("Cannot deactivate the last admin user")

    to_logout = False
    user.first_name = first_name
    user.last_name = last_name
    user.phone_number = phone_number
    if same_user and user.role.name != role.name:
        to_logout = True
    user.role = role
    if same_user and user.isActive != is_active:
        to_logout = True
    user.isActive = is_active
    user.save()
    if to_logout:
        jti = get_raw_jwt().get("jti", "")
        access_expires = app.config["JWT_ACCESS_TOKEN_EXPIRES"]
        redis.set(jti, 'true', access_expires * 1.2)
    return set_response(data="ok")


@user_api.route("/user/<int:user_id>", methods=["DELETE"], endpoint='api_v1_5_users_delete')
@jwt_required
@non_read_only_user
def user_delete(user_id):
    current_user = get_jwt_identity()
    current_user_obj = User.query.filter_by(id=current_user["id"]).one_or_none()
    admin_role = Role.query.filter_by(name=USER_ROLES.ADMIN_USER).first()
    to_logout = False
    if user_id == current_user["id"]:
        user = current_user_obj
        to_logout = True
    else:
        if current_user_obj.role != admin_role:
            raise InvalidUsage("User does not have permission to delete this user")
        user = User.query.filter_by(id=user_id).one_or_none()
    if user is None:
        raise InvalidUsage("User not found")
    admin_user_count = User.query.filter_by(role=admin_role, isActive=True).count()
    if user.role == admin_role and admin_user_count == 1:
        raise InvalidUsage("Cannot delete the last admin user")
    # Delete all foreign key references
    for db_obj in [UserActivityLog]:
        db_rows = db_obj.query.filter_by(user_id=user_id).all()
        if db_rows:
            for db_row in db_rows:
                db_row.delete()
    integration_ids = []
    for db_obj in [VulnerabilityNotification]:
        db_rows = db_obj.query.filter_by(user_id=user_id).all()
        if db_rows:
            for db_row in db_rows:
                if db_row.integration.id not in integration_ids:
                    integration_ids.append(db_row.integration.id)
                db_row.delete()
    for integration_id in integration_ids:
        integration = Integration.query.get(integration_id)
        if integration:
            integration.delete()
    api_key = user.api_key
    # Delete user
    user.delete()
    redis.hdel(DEEPFENCE_KEY, api_key)
    if to_logout:
        jti = get_raw_jwt().get("jti", "")
        access_expires = app.config["JWT_ACCESS_TOKEN_EXPIRES"]
        redis.set(jti, 'true', access_expires * 1.2)
    else:
        redis.set("DELETED_USER_" + str(user_id), 'true')
    return set_response(data="ok")


@user_api.route("/users/reset-api-key", methods=["POST"], endpoint='api_v1_5_api_key_reset')
@jwt_required
def api_key_reset():
    """
    Reset API Key

    Permission: ALL
    ---
    tags:
      - Authentication
    operationId: resetApiKey
    produces:
      - application/json
    security:
      - Bearer: []
    responses:
      200:
        description: Reset successful
        properties:
          data:
            type: object
            description: User details
          error:
            type: string
            description: Error message, if any. Otherwise `null`
          success:
            type: boolean
            description: Success status
            enum: [true, false]
      400:
        description: Bad request.
      404:
        description: User not found.
    """
    current_user = get_jwt_identity()
    user = User.query.filter_by(id=current_user["id"]).one_or_none()
    old_api_key = user.api_key
    redis.hdel(DEEPFENCE_KEY, old_api_key)
    api_key = unique_execution_id()
    user.api_key = api_key
    user.save()
    redis.hset(DEEPFENCE_KEY, api_key, user.id)

    data = user.get_identity()

    access_token = create_access_token(identity=data)
    refresh_token = create_refresh_token(identity=data)

    access_expires = app.config["JWT_ACCESS_TOKEN_EXPIRES"]
    refresh_expires = app.config["JWT_REFRESH_TOKEN_EXPIRES"]

    # Store the tokens in redis with a status of not currently revoked. We
    # can use the `get_jti()` method to get the unique identifier string for
    # each token. We can also set an expires time on these tokens in redis,
    # so they will get automatically removed after they expire. We will set
    # everything to be automatically removed shortly after the token expires
    access_jti = get_jti(encoded_token=access_token)
    refresh_jti = get_jti(encoded_token=refresh_token)
    redis.set(access_jti, 'false', access_expires * 1.2)
    redis.set(refresh_jti, 'false', refresh_expires * 1.2)

    # Identity can be any data that is json serializable

    data["access_token"] = access_token
    data["refresh_token"] = refresh_token
    return set_response(data=data)


@user_api.route("/users/login", methods=["POST"])
def login():
    """
    Login api.

    ---
    tags:
      - User Management API
    parameters:
      - name: body
        in: body
        description: JSON parameters.
        schema:
          properties:
            email:
              type: string
              description: email id
              example: sam@gm.com
              required: true
            password:
              type: string
              description: password
              example: Password123!
              required: true
    responses:
      200:
        description: Login successful.
      400:
        description: Bad request.
      404:
        description: User not found.
    """
    if not request.is_json:
        raise InvalidUsage("Missing JSON in request")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    email = request.json.get('email', None)
    if not email:
        raise InvalidUsage("Email is required")
    password = request.json.get('password', None)
    if not password:
        raise InvalidUsage("Password is required")

    from config.app import db

    no_of_users = db.session.query(func.count(User.id)).scalar()
    if no_of_users == 0:
        raise Forbidden("Invalid username or password")

    user = User.query.filter_by(email=email, isActive=True).first()
    if not user:
        raise Forbidden("Invalid username or password")
    elif not user.password_hash:
        raise Forbidden("Cannot login")
    elif not user.check_password(password):
        raise Forbidden("Invalid username or password")

    access_token = create_access_token(identity=user.get_identity())
    refresh_token = create_refresh_token(identity=user.get_identity())

    access_expires = app.config["JWT_ACCESS_TOKEN_EXPIRES"]
    refresh_expires = app.config["JWT_REFRESH_TOKEN_EXPIRES"]

    # Store the tokens in redis with a status of not currently revoked. We
    # can use the `get_jti()` method to get the unique identifier string for
    # each token. We can also set an expires time on these tokens in redis,
    # so they will get automatically removed after they expire. We will set
    # everything to be automatically removed shortly after the token expires
    access_jti = get_jti(encoded_token=access_token)
    refresh_jti = get_jti(encoded_token=refresh_token)
    redis.set(access_jti, 'false', access_expires * 1.2)
    redis.set(refresh_jti, 'false', refresh_expires * 1.2)

    # Identity can be any data that is json serializable
    ret = {
        "access_token": access_token,
        "refresh_token": refresh_token
    }
    # instrument with user audit
    from tasks.user_activity import create_user_activity_login
    user_identity = user.get_identity()
    del user_identity["api_key"]
    create_user_activity_login.delay(user.id, constants.ACTION_LOGIN, constants.EVENT_AUTH_LOGIN,
                                     resources=[user_identity], success=True)
    return set_response(data=ret)


@user_api.route("/users/logout", methods=["POST"])
@jwt_required
def logout():
    """
    Logout.

    Permission: ALL
    ---
    tags:
      - User Management API
    security:
      - Bearer: []
    responses:
      200:
        description: Login successful.
      400:
        description: Bad request.
      404:
        description: User not found.
    """
    current_user = get_jwt_identity()
    user = User.query.filter_by(id=current_user["id"]).one_or_none()
    if not user:
        raise InvalidUsage("User Invalid.")
    role = Role.query.filter_by(id=user.role_id).one_or_none()
    if not role:
        raise InvalidUsage("Role Invalid.")
    # audit log
    ual = UserActivityLog(
        action="logout",
        event="auth",
        user=user,
        success=True,
        role=role,
    )
    ual.save()

    jti = get_raw_jwt()['jti']
    access_expires = app.config["JWT_ACCESS_TOKEN_EXPIRES"]
    redis.set(jti, 'true', access_expires * 1.2)
    try:
        session.clear()
    except:
        pass
    return set_response(status=200)


@user_api.route("/users/invite/send", methods=["POST"])
@jwt_required
@user_permission(USER_ROLES.ADMIN_USER)
def send_invite():
    """
    Send user invitation. Only admin can send an invitation.

    Permission: ADMIN
    ---
    tags:
      - User Management API
    security:
      - Bearer: []
    parameters:
      - name: body
        in: body
        description: JSON parameters.
        schema:
          properties:
            email:
              type: string
              description: email id
              example: sam1@gm.com
              required: true
            role:
              type: string
              description: role
              example: admin/user
              required: true
            base_url:
              type: string
              description: base url of deepfence ui
              example: https://123.123.123.123
              required: true
    responses:
      200:
        description: Login successful.
      400:
        description: Bad request.
      404:
        description: User not found.
    """
    current_user = get_jwt_identity()

    if not request.is_json:
        raise InvalidUsage("Missing JSON in request")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    email = request.json.get("email")
    role_name = request.json.get("role")
    action = request.json.get("action", "send_invite_email")

    if not email:
        raise InvalidUsage("Email is required.")
    if not role_name:
        raise InvalidUsage("Role is required")
    if role_name not in [USER_ROLES.ADMIN_USER, USER_ROLES.NORMAL_USER, USER_ROLES.READ_ONLY_USER]:
        raise InvalidUsage("Invalid role.")

    admin_user = User.query.filter_by(id=current_user["id"]).one_or_none()
    admin_role = Role.query.filter_by(name=USER_ROLES.ADMIN_USER).first()
    if admin_user.role != admin_role:
        raise InvalidUsage("User does not have permission to send Invite")

    admin_company = Company.query.filter_by(name=current_user["company"]).one_or_none()
    role = Role.query.filter_by(name=role_name).one_or_none()
    console_url = Setting.query.filter_by(key="console_url").one_or_none()

    user = User.query.filter_by(email=email).one_or_none()
    if user:
        raise InvalidUsage("Email is already registered")
    if not console_url or not console_url.value or not console_url.value.get("value", None):
        raise InvalidUsage("Deepfence Console URL is not set in settings.")

    if action == "send_invite_email":
        # Send email with the random code.
        from models.email_configuration import EmailConfiguration
        email_configuration = EmailConfiguration.query.filter().first()
        if not email_configuration:
            raise InvalidUsage("Not configured to send emails. Please configure it in Settings->Email Configuration")

    invite = Invite.query.filter_by(
        email=email,
        company=admin_company,
    ).first()

    random_code = None
    if invite:
        if invite.is_expired():
            random_code = secrets.token_hex(SECRET_TOKEN_LENGTH)
            invite.code = random_code
        else:
            random_code = invite.code
        # Scenario: user is deleted and user is invited again
        invite.accepted = False
        invite.created_at = datetime.datetime.now()
        invite.save()
    else:
        random_code = secrets.token_hex(SECRET_TOKEN_LENGTH)
        invite = Invite(
            email=email,
            code=random_code,
            created_by=admin_user,
            company=admin_company,
            role=role
        )
        invite.save()

    invite_accept_link = urllib.parse.urljoin(console_url.value["value"], INVITE_ACCEPT_LINK.format(code=random_code))
    subject = INVITE_USER_EMAIL_SUBJECT.format(company=admin_company.name)
    html = INVITE_USER_EMAIL_HTML.format(registration_url=invite_accept_link)

    response = {"invite_url": invite_accept_link, "invite_expiry_hours": int(INVITE_EXPIRY / 60 / 60)}
    if action == "send_invite_email":
        from tasks.email_sender import send_email
        send_email.delay([email], subject=subject, html=html)
        return set_response(data={"message": "Invite sent", **response})
    elif action == "get_invite_link":
        return set_response(data={"message": "Invite URL generated", **response})


@user_api.route("/users/invite/accept", methods=["POST"])
def accept_invite():
    """
    Accept invite api.

    Permission: ALL
    ---
    tags:
      - User Management API
    parameters:
      - name: body
        in: body
        description: JSON parameters.
        schema:
          properties:
            code:
              type: string
              description: email id
              example: 7f67e848e6d2ceaeacc134c4f459f44f
              required: true
            first_name:
              type: string
              description: First name
              example: John
              required: true
            last_name:
              type: string
              description: Last name
              example: Doe
              required: true
            phone_number:
              type: string
              description: phone_number
              example: +9112345678
            password:
              type: string
              description: password
              example: Password123!
              required: true
            confirm_password:
              type: string
              description: password
              example: Password123!
              required: true
    responses:
      200:
        description: Login successful.
      400:
        description: Bad request.
      404:
        description: User not found.
    """

    def _is_email_valid():
        users = User.query.filter_by(email=email).all()
        if users:
            return False
        return True

    if not request.is_json:
        raise InvalidUsage("Missing JSON in request")

    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    code = request.json.get("code")
    first_name = request.json.get("first_name")
    last_name = request.json.get("last_name")
    phone_number = request.json.get("phone_number")
    password = request.json.get("password")
    confirm_password = request.json.get("confirm_password")

    if not code:
        raise InvalidUsage("code is required")
    elif not first_name:
        raise InvalidUsage("first_name is required")
    elif not last_name:
        raise InvalidUsage("last_name is required")
    elif not password:
        raise InvalidUsage("password is required")
    elif not confirm_password:
        raise InvalidUsage("confirm_password is required")

    if password != confirm_password:
        raise InvalidUsage("Passwords don't match")

    if not code:
        raise InvalidUsage("code is required.")

    user_invite = Invite.query.filter_by(code=code, accepted=False).one_or_none()
    if not user_invite:
        raise InvalidUsage("Invalid code.")
    if user_invite.is_expired():
        raise Forbidden("Invite expired.")

    email = user_invite.email
    role = user_invite.role
    company = user_invite.company

    if not company or not Company.query.filter_by(name=company.name).one_or_none():
        raise InvalidUsage("company {} does not exist".format(company.name))

    if not _is_email_valid():
        raise InvalidUsage("Email {} already exists".format(email))

    is_password_valid, msg = password_policy_check(password)
    if not is_password_valid:
        raise InvalidUsage(msg)
    api_key = unique_execution_id()
    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone_number=phone_number,
        role=role,
        company=company,
        api_key=api_key
    )

    user.set_password(password)
    user.save()

    # Update invite
    user_invite.accepted = True
    user_invite.save()
    redis.hset(DEEPFENCE_KEY, api_key, user.id)
    access_token = create_access_token(identity=user.get_identity())
    refresh_token = create_refresh_token(identity=user.get_identity())

    access_expires = app.config["JWT_ACCESS_TOKEN_EXPIRES"]
    refresh_expires = app.config["JWT_REFRESH_TOKEN_EXPIRES"]

    # Store the tokens in redis with a status of not currently revoked. We
    # can use the `get_jti()` method to get the unique identifier string for
    # each token. We can also set an expires time on these tokens in redis,
    # so they will get automatically removed after they expire. We will set
    # everything to be automatically removed shortly after the token expires
    access_jti = get_jti(encoded_token=access_token)
    refresh_jti = get_jti(encoded_token=refresh_token)
    redis.set(access_jti, 'false', access_expires * 1.2)
    redis.set(refresh_jti, 'false', refresh_expires * 1.2)

    # Identity can be any data that is json serializable
    ret = {
        "access_token": access_token,
        "refresh_token": refresh_token
    }

    return set_response(data=ret, status=201)


@user_api.route("/users/password/change", methods=["POST"])
@jwt_required
def password_change():
    """
    Password change api.

    ---
    tags:
      - User Management API
    security:
      - Bearer: []
    parameters:
      - name: body
        in: body
        description: JSON parameters.
        schema:
          properties:
            password:
              type: string
              description: email id
              example: Password@321
              required: true
            confirm_password:
              type: string
              description: password
              example: Password@321
              required: true
    responses:
      200:
        description: Login successful.
      400:
        description: Bad request.
      404:
        description: User not found.
    """
    current_user = get_jwt_identity()

    if not request.is_json:
        raise InvalidUsage("Missing JSON in request")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")

    old_password = request.json.get('old_password', None)
    password = request.json.get("password")
    confirm_password = request.json.get("confirm_password")

    if not old_password:
        raise InvalidUsage("Old Password is required")

    if not password:
        raise InvalidUsage("Password is required")
    elif not confirm_password:
        raise InvalidUsage("Confirm password is required")

    if password != confirm_password:
        raise InvalidUsage("Passwords don't match")

    is_password_valid, msg = password_policy_check(password)
    if not is_password_valid:
        raise InvalidUsage(msg)

    user = User.query.get(current_user.get('id'))
    if not user:
        raise Forbidden("Invalid user")

    if not user.check_password(old_password):
        raise Forbidden("Invalid Password")

    user_email = current_user.get('email')
    # Checking if user is demo account, don't allow password change
    if user_email == DEEPFENCE_COMMUNITY_EMAIL:
        raise Forbidden("Change password not allowed for this user")
    user.set_password(password)
    user.save()

    subject = PASSWORD_CHANGE_EMAIL_SUBJECT

    from models.email_configuration import EmailConfiguration
    email_configuration = EmailConfiguration.query.filter().first()
    if not email_configuration:
        return set_response(data="Not configured to send emails. Please configure it in Settings->Email Configuration")
    from tasks.email_sender import send_email
    send_email.delay([user.email], subject=subject, html=PASSWORD_CHANGE_EMAIL_HTML)
    return set_response(data="Password updated successfully.")


class ResetPasswordEmail(MethodView):
    def get(self):
        """
        Password reset email.

        ---
        tags:
          - User Management API
        parameters:
          - name: email
            in: query
            description: email id.
            type: string
            required: true
          - name: base_url
            in: query
            type: string
            description: base url of deepfence ui
            example: https://123.123.123.123
            required: true
        responses:
          200:
            description: Login successful.
          400:
            description: Bad request.
          404:
            description: User not found.
        """
        email = request.args.get("email")
        if not email:
            raise InvalidUsage("Email is required.")

        user = User.query.filter_by(email=email).one_or_none()
        if not user:
            return set_response(
                data="A password reset email will be sent if a user exists with the provided email id, and platform is configured to send emails")

        console_url = Setting.query.filter_by(key="console_url").one_or_none()
        if not console_url or not console_url.value or not console_url.value.get("value", None):
            raise InvalidUsage("Deepfence Console URL is not set in settings.")

        subject = PASSWORD_RESET_EMAIL_SUBJECT

        random_code = secrets.token_hex(SECRET_TOKEN_LENGTH)
        self._generate_password_reset(email, random_code)

        password_reset_link = urllib.parse.urljoin(console_url.value["value"],
                                                   PASSWORD_RESET_LINK.format(code=random_code))
        html = PASSWORD_RESET_EMAIL_HTML.format(password_reset_link=password_reset_link)
        from tasks.email_sender import send_email
        send_email.delay([user.email], subject=subject, html=html)
        return set_response(
            data="A password reset email will be sent if a user exists with the provided email id, and platform is configured to send emails")

    def _generate_password_reset(self, email, random_code):
        # Remove any existing password reset objects for the same email.
        PasswordReset.query.filter_by(email=email).delete()
        from config.app import db
        db.session.commit()

        password_reset = PasswordReset(
            email=email,
            code=random_code,
            expiry_timedelta=PASSWORD_RESET_CODE_EXPIRY
        )
        password_reset.save()


user_api.add_url_rule('/users/password-reset/email', view_func=ResetPasswordEmail.as_view('password-reset-email'))


class ResetPasswordVerify(MethodView):
    def post(self):
        """
        Verify password reset and change password.

        ---
        tags:
          - User Management API
        parameters:
          - name: body
            in: body
            description: JSON parameters.
            schema:
              properties:
                code:
                  type: string
                  description: reset code
                  example: 8f0aa0d353ecab849f291993614adb98
                  required: true
                password:
                  type: string
                  description: password
                  example: 12samkin31
                  required: true
                confirm_password:
                  type: string
                  description: confirm password
                  example: 12samkin31
                  required: true
        responses:
          200:
            description: Password reset successful.
          400:
            description: Bad request.
        """
        if not request.is_json:
            raise InvalidUsage("Missing JSON in request")
        if type(request.json) != dict:
            raise InvalidUsage("Request data invalid")
        code = request.json.get("code")
        password = request.json.get("password")
        confirm_password = request.json.get("confirm_password")

        if not code:
            raise InvalidUsage("Code is required")
        elif not password:
            raise InvalidUsage("Password is required")
        elif not confirm_password:
            raise InvalidUsage("Confirm password is required")

        if password != confirm_password:
            raise InvalidUsage("Passwords do not match")

        is_password_valid, msg = password_policy_check(password)
        if not is_password_valid:
            raise InvalidUsage(msg)

        password_reset, msg = self._verify_password_reset_code(code)
        if not password_reset:
            raise InvalidUsage(msg)

        email = password_reset.email
        user = User.query.filter_by(email=email).one()
        user.set_password(password)
        user.save()

        password_reset.delete()

        subject = PASSWORD_RESET_SUCCESS_EMAIL_SUBJECT

        html = PASSWORD_RESET_SUCCESS_EMAIL_HTML.format(name=user.full_name)
        from models.email_configuration import EmailConfiguration
        email_configuration = EmailConfiguration.query.filter().first()
        if not email_configuration:
            return set_response(
                data="Not configured to send emails. Please configure it in Settings->Email Configuration")
        from tasks.email_sender import send_email
        send_email.delay([email], subject=subject, html=html)
        return set_response(data="Password reset successful.")

    def _verify_password_reset_code(self, code):
        from config.app import db

        password_reset = PasswordReset.query.filter_by(code=code).one_or_none()
        if not password_reset:
            return None, "Invalid code."

        # Check code expiry.
        current_time = arrow.now()
        expiry_time = arrow.get(password_reset.created_at).datetime \
                      + datetime.timedelta(seconds=password_reset.expiry_timedelta)

        if current_time > expiry_time:
            password_reset.delete()
            db.session.commit()
            return None, "Reset code expired."
        return password_reset, "Code valid."


user_api.add_url_rule('/users/password-reset/verify', view_func=ResetPasswordVerify.as_view('password-reset-verify'))


class IntegrationView(MethodView):

    @jwt_required
    def get(self):
        """
        Get all integrations created by the logged in user.

        ---
        tags:
          - Integration API
        security:
          - Bearer: []
        responses:
          200:
            description: Request success
          400:
            description: Bad request
          401:
            description: Unauthorized
        """
        current_user = get_jwt_identity()
        user = User.query.filter_by(id=current_user["id"]).one_or_none()
        if not user:
            raise InvalidUsage("User Invalid.")
        admin_role = Role.query.filter_by(name=USER_ROLES.ADMIN_USER).first()
        response = {i: [] for i in INTEGRATION_TYPES}

        if user.role == admin_role:
            active_user_ids = [user.id for user in User.query.filter_by(isActive=True).all()]
            for notif in VulnerabilityNotification.query.filter(
                    VulnerabilityNotification.user_id.in_(active_user_ids)).all():
                response[notif.integration.integration_type].append(notif.pretty_print())
            for notif in UserActivityNotification.query.filter(
                    UserActivityNotification.user_id.in_(active_user_ids)).all():
                response[notif.integration.integration_type].append(notif.pretty_print())
        else:
            for notif in user.vulnerability_notifications:
                response[notif.integration.integration_type].append(notif.pretty_print())
            for notif in user.user_activity_notification:
                response[notif.integration.integration_type].append(notif.pretty_print())

        for integration_type, notifications in response.items():
            if integration_type == 'slack':
                for i in range(len(notifications)):
                    notifications[i]['webhook_url'] = mask_url(notifications[i]['webhook_url'], 'slack')
            if integration_type == 'microsoft_teams':
                for i in range(len(notifications)):
                    notifications[i]['webhook_url'] = mask_url(notifications[i]['webhook_url'], 'microsoft_teams')
            if integration_type == 'pagerduty':
                for i in range(len(notifications)):
                    notifications[i]['service_key'] = mask_api_key(notifications[i]['service_key'])
                    notifications[i]['api_key'] = mask_api_key(notifications[i]['api_key'])
            if integration_type == 'http_endpoint':
                for i in range(len(notifications)):
                    if notifications[i]['authorization_key'] != "":
                        notifications[i]['authorization_key'] = mask_api_key(notifications[i]['authorization_key'])
            if integration_type == 'google_chronicle':
                for i in range(len(notifications)):
                    if notifications[i]['authorization_key'] != "":
                        notifications[i]['authorization_key'] = mask_api_key(notifications[i]['authorization_key'])
            if integration_type == 's3':
                for i in range(len(notifications)):
                    notifications[i]['aws_access_key'] = mask_api_key(notifications[i]['aws_access_key'])
                    notifications[i]['aws_secret_key'] = mask_api_key(notifications[i]['aws_secret_key'])
            if integration_type == 'sumo_logic':
                for i in range(len(notifications)):
                    notifications[i]['api_url'] = mask_url(notifications[i]['api_url'], 'sumo_logic')
            if integration_type == 'jira':
                for i in range(len(notifications)):
                    notifications[i]['api_token'] = mask_api_key(notifications[i]['api_token'])

            response[integration_type] = sorted(notifications, key=lambda n: n["id"])

        return set_response(data=response)

    @jwt_required
    @non_read_only_user
    def delete(self):
        """
        Delete an integration

        integration_type:
        - email
        - slack
        - pagerduty
        - elasticsearch
        - s3
        - splunk
        - http_endpoint
        - sumo_logic
        - jira
        - microsoft_teams

        ---
        tags:
          - Integration API
        security:
            - Bearer: []
        parameters:
          - name: body
            in: body
            description: JSON parameters.
            schema:
              properties:
                notification_type:
                  type: string
                  description: Notification type
                  example: vulnerability
                  enum: [vulnerability, user_activity]
                  required: true
                id:
                  type: string
                  required: true
                  description: Integration id
                  example: 1
        responses:
          204:
            description: Integration removed successfully.
          400:
            description: Bad request
          401:
            description: Unauthorized
        """
        if not request.is_json:
            raise InvalidUsage("Missing json in request")
        if type(request.json) != dict:
            raise InvalidUsage("Request data invalid")
        notification_type = request.json.get("notification_type")
        id = request.json.get("id")

        if not notification_type:
            raise InvalidUsage("notification_type is required")
        elif not id:
            raise InvalidUsage("id is required")
        if notification_type not in NOTIFICATION_TYPES:
            raise InvalidUsage("Invalid notification_type")

        current_user = get_jwt_identity()
        user = User.query.filter_by(id=current_user["id"]).one_or_none()
        if not user:
            raise InvalidUsage("User Invalid.")
        admin_role = Role.query.filter_by(name=USER_ROLES.ADMIN_USER).first()

        def delete_notification(notification):
            if not notification:
                raise NotFound("{} notification with id {} not found".format(notification_type, id))
            can_delete = False
            if user.role == admin_role:
                can_delete = True
            elif user.id == notification.user_id:
                can_delete = True
            if can_delete:
                notification.delete()
            else:
                raise NotFound("user cannot delete notification with id {0}".format(id))

        notification = None
        if notification_type == NOTIFICATION_TYPE_VULNERABILITY:
            notification = VulnerabilityNotification.query.filter_by(id=id).one_or_none()
        elif notification_type == NOTIFICATION_TYPE_USER_ACTIVITY:
            notification = UserActivityNotification.query.filter_by(id=id).one_or_none()

        notification_json = None
        if notification is not None:
            notification_json = notification.pretty_print()
            notification_json = redact_sensitive_info(notification_json)
        resources = [{
            "integration": notification_json,
        }]

        delete_notification(notification)
        # create user audit
        from tasks.user_activity import create_user_activity
        create_user_activity.delay(current_user["id"], constants.ACTION_DELETE, constants.EVENT_INTEGRATION,
                                   resources=resources, success=True)
        return set_response(status=204)

    def handle_email_post(self, request_json, user):
        from models.email_configuration import EmailConfiguration
        email_configuration = EmailConfiguration.query.filter().first()
        if not email_configuration:
            raise InvalidUsage("Not configured to send emails. Please configure it in Settings->Email Configuration")
        email = request_json.get("email")
        if not email:
            raise InvalidUsage("Email is required.")
        elif not validate_email(email):
            raise InvalidUsage("Please validate your email entered")
        config = json.dumps({"email": email})
        integration = Integration.query.filter_by(integration_type=INTEGRATION_TYPE_EMAIL, config=config).one_or_none()
        if not integration:
            integration = Integration(
                user=user,
                integration_type=INTEGRATION_TYPE_EMAIL,
                config=config
            )
            try:
                integration.save()
            except sqlalchemy.exc.IntegrityError:
                raise InvalidUsage("A similar email integration already exists")
        return integration

    def handle_slack_post(self, request_json, user):
        channel = request_json.get("channel")
        webhook_url = request_json.get("webhook_url")

        if not channel:
            raise InvalidUsage("Channel is required")
        elif not webhook_url:
            raise InvalidUsage("Webhook url is required")

        try:
            validate_url(webhook_url)
        except DFError as e:
            raise InvalidUsage(e.message)

        # Send a test message to slack integration to validate.
        try:
            response = requests.post(webhook_url, json={"text": "This is a test message from deepfence."})
        except Exception:
            raise InvalidUsage("Invalid webhook url")
        if response.status_code != 200 or response.text != 'ok':
            raise InvalidUsage("Webhook URL is not valid, Please check your URL and try again")
        config = json.dumps({"channel": channel, "webhook_url": webhook_url})
        integration = Integration.query.filter_by(integration_type=INTEGRATION_TYPE_SLACK, config=config).one_or_none()
        if not integration:
            integration = Integration(
                user=user,
                integration_type=INTEGRATION_TYPE_SLACK,
                config=config
            )
            try:
                integration.save()
            except sqlalchemy.exc.IntegrityError:
                raise InvalidUsage("A similar slack integration already exists")
        return integration

    def handle_microsoft_teams_post(self, request_json, user):
        webhook_url = request_json.get("webhook_url")

        if not webhook_url:
            raise InvalidUsage("Webhook url is required")

        try:
            validate_url(webhook_url)
        except DFError as e:
            raise InvalidUsage(e.message)

        # Send a test message to teams integration to validate.
        try:
            response = requests.post(webhook_url, json={"text": "This is a test message from deepfence."})
        except Exception:
            raise InvalidUsage("Invalid webhook url")
        if response.status_code != 200:
            raise InvalidUsage(response.text)
        config = json.dumps({"webhook_url": webhook_url})
        integration = Integration.query.filter_by(integration_type=INTEGRATION_TYPE_MICROSOFT_TEAMS,
                                                  config=config).one_or_none()
        if not integration:
            integration = Integration(
                user=user,
                integration_type=INTEGRATION_TYPE_MICROSOFT_TEAMS,
                config=config
            )
            try:
                integration.save()
            except sqlalchemy.exc.IntegrityError:
                raise InvalidUsage("A similar teams integration already exists")
        return integration

    def handle_pagerduty_post(self, request_json, user):
        service_key = request_json.get("service_key")
        api_key = request_json.get("api_key")
        if not service_key:
            raise InvalidUsage("Service key is required")
        config = json.dumps({"service_key": service_key, "api_key": api_key})
        integration = Integration.query.filter_by(integration_type=INTEGRATION_TYPE_PAGERDUTY,
                                                  config=config).one_or_none()
        # validation API_Token 
        try:
            session = APISession(api_key)
            if len(list(session.iter_all('users'))) == 0:
                raise InvalidUsage("Looks like no user own this Authentication token provided")

            url = "https://api.pagerduty.com/services?include[]=integrations"
            payload = {}
            headers = {
                'Authorization': 'Token token={0}'.format(api_key),
                'Accept': 'application/vnd.pagerduty+json;version=2',
                'Content-Type': 'application/json'
            }

            response = requests.request("GET", url, headers=headers, data=payload)
            integration_key = ""
            if response.status_code != 200:
                raise InvalidUsage("Looks like no user own this Authentication token provided")
            else:
                service_key_found = False
                for data in response.json()["services"]:
                    if data["integrations"]:
                        for integrations in data["integrations"]:
                            if integrations.get("integration_key", ""):
                                integration_key = integrations.get("integration_key", "")
                                if integration_key == service_key:
                                    service_key_found = True
                                    break
                    if service_key_found:
                        break
                if not integration_key or not service_key_found:
                    raise InvalidUsage("Looks like integration key provided is not valid")
        except Exception as e:
            raise InvalidUsage(e)

        if not integration:
            integration = Integration(
                user=user,
                integration_type=INTEGRATION_TYPE_PAGERDUTY,
                config=config
            )
            try:
                integration.save()
            except sqlalchemy.exc.IntegrityError:
                raise InvalidUsage("A similar pagerduty integration already exists")
        return integration

    def handle_sumo_logic_post(self, request_json, user):
        api_url = request_json.get("api_url")

        if not api_url:
            raise InvalidUsage("api_url is required")

        try:
            validate_url(api_url)
        except DFError as e:
            raise InvalidUsage(e.message)

        config = json.dumps({"api_url": api_url})
        integration = Integration.query.filter_by(integration_type=INTEGRATION_TYPE_SUMO_LOGIC,
                                                  config=config).one_or_none()

        # here we are sending head request to get the status code for the api_url
        try:
            response = requests.head(api_url)
            response_status_code = response.status_code
            if response_status_code == 401:
                raise InvalidUsage("Unauthorized, received 401")
            elif response_status_code != 200:
                raise InvalidUsage("There is a problem with API URL")
        except Exception as e:
            raise InvalidUsage(e)

        if not integration:
            integration = Integration(
                user=user,
                integration_type=INTEGRATION_TYPE_SUMO_LOGIC,
                config=config
            )
            try:
                integration.save()
            except sqlalchemy.exc.IntegrityError:
                raise InvalidUsage("A similar sumologic integration already exists")
        return integration

    def handle_jira_post(self, request_json, user):
        jira_site_url = request_json.get("jira_site_url")
        username = request_json.get("username")
        password = request_json.get("password")
        api_token = request_json.get("api_token")
        jira_project_key = request_json.get("jira_project_key")
        issue_type = request_json.get("issue_type", "Bug")

        if not jira_site_url:
            raise InvalidUsage("jira_site_url is required")
        elif not username:
            raise InvalidUsage("username is required")
        elif not password and not api_token:
            raise InvalidUsage("password or api token is required")
        elif not jira_project_key:
            raise InvalidUsage("jira_project_key is required")
        elif not issue_type:
            raise InvalidUsage("request_type is required")

        try:
            validate_url(jira_site_url)
        except DFError as e:
            raise InvalidUsage(e.message)

        try:
            validateJiraCredentials(jira_site_url, username, password, api_token, jira_project_key, issue_type)
        except JIRAError as e:
            raise InvalidUsage(e.text)

        config = json.dumps({
            "jira_site_url": jira_site_url,
            "username": username,
            "password": password,
            "api_token": api_token,
            "jira_project_key": jira_project_key,
            "issue_type": issue_type,
        })
        integration = Integration.query.filter_by(integration_type=INTEGRATION_TYPE_JIRA, config=config).one_or_none()
        if not integration:
            integration = Integration(
                user=user,
                integration_type=INTEGRATION_TYPE_JIRA,
                config=config
            )
            try:
                integration.save()
            except sqlalchemy.exc.IntegrityError:
                raise InvalidUsage("A similar JIRA integration already exists")
        return integration

    def handle_http_endpoint_post(self, request_json, user):
        api_url = request_json.get("api_url")
        authorization_key = request_json.get("authorization_key")

        if not api_url:
            raise InvalidUsage("url is required")

        try:
            validate_url(api_url)
        except DFError as e:
            raise InvalidUsage(e.message)

        config = json.dumps({"api_url": api_url, "authorization_key": authorization_key})
        integration = Integration.query.filter_by(integration_type=INTEGRATION_TYPE_HTTP, config=config).one_or_none()
        if not integration:
            integration = Integration(
                user=user,
                integration_type=INTEGRATION_TYPE_HTTP,
                config=config
            )
            try:
                integration.save()
            except sqlalchemy.exc.IntegrityError:
                raise InvalidUsage("A similar http endpoint integration already exists")
        return integration

    def handle_google_chronicle_post(self, request_json, user):
        api_url = request_json.get("api_url")
        authorization_key = request_json.get("authorization_key")

        if not api_url:
            raise InvalidUsage("url is required")

        try:
            validate_url(api_url)
        except DFError as e:
            raise InvalidUsage(e.message)

        config = json.dumps({"api_url": api_url, "authorization_key": authorization_key})
        integration = Integration.query.filter_by(integration_type=INTEGRATION_TYPE_GOOGLE_CHRONICLE,
                                                  config=config).one_or_none()
        if not integration:
            integration = Integration(
                user=user,
                integration_type=INTEGRATION_TYPE_GOOGLE_CHRONICLE,
                config=config
            )
            try:
                integration.save()
            except sqlalchemy.exc.IntegrityError:
                raise InvalidUsage("A similar http endpoint integration already exists")
        return integration

    def handle_elasticsearch_post(self, request_json, user):
        es_url = request_json.get("es_url")
        index = request_json.get("index")
        doc_type = request_json.get("doc_type")
        auth_header = request_json.get("auth_header", "")
        if not es_url:
            raise InvalidUsage("es_url is required")
        if not index:
            raise InvalidUsage("index is required")
        if not doc_type:
            raise InvalidUsage("doc_type is required")

        try:
            validate_url(es_url)
        except DFError as e:
            raise InvalidUsage(e.message)

        config = json.dumps({"es_url": es_url, "auth_header": auth_header, "index": index, "doc_type": doc_type})
        integration = Integration.query.filter_by(integration_type=INTEGRATION_TYPE_ES, config=config).one_or_none()
        if not integration:
            integration = Integration(
                user=user,
                integration_type=INTEGRATION_TYPE_ES,
                config=config
            )
            try:
                integration.save()
            except sqlalchemy.exc.IntegrityError:
                raise InvalidUsage("A similar elasticsearch integration already exists")
        return integration

    def handle_s3_post(self, request_json, user):
        s3_bucket = request_json.get("s3_bucket")
        folder_path = request_json.get("folder_path")
        aws_access_key = request_json.get("aws_access_key")
        aws_secret_key = request_json.get("aws_secret_key")
        region_name = request_json.get("region_name")
        if not folder_path:
            raise InvalidUsage("folder_path is required")
        elif not s3_bucket:
            raise InvalidUsage("s3_bucket is required")
        elif not aws_access_key:
            raise InvalidUsage("aws_access_key is required")
        elif not aws_secret_key:
            raise InvalidUsage("aws_secret_key is required")
        elif not region_name:
            raise InvalidUsage("region_name is required")
        config = json.dumps(
            {"folder_path": folder_path, "aws_access_key": aws_access_key, "aws_secret_key": aws_secret_key,
             "region_name": region_name, "s3_bucket": s3_bucket})
        integration = Integration.query.filter_by(integration_type=INTEGRATION_TYPE_S3, config=config).one_or_none()
        if not integration:
            integration = Integration(
                user=user,
                integration_type=INTEGRATION_TYPE_S3,
                config=config
            )
            try:
                integration.save()
            except sqlalchemy.exc.IntegrityError:
                raise InvalidUsage("A similar s3 integration already exists")
        return integration

    def handle_splunk_post(self, request_json, user):
        api_url = request_json.get("api_url", "")
        api_type = request_json.get("api_type", "")
        token = request_json.get("token", "")
        username = ""  # we are not using username
        password = ""  # we are not using password

        if not api_type:
            raise InvalidUsage("api_type is required")
        if not api_url:
            raise InvalidUsage("api_url is required")

        try:
            validate_url(api_url)
        except DFError as e:
            raise InvalidUsage(e.message)

        try:
            if api_type == "event_collector":
                if not token:
                    raise InvalidUsage("HEC API Token is required")

                # headers for the request
                headers = {
                    "Authorization": "Splunk {0}".format(token)
                }

                # we are sending empty payload for getting "event can not be black Error"
                response = requests.post(api_url, data=json.dumps({'event': ""}), headers=headers, verify=False)
                response_status_code = response.status_code
                response_data = response.json()
                if response_status_code == 400 and response_data['code'] == 13:
                    pass
                elif response_status_code == 403:
                    raise InvalidUsage("Please check your HEC Token")
                elif str(response_status_code).startswith('4'):
                    raise InvalidUsage("There is a problem with Endpoint & Token combination you entered")
            else:
                raise InvalidUsage("Invalid api_type. It should be event_collector")
        except requests.exceptions.ConnectionError as error:
            # if there is a problem in endpoint then Connection error will be thrown
            raise InvalidUsage("Please check your endpoint URL")
        except Exception as e:
            raise InvalidUsage(e)

        config = json.dumps(
            {"api_url": api_url, "api_type": api_type, "token": token, "username": username, "password": password})
        integration = Integration.query.filter_by(integration_type=INTEGRATION_TYPE_SPLUNK, config=config).one_or_none()
        if not integration:
            integration = Integration(
                user=user,
                integration_type=INTEGRATION_TYPE_SPLUNK,
                config=config
            )
            try:
                integration.save()
            except sqlalchemy.exc.IntegrityError:
                raise InvalidUsage("A similar splunk integration already exists")
        return integration

    def post_helper(self, request_json):
        # Should be present in all type of integration.
        integration_type = request_json.get("integration_type")
        notification_type = request_json.get("notification_type")
        alert_level = request_json.get("alert_level")
        duration_in_mins = request_json.get("duration")
        filters = request_json.get("filters")
        if not duration_in_mins:
            duration_in_mins = -1
        if not alert_level:
            alert_level = ""
        try:
            duration_in_mins = int(duration_in_mins)
        except ValueError:
            raise InvalidUsage("duration must be an integer value")
        if not integration_type:
            raise InvalidUsage("integration_type is required")
        elif integration_type not in INTEGRATION_TYPES:
            raise InvalidUsage("Invalid integration_type")
        elif notification_type not in NOTIFICATION_TYPES:
            raise InvalidUsage("Invalid notification_type")
        if not filters:
            filters = {}
        if type(filters) != dict:
            raise InvalidUsage("filters must be a json")
        for k, v in filters.items():
            if not k or type(k) != str or type(v) != list:
                raise InvalidUsage("filters must be a json")
            if k not in INTEGRATION_FILTER_TYPES:
                raise InvalidUsage("invalid filter key {0}".format(k))

        valid_duration = [d[0] for d in DURATION_IN_MINS]
        if duration_in_mins not in valid_duration:
            raise InvalidUsage("Invalid duration provided")

        current_user = get_jwt_identity()
        user = User.query.filter_by(id=current_user["id"]).one_or_none()
        if not user:
            raise InvalidUsage("User Invalid.")

        # User activity logs only supported in SIEM and s3
        if notification_type == NOTIFICATION_TYPE_USER_ACTIVITY and integration_type not in [
            INTEGRATION_TYPE_SUMO_LOGIC, INTEGRATION_TYPE_ES, INTEGRATION_TYPE_SPLUNK, INTEGRATION_TYPE_S3]:
            raise InvalidUsage("User activities logs only supported in SIEM / S3 integration")

        try:
            integration = getattr(self, "handle_{0}_post".format(integration_type))(request_json, user)
        except InvalidUsage as ex:
            raise InvalidUsage(str(ex))
        except Exception as e:
            raise InvalidUsage("Something went wrong. Please try again.")

        def create_notification(Notif):
            notification = Notif(
                user=user,
                alert_level=alert_level,
                duration_in_mins=duration_in_mins,
                integration=integration,
                filters=filters,
            )
            try:
                notification.save()
            except sqlalchemy.exc.IntegrityError:
                raise InvalidUsage("A similar notification already exists")
            # action/event/resources/success
            notification_json = None
            if notification is not None:
                notification_json = notification.pretty_print()
                notification_json = redact_sensitive_info(notification_json)
            resources = [{
                "integration": notification_json,
            }]
            from tasks.user_activity import create_user_activity
            create_user_activity.delay(current_user["id"], constants.ACTION_CREATE, constants.EVENT_INTEGRATION,
                                       resources=resources, success=True)

        if notification_type == NOTIFICATION_TYPE_VULNERABILITY:
            create_notification(VulnerabilityNotification)
        elif notification_type == NOTIFICATION_TYPE_USER_ACTIVITY:
            create_notification(UserActivityNotification)

    @jwt_required
    @non_read_only_user
    def post(self):
        """
        Add an integration

        slack:
          - channel
          - webhook_url

        pagerduty:
          - service_key

        microsoft_teams:
          - webhook_url

        ---
        tags:
          - Integration API
        security:
            - Bearer: []
        parameters:
          - name: body
            in: body
            description: JSON parameters.
            schema:
              properties:
                notification_type:
                  type: string
                  description: Notification type
                  example: vulnerability
                  enum: [vulnerability]
                  required: true
                integration_type:
                  type: string
                  description: Integration type
                  example: email
                  enum: [email, slack, pagerduty, splunk, elasticsearch, s3, http_endpoint, sumo_logic, jira, microsoft_teams]
                  required: true
                duration:
                  type: integer
                  description: duration in minutes
                  enum: [-1, 5, 15, 30, 60]
                  example: 60
        responses:
          201:
            description: integration added successfully.
          400:
            description: Bad request
          401:
            description: Unauthorized
        """
        if not request.is_json:
            raise InvalidUsage("Missing JSON in request")
        request_json = request.json
        if request_json.get("integration_list") and type(request_json["integration_list"]) == list:
            multi_resp = {"data": [], "metadata": {
                "error": 0, "success": 0, "total": len(request_json["integration_list"])}}
            for i in request_json["integration_list"]:
                resp = {"resource": i, "message": "Integration added successfully", "status": 200}
                try:
                    self.post_helper(i)
                    multi_resp["metadata"]["success"] += 1
                except Exception as ex:
                    resp["message"] = str(ex)
                    resp["status"] = 400
                    multi_resp["metadata"]["error"] += 1
                multi_resp["data"].append(resp)
            return set_response(data=multi_resp, status=207)
        else:
            self.post_helper(request_json)
            return set_response(data={"message": "Integration added successfully."}, status=201)


user_api.add_url_rule('/users/integrations', view_func=IntegrationView.as_view('integration'))


@user_api.route("/integrations/notify", methods=["POST"])
@jwt_required
@non_read_only_user
def notify_to_integrations():
    """
    Send a manual notification to all the configured integrations
    by the logged in user.

    This api can be used for cve

    Example:
    [{"_id":"e67944ab335c5848e80c36bac094e63d","_type":"cve","_index":"logstash-2018.10.08"}]

    ---
    tags:
      - Integration API
    security:
        - Bearer: []
    parameters:
      - name: body
        in: body
        description: JSON parameters.
        schema:
          properties:
            type: array
              required: true
              items:
                type: object
                properties:
                  _id:
                    type: string
                    description: doc_id
                    example: "AV9snfn4fobgNCxxOlvR"
                  _index:
                    type: string
                    description: document _index
                    example: "logstash-2017.10.30"
                  _type:
                    type: string
                    description: Doc type
                    example: cve
    responses:
      200:
        description: Integration sent successfully.
      400:
        description: Bad request.
      404:
        description: Not found.
    """
    if not request.is_json:
        raise InvalidUsage("Missing JSON in request")

    docs = request.json
    if not docs:
        raise InvalidUsage("Post data is empty")

    current_user = get_jwt_identity()
    user = User.query.filter_by(id=current_user["id"]).one_or_none()
    if not user:
        raise InvalidUsage("User Invalid.")

    missing_alerts = []
    notified_alerts = []
    allowed_indices = [CVE_INDEX]

    index_wise_content_list = defaultdict(list)
    for doc in docs:
        index = doc['_index']
        doc_id = doc['_id']
        try:
            if index not in allowed_indices:
                missing_alerts.append(doc_id)
            else:
                doc = ESConn.get_doc_by_id(index, doc_id)
                source = doc['_source']
                index_wise_content_list[index].append(source)
                notified_alerts.append(doc_id)
        except exceptions.NotFoundError:
            missing_alerts.append(doc_id)

    for index_name, docs_list in index_wise_content_list.items():
        user_notifications = None
        if index_name == CVE_INDEX:
            user_notifications = user.vulnerability_notifications
        if user_notifications:
            user_notifications = {str(notification.integration_id): notification for notification in
                                  user_notifications}.values()
            for notification in user_notifications:
                try:
                    notification.send(docs_list)
                except Exception as ex:
                    app.logger.error("Error sending notification: {0}".format(ex))

    response = {
        "notified_docs": notified_alerts,
        "missing_docs": missing_alerts
    }
    return set_response(data=response, status=200)
