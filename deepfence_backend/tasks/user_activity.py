from models.notification import UserActivityNotification
from config.app import celery_app, app as flask_app
from tasks.notification import user_activity_digest
from models.user_activity_log import UserActivityLog
from models.user import User, Role
from utils.custom_exception import InvalidUsage
import json
import arrow


# create_user_activity logs the user activity
@celery_app.task
def create_user_activity(current_user_id, action, event, resources=None, patch=None, success=False):
    with flask_app.app_context():
        user = User.query.filter_by(id=current_user_id).one_or_none()
        if not user:
            raise InvalidUsage("User Invalid.")
        role = Role.query.filter_by(id=user.role_id).one_or_none()
        if not role:
            raise InvalidUsage("Role Invalid.")

        # converting None to empty string
        if resources is None:
            resources = ''
        else:
            resources = json.dumps(resources)
        if patch is None:
            patch = ''
        else:
            patch = json.dumps(patch)
        ual = UserActivityLog(
            action=action,
            event=event,
            user=user,
            success=success,
            role=role,
            resources=str(resources),
            patch=str(patch)
        )
        try:
            ual.save()
            # send user activity for immediate notification integrations
            active_user_ids = [user.id for user in User.query.filter_by(isActive=True).all()]
            time = arrow.now().datetime
            for notification in UserActivityNotification.query.filter(
                    UserActivityNotification.user_id.in_(active_user_ids)).all():
                if notification.duration_in_mins == -1:
                    user_activity_digest(time, notification.id)
        except:
            pass

# create_user_activity logs the user activity while login
@celery_app.task
def create_user_activity_login(current_user_id, action, event, resources=None, patch=None, success=False):
    with flask_app.app_context():
        user = User.query.filter_by(id=current_user_id).one_or_none()
        if not user:
            raise InvalidUsage("User Invalid.")
        role = Role.query.filter_by(id=user.role_id).one_or_none()
        if not role:
            raise InvalidUsage("Role Invalid.")

        # converting None to empty string
        if resources is None:
            resources = ''
        else:
            resources = json.dumps(resources)
        if patch is None:
            patch = ''
        else:
            patch = json.dumps(patch)
        ual = UserActivityLog(
            action=action,
            event=event,
            user=user,
            success=success,
            role=role,
            resources=str(resources),
            patch=str(patch)
        )
        try:
            ual.save()
            # send user activity for immediate notification integrations
            active_user_ids = [user.id for user in User.query.filter_by(isActive=True).all()]
            time = arrow.now().datetime
            for notification in UserActivityNotification.query.filter(
                    UserActivityNotification.user_id.in_(active_user_ids)).all():
                if notification.duration_in_mins == -1:
                    user_activity_digest(time, notification.id)
        except:
            pass
