from functools import wraps
from flask import current_app as app, request
from flask_jwt_extended import get_jwt_identity
from models.user import User, Role
from utils.constants import USER_ROLES
from utils.custom_exception import Forbidden


def user_permission(user_role):
    def user_decorator(func):
        @wraps(func)
        def func_wrapper(*args, **kwargs):
            current_user = get_jwt_identity()
            if current_user.get("role") == user_role:
                return func(*args, **kwargs)
            else:
                app.logger.debug("User [{}] tried to access a restricted resource.".format(current_user["id"]))
                raise Forbidden("Permission denied")

        return func_wrapper

    return user_decorator


def non_read_only_user(func):
    @wraps(func)
    def func_wrapper(*args, **kwargs):
        current_user = get_jwt_identity()
        current_user_obj = User.query.filter_by(id=current_user["id"]).one_or_none()
        if current_user_obj.role.name == USER_ROLES.ADMIN_USER or current_user_obj.role.name == USER_ROLES.NORMAL_USER:
            return func(*args, **kwargs)
        else:
            app.logger.debug("User [{}] tried to access a restricted resource.".format(current_user["id"]))
            raise Forbidden("Permission denied")

    return func_wrapper


def admin_user_only(func):
    @wraps(func)
    def func_wrapper(*args, **kwargs):
        current_user = get_jwt_identity()
        current_user_obj = User.query.filter_by(id=current_user["id"]).one_or_none()
        admin_user = Role.query.filter_by(name=USER_ROLES.ADMIN_USER).first()
        if current_user_obj.role == admin_user:
            return func(*args, **kwargs)
        else:
            app.logger.debug("User [{}] tried to access a restricted resource.".format(current_user["id"]))
            raise Forbidden("Permission denied")

    return func_wrapper
