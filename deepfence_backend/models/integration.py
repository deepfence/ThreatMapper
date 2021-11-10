from sqlalchemy.sql import func
from sqlalchemy.schema import UniqueConstraint
from config.app import db
import json
from sys import getsizeof
from utils.constants import INTEGRATION_TYPE_EMAIL, INTEGRATION_TYPE_ES, INTEGRATION_TYPE_HTTP, INTEGRATION_TYPE_JIRA, \
    INTEGRATION_TYPE_PAGERDUTY, INTEGRATION_TYPE_S3, INTEGRATION_TYPE_SLACK, INTEGRATION_TYPE_SPLUNK, \
    INTEGRATION_TYPE_SUMO_LOGIC, INTEGRATION_TYPE_MICROSOFT_TEAMS, INTEGRATION_TYPE_GOOGLE_CHRONICLE


class IntegrationTypes(object):
    integration_type = ""

    def __init__(self, config):
        self.config = config

    def format_prefix(self, prefix):
        if prefix:
            prefix += "\n\n"
        return prefix

    def format_iteration_prefix(self, idx, prefix):
        if prefix:
            prefix = prefix.format(idx + 1) + "\n"
        return prefix

    def format_content(self, content_json):
        content = self.format_prefix(content_json.get("prefix", ""))
        doc_fields_map = content_json.get("doc_fields_map", None)
        dump_indent = content_json.get("dump_indent", 4)
        iteration_prefix = content_json.get("iteration_prefix", "")
        for idx, cnt in enumerate(content_json["contents"]):
            content += self.format_iteration_prefix(idx, iteration_prefix)
            if doc_fields_map:
                cnt = self.rename_doc_fields(cnt, doc_fields_map)
                for k, v in cnt.items():
                    if type(v) is dict or type(v) is list:
                        v = json.dumps(v, indent=dump_indent)
                    content += "{0}: {1}\n".format(k, v)
            else:
                content += json.dumps(cnt, indent=dump_indent)
            content += "\n\n"
        return content

    def format_content_for_sumo(self, content_json):
        data = []
        for idx, cnt in enumerate(content_json["contents"]):
            info = {}
            for k, v in cnt.items():
                info[k] = "{0}".format(v)
            data.append(info)
        return data

    def format_content_with_size(self, content_json, limit_in_byte):
        content = self.format_prefix(content_json.get("prefix", ""))
        doc_fields_map = content_json.get("doc_fields_map", None)
        dump_indent = content_json.get("dump_indent", 4)
        iteration_prefix = content_json.get("iteration_prefix", "")
        arr = []
        # Setting a flag so that we don't end up appending empty content
        has_data = False
        for idx, cnt in enumerate(content_json["contents"]):
            has_data = True
            content += self.format_iteration_prefix(idx, iteration_prefix)
            if doc_fields_map:
                cnt = self.rename_doc_fields(cnt, doc_fields_map)
                for k, v in cnt.items():
                    if type(v) is dict or type(v) is list:
                        v = json.dumps(v, indent=dump_indent)
                    content += "{0}: {1}\n".format(k, v)
            else:
                content += json.dumps(cnt, indent=dump_indent)
            content += "\n\n"

            if getsizeof(content) >= limit_in_byte:
                has_data = False
                arr.append(content)
                content = ""
        if has_data:
            arr.append(content)
        return arr

    # format_content_for_teams method is used to format MS Teams messages
    # and breaks the content_json into array with reference to given @limit_in_byte
    def format_content_for_teams(self, content_json, limit_in_byte):
        content = self.format_prefix(content_json.get("prefix", ""))
        doc_fields_map = content_json.get("doc_fields_map", None)
        dump_indent = content_json.get("dump_indent", 4)
        iteration_prefix = content_json.get("iteration_prefix", "")
        arr = []
        # Setting a flag so that we don't end up appending empty content
        has_data = False

        for idx, cnt in enumerate(content_json["contents"]):
            has_data = True
            content += self.format_iteration_prefix(idx, iteration_prefix)
            if doc_fields_map:
                cnt = self.rename_doc_fields(cnt, doc_fields_map)
                for k, v in cnt.items():
                    if type(v) is dict or type(v) is list:
                        v = json.dumps(v, indent=dump_indent)
                    content += "{0}: {1}<br>".format(k, v)
            else:
                content += json.dumps(cnt, indent=dump_indent)
            content += "<br><br>"

            if getsizeof(content) >= limit_in_byte:
                has_data = False
                arr.append(content)
                content = ""

        if has_data:
            arr.append(content)
        return arr

    def rename_doc_fields(cls, content, doc_fields_map):
        return {doc_fields_map[k]: v for k, v in content.items() if k in doc_fields_map}

    def send(self, content_json, **kwargs):
        raise NotImplementedError("Subclass should implement this method")

    def pretty_print(self):
        return {**{"integration_type": self.integration_type}, **self.config}

    @staticmethod
    def get_integration(integration_type, config):
        if integration_type == INTEGRATION_TYPE_EMAIL:
            return Email(config)
        elif integration_type == INTEGRATION_TYPE_SLACK:
            return Slack(config)
        elif integration_type == INTEGRATION_TYPE_HTTP:
            return HttpEndpoint(config)
        elif integration_type == INTEGRATION_TYPE_GOOGLE_CHRONICLE:
            return GoogleChronicle(config)
        elif integration_type == INTEGRATION_TYPE_JIRA:
            return Jira(config)
        elif integration_type == INTEGRATION_TYPE_PAGERDUTY:
            return PagerDuty(config)
        elif integration_type == INTEGRATION_TYPE_SPLUNK:
            return Splunk(config)
        elif integration_type == INTEGRATION_TYPE_ES:
            return Elasticsearch(config)
        elif integration_type == INTEGRATION_TYPE_S3:
            return S3(config)
        elif integration_type == INTEGRATION_TYPE_SUMO_LOGIC:
            return SumoLogic(config)
        elif integration_type == INTEGRATION_TYPE_MICROSOFT_TEAMS:
            return MicrosoftTeams(config)
        else:
            raise Exception("Integration type: {0} - not found".format(integration_type))


