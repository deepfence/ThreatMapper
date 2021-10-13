from sqlalchemy.sql import func
from config.extensions import db
import datetime


class UserActivityLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event = db.Column(db.String(100), nullable=True)
    action = db.Column(db.String(100), nullable=True)
    resources = db.Column(db.Text, nullable=True, default=None)
    patch = db.Column(db.String(100), nullable=True)
    success = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('user_activity_log', lazy=True))

    user_role_id = db.Column(db.Integer, db.ForeignKey('role.id'), nullable=False, default="user")
    role = db.relationship('Role', backref=db.backref('user_activity_log', lazy=True))

    def save(self, commit=True):
        db.session.add(self)
        if commit:
            try:
                db.session.commit()
            except:
                db.session.rollback()

                # Exception block is just for rolling back the transaction
                # So re raise it
                raise

    def delete(self, commit=True):
        db.session.delete(self)
        if commit:
            try:
                db.session.commit()
            except:
                db.session.rollback()

                # Exception block is just for rolling back the transaction
                # So re raise it
                raise

    @classmethod
    def delete_expired(cls, retention_period=30):
        limit = datetime.datetime.now() - datetime.timedelta(days=retention_period)
        UserActivityLog.query.filter(UserActivityLog.created_at <= limit).delete(synchronize_session=False)
        db.session.commit()

    def pretty_print(self):
        return {
            "id": self.id,
            "event": self.event,
            "action": self.action,
            "resource": self.resources,
            "patch": self.patch,
            "success": self.success,
            "user_email": self.user.email,
            "user_role": self.role.name,
            "created_at": str(self.created_at),
        }

    def __repr__(self):
        return "<UserActivityLog {}>".format(self.id)
