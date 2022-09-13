from sqlalchemy.sql import func
from sqlalchemy.schema import UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from config.app import db
from utils.constants import NOTIFICATION_TYPE_VULNERABILITY, NOTIFICATION_TYPE_USER_ACTIVITY, CVE_ES_TYPE, \
    NOTIFICATION_TYPE_CLOUDTRAIL_ALERT


class Notification(db.Model):
    """
    This is the parent model for all notifications. Any new notification should inherit this
    class and override the methods available here.
    """
    __abstract__ = True

    filters = db.Column(JSONB, nullable=True)
    alert_level = db.Column(db.String(100), nullable=False)
    duration_in_mins = db.Column(db.Integer, nullable=False)
    # `last_sent_time` is used only by the scheduler. Make sure this is not set by
    # any other process.
    last_sent_time = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=func.now())

    @property
    def name(self):
        """
        This is used to identify the type of notification.
        The name of the class is used to identify the type of notification.
        """
        return self.__class__.__name__.lower()

    def send(self, content, **kwargs):
        """
        Override this method in the children. It should always take one argument `content`.
        """
        raise NotImplementedError("Implement this method in the subclasses.")

    @classmethod
    def format_content(self, contents):
        """
        Override this method in the children. It should always take one argument `content`.
        """
        raise NotImplementedError("Implement this method in the subclasses.")

    def save(self, commit=True):
        s = db.session()
        s.expire_on_commit = False
        s.add(self)
        if commit:
            try:
                s.commit()
            except:
                s.rollback()
                # Exception block is just for rolling back the transaction
                # So re raise it.
                raise

    def delete(self, commit=True):
        db.session.delete(self)
        if commit:
            try:
                db.session.commit()
            except:
                db.session.rollback()
                # Exception block is just for rolling back the transaction
                # So re raise it.
                raise


class VulnerabilityNotification(Notification):
    id = db.Column(db.Integer, primary_key=True)

    integration_id = db.Column(db.Integer, db.ForeignKey('integration.id'), nullable=False)
    integration = db.relationship('Integration', backref=db.backref('vulnerability_notifications', lazy=True))

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('vulnerability_notifications', lazy=True))
    error_msg = db.Column(db.Text, nullable=True)

    __table_args__ = (UniqueConstraint('alert_level', 'integration_id', name='vulnerability_notification_constraint'),)

    vulnerability_doc_fields_map = {
        "cve_severity": "Severity", "cve_id": "CVE Id", "cve_description": "Description", "scan_id": "Scan ID",
        "cve_container_image": "Container image", "@timestamp": "@timestamp", "cve_attack_vector": "Attack Vector",
        "cve_container_name": "Container Name", "host_name": "Host Name", "cve_overall_score": "CVE Overall Score",
        "cve_type": "CVE Type", "cve_link": "CVE Link", "cve_fixed_in": "CVE Fixed In", "cve_cvss_score": "CVSS Score",
        "cve_caused_by_package": "CVE Caused By Package"}

    def pretty_print(self):
        conf = self.integration.pretty_print()
        filters = self.filters
        if not filters:
            filters = {}
        conf.update({
            "id": self.id,
            "alert_level": self.alert_level,
            "duration_in_mins": self.duration_in_mins,
            "user_id": self.user_id,
            "error_msg": self.error_msg,
            "created_at": str(self.created_at),
            "updated_at": str(self.updated_at),
            "notification_type": NOTIFICATION_TYPE_VULNERABILITY,
            "filters": filters,
        })
        return conf

    @classmethod
    def format_content(cls, contents):
        if len(contents) > 1:
            return {"contents": contents, "dump_indent": 4, "prefix": "Vulnerabilities", "iteration_prefix": "CVE #{}",
                    "doc_fields_map": cls.vulnerability_doc_fields_map}
        else:
            return {"contents": contents, "dump_indent": 4, "prefix": "Vulnerabilities", "iteration_prefix": "",
                    "doc_fields_map": cls.vulnerability_doc_fields_map}

    def send(self, contents, **kwargs):
        self.integration.send(self.format_content(contents), summary="Deepfence - Vulnerabilities Subscription",
                              notification_id=kwargs["notification_id"], resource_type=CVE_ES_TYPE)

    def __repr__(self):
        return "<VulnerabilityNotification {}>".format(self.id)