class Email(IntegrationTypes):
    integration_type = INTEGRATION_TYPE_EMAIL
    
    def __init__(self, config):
        super(Email, self).__init__(config)

    def send(self, content_json, **kwargs):
        subject = kwargs.get("summary", "Deepfence - Alerts Subscription")
        recipients = [self.config["email"]]
        from tasks.email_sender import send_email
        send_email(recipients, subject=subject, text=self.format_content(content_json))


class Slack(IntegrationTypes):
    integration_type = INTEGRATION_TYPE_SLACK

    def format_prefix(self, prefix):
        if prefix:
            prefix = "*" + prefix + "*\n\n"
        return prefix

    def format_iteration_prefix(self, idx, prefix):
        if prefix:
            prefix = "*" + prefix.format(idx + 1) + "*\n"
        return prefix

    def __init__(self, config):
        super(Slack, self).__init__(config)

    def rename_doc_fields(cls, content, doc_fields_map):
        return {"*" + doc_fields_map[k] + "*": v for k, v in content.items() if k in doc_fields_map}

    def send(self, content_json, **kwargs):
        notification_id = kwargs["notification_id"]
        resource_type = kwargs["resource_type"]
        from tasks.notification import send_slack_notification
        send_slack_notification(self.pretty_print(), self.format_content(content_json), notification_id, resource_type)


class PagerDuty(IntegrationTypes):
    #
    integration_type = INTEGRATION_TYPE_PAGERDUTY

    def __init__(self, config):
        super(PagerDuty, self).__init__(config)

    def send(self, content_json, **kwargs):
        notification_id = kwargs["notification_id"]
        resource_type = kwargs["resource_type"]
        alert_level = kwargs.get("alert_level", "low")
        from tasks.notification import create_pagerduty_event

        create_pagerduty_event(self.pretty_print(), alert_level, self.format_content(content_json),
                               kwargs.get("summary", ""), notification_id, resource_type)


class Splunk(IntegrationTypes):
    integration_type = INTEGRATION_TYPE_SPLUNK

    def __init__(self, config):
        super(Splunk, self).__init__(config)

    def send(self, content_json, **kwargs):
        notification_id = kwargs["notification_id"]
        resource_type = kwargs["resource_type"]
        from tasks.notification import create_splunk_event

        create_splunk_event(self.pretty_print(), content_json["contents"], notification_id, resource_type)


class SumoLogic(IntegrationTypes):
    integration_type = INTEGRATION_TYPE_SUMO_LOGIC

    def __init__(self, config):
        super(SumoLogic, self).__init__(config)

    def send(self, content_json, **kwargs):
        notification_id = kwargs["notification_id"]
        resource_type = kwargs["resource_type"]
        notification_id = kwargs["notification_id"]
        resource_type = kwargs["resource_type"]
        from tasks.notification import send_sumo_logic_notification
        send_sumo_logic_notification(self.pretty_print(), self.format_content_for_sumo(content_json), notification_id,
                                     resource_type)