class UserActivityNotification(Notification):
    id = db.Column(db.Integer, primary_key=True)

    integration_id = db.Column(db.Integer, db.ForeignKey('integration.id'), nullable=False)
    integration = db.relationship('Integration', backref=db.backref('user_activity_notification', lazy=True))

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('user_activity_notification', lazy=True))

    # cursor_id for last send log id
    cursor_id = db.Column(db.Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint('alert_level', 'integration_id', name='user_activity_notification_constraint'),)

    def pretty_print(self):
        conf = self.integration.pretty_print()
        filters = self.filters
        if not filters:
            filters = {}
        conf.update({
            "id": self.id,
            "alert_level": self.alert_level,
            "duration_in_mins": self.duration_in_mins,
            "user_id": self.user_id,
            "created_at": str(self.created_at),
            "updated_at": str(self.updated_at),
            "notification_type": NOTIFICATION_TYPE_USER_ACTIVITY,
            "filters": filters,
        })
        return conf

    @classmethod
    def format_content(cls, contents):
        if len(contents) > 1:
            return {"contents": contents, "prefix": "",
                    "dump_indent": 4, "iteration_prefix": "Policy Event #{}"}
        else:
            return {"contents": contents, "prefix": "",
                    "dump_indent": 4, "iteration_prefix": ""}

    def send(self, contents, **kwargs):
        self.integration.send(self.format_content(contents),
                              summary="Deepfence - User Activity Subscription",
                              notification_id=kwargs["notification_id"], resource_type="")

    def __repr__(self):
        return "<UserActivityNotification {}>".format(self.id)


class CloudtrailAlertNotification(Notification):
    id = db.Column(db.Integer, primary_key=True)

    integration_id = db.Column(db.Integer, db.ForeignKey('integration.id'), nullable=False)
    integration = db.relationship('Integration', backref=db.backref('cloudtrail_alert_notification', lazy=True))

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('cloudtrail_alert_notification', lazy=True))

    #cursor_id for last send log id
    cursor_id = db.Column(db.Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint('filters', 'integration_id', name='cloudtrail_alert_notification_constraint'),)

    cloudtrail_alert_doc_fields_map = {
        "eventName": "Event Name", "eventSource": "Event Source", "eventTime": "Event Time", "eventID": "Event ID",
        "awsRegion": "AWS Region", "@timestamp": "@timestamp", "sourceIPAddress": "Source IP Address",
        "eventType": "Event Type", "recipientAccountId": "Recipient Account ID"}

    def pretty_print(self):
        conf = self.integration.pretty_print()
        filters = self.filters
        if not filters:
            filters = {}
        conf.update({
            "id": self.id,
            "alert_level": self.alert_level,
            "duration_in_mins": self.duration_in_mins,
            "user_id": self.user_id,
            "created_at": str(self.created_at),
            "updated_at": str(self.updated_at),
            "notification_type": NOTIFICATION_TYPE_CLOUDTRAIL_ALERT,
            "filters": filters,
        })
        return conf

    @classmethod
    def format_content(cls, contents):
        if len(contents) > 1:
            return {"contents": contents, "prefix": "", "dump_indent": 4,
                    "iteration_prefix": "CloudTrail Event #{}", "doc_fields_map": cls.cloudtrail_alert_doc_fields_map}
        else:
            return {"contents": contents, "prefix": "",
                    "dump_indent": 4, "iteration_prefix": "", "doc_fields_map": cls.cloudtrail_alert_doc_fields_map}

    def send(self, contents, **kwargs):
        self.integration.send(self.format_content(contents),
                              summary="Deepfence - Cloudtrail Alert Subscription",
                              notification_id=kwargs["notification_id"], resource_type="")

    def __repr__(self):
        return "<CloudtrailAlertNotification {}>".format(self.id)


class RunningNotification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    source_application_id = db.Column(db.String(64), nullable=False)
    follow_url = db.Column(db.String(1024), nullable=True)
    expiry_in_secs = db.Column(db.Integer, nullable=True)
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=func.now())

    def pretty_print(self):
        return {
            "content": self.content,
            "source_application_id": self.source_application_id,
            "follow_url": self.follow_url,
            "expiry_in_secs": self.expiry_in_secs,
            "updated_at": str(self.updated_at)
        }

    def __repr__(self):
        return "<RunningNotification {}>".format(self.source_application_id)

    def save(self, commit=True):
        db.session.add(self)
        if commit:
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()

                # Exception block is just for rolling back the transaction
                # So re raise it.
                raise