class Jira(IntegrationTypes):
    integration_type = INTEGRATION_TYPE_JIRA

    def __init__(self, config):
        super(Jira, self).__init__(config)

    def send(self, content_json, **kwargs):
        notification_id = kwargs["notification_id"]
        resource_type = kwargs["resource_type"]
        from tasks.notification import send_jira_notification
        jira_size_limit_bytes = 30000
        payload_string_list = self.format_content_with_size(content_json, jira_size_limit_bytes)
        prefix = content_json.get("prefix", "")
        send_jira_notification(self.pretty_print(), payload_string_list, notification_id, resource_type, prefix=prefix)


class HttpEndpoint(IntegrationTypes):
    integration_type = INTEGRATION_TYPE_HTTP

    def __init__(self, config):
        super(HttpEndpoint, self).__init__(config)

    def send(self, content_json, **kwargs):
        notification_id = kwargs["notification_id"]
        resource_type = kwargs["resource_type"]
        from tasks.notification import send_http_endpoint_notification
        send_http_endpoint_notification(self.pretty_print(), content_json["contents"], notification_id,
                                        resource_type)


class GoogleChronicle(IntegrationTypes):
    integration_type = INTEGRATION_TYPE_GOOGLE_CHRONICLE

    def __init__(self, config):
        super(GoogleChronicle, self).__init__(config)

    def send(self, content_json, **kwargs):
        notification_id = kwargs["notification_id"]
        resource_type = kwargs["resource_type"]
        from tasks.notification import send_google_chronicle_notification
        send_google_chronicle_notification(self.pretty_print(), content_json["contents"], notification_id,
                                           resource_type)


class Elasticsearch(IntegrationTypes):
    integration_type = INTEGRATION_TYPE_ES

    def __init__(self, config):
        super(Elasticsearch, self).__init__(config)

    def send(self, content_json, **kwargs):
        notification_id = kwargs["notification_id"]
        resource_type = kwargs["resource_type"]
        from tasks.notification import send_notification_to_es
        send_notification_to_es(self.pretty_print(), content_json["contents"], notification_id, resource_type)


class S3(IntegrationTypes):
    integration_type = INTEGRATION_TYPE_S3

    def __init__(self, config):
        super(S3, self).__init__(config)

    def send(self, content_json, **kwargs):
        notification_id = kwargs["notification_id"]
        resource_type = kwargs["resource_type"]
        from tasks.notification import send_notification_to_s3
        send_notification_to_s3(self.pretty_print(), content_json["contents"], notification_id, resource_type)


class MicrosoftTeams(IntegrationTypes):
    integration_type = INTEGRATION_TYPE_MICROSOFT_TEAMS

    def format_prefix(self, prefix):
        if prefix:
            prefix = "**" + prefix + "**<br><br>"
        return prefix

    def format_iteration_prefix(self, idx, prefix):
        if prefix:
            prefix = "**" + prefix.format(idx + 1) + "**<br>"
        return prefix

    def __init__(self, config):
        super(MicrosoftTeams, self).__init__(config)

    def rename_doc_fields(cls, content, doc_fields_map):
        return {"**" + doc_fields_map[k] + "**": v for k, v in content.items() if k in doc_fields_map}

    def send(self, content_json, **kwargs):
        notification_id = kwargs["notification_id"]
        resource_type = kwargs["resource_type"]
        from tasks.notification import send_microsoft_teams_notification
        # ref:https://docs.microsoft.com/en-us/microsoftteams/limits-specifications-teams
        team_size_limit_bytes = 10 * 1000

        # the size of every payload in the list be around @team_size_limit_bytes
        payload_string_list = self.format_content_for_teams(content_json, team_size_limit_bytes)
        send_microsoft_teams_notification(self.pretty_print(), payload_string_list, notification_id, resource_type)


class Integration(db.Model):
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=func.now())
    id = db.Column(db.Integer, primary_key=True)
    config = db.Column(db.String(2048), nullable=False)
    integration_type = db.Column(db.String(255), nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('integrations', lazy=True))

    __table_args__ = (UniqueConstraint('config', 'integration_type', name='integration_constraint'),)

    def pretty_print(self):
        conf = {
            "integration_id": self.id,
            "user_id": self.user_id,
            "created_at": str(self.created_at),
            "updated_at": str(self.updated_at),
            "integration_type": self.integration_type
        }
        integration_base = self.__get_integration_base()
        conf.update(integration_base.pretty_print())
        return conf

    @property
    def name(self):
        return self.__class__.__name__.lower()

    def __get_integration_base(self):
        return IntegrationTypes.get_integration(self.integration_type, json.loads(self.config))

    def send(self, content_json, **kwargs):
        integration_base = self.__get_integration_base()
        integration_base.send(content_json, **kwargs)

    def save(self, commit=True):
        db.session.add(self)
        if commit:
            try:
                db.session.commit()
            except:
                db.session.rollback()
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

    def __repr__(self):
        return "<Integration {}>".format(self.id)
