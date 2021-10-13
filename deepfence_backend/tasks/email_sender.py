import smtplib
import ssl
import boto3
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from config.app import celery_app, app
from utils.resource import decrypt_cloud_credential
from models.email_configuration import EmailConfiguration


def send_email_ses(email_config, recipients, subject='', text='', html=''):
    ses = boto3.client(
        'ses',
        region_name=email_config.get("ses_region"),
        aws_access_key_id=decrypt_cloud_credential(email_config.get("amazon_access_key")),
        aws_secret_access_key=decrypt_cloud_credential(email_config.get("amazon_secret_key"))
    )
    sender = email_config.get("email")
    body = {}

    if text:
        body['Text'] = {
            'Charset': 'UTF-8',
            'Data': text
        }

    if html:
        body['Html'] = {
            'Charset': 'UTF-8',
            'Data': html
        }

    try:
        ses.send_email(
            Source=sender,
            Destination={'ToAddresses': recipients},
            Message={
                'Subject': {'Data': subject},
                'Body': body
            }
        )
    except Exception as exc:
        app.logger.error("Error sending email: {0}".format(exc))


def send_email_with_attachment_ses(email_config, recipients, attachment, attachment_file_name, attachment_content_type,
                                   subject='', html=''):
    ses = boto3.client(
        'ses',
        region_name=email_config.get("ses_region"),
        aws_access_key_id=decrypt_cloud_credential(email_config.get("amazon_access_key")),
        aws_secret_access_key=decrypt_cloud_credential(email_config.get("amazon_secret_key"))
    )
    sender = email_config.get("email")

    message = MIMEMultipart()
    message['Subject'] = subject
    message['From'] = sender
    message['To'] = ", ".join(recipients)
    html_data = MIMEText(html, 'html')
    message.attach(html_data)
    attachment_file = MIMEApplication(attachment)
    attachment_file.add_header('Content-Disposition', 'attachment', filename=attachment_file_name)
    attachment_file.add_header('Content-Type', attachment_content_type)
    message.attach(attachment_file)
    try:
        ses.send_raw_email(
            Source=message['From'],
            Destinations=recipients,
            RawMessage={
                'Data': message.as_string()
            }
        )
    except Exception as exc:
        app.logger.error("Error sending email: {0}".format(exc))


def send_email_smtp(email_config, recipients, subject='', text='', html=''):
    port = email_config.get("port")
    smtp_server = email_config.get("smtp")
    sender = email_config.get("email")
    password = decrypt_cloud_credential(email_config.get("password"))
    for recipient in recipients:
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = sender
        message["To"] = recipient
        if text:
            part = MIMEText(text, "plain")
            message.attach(part)

        if html:
            part = MIMEText(html, "html")
            message.attach(part)

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(smtp_server, port, context=context) as server:
            server.login(sender, password)
            server.sendmail(sender, recipient, message.as_string())


def send_email_with_attachment_smtp(email_config, recipients, attachment, attachment_file_name, attachment_content_type,
                                    subject='', html=''):
    port = email_config.get("port")
    smtp_server = email_config.get("smtp")
    sender_email = email_config.get("email")
    password = decrypt_cloud_credential(email_config.get("password"))

    for recipient in recipients:
        message = MIMEMultipart()
        message['Subject'] = subject
        message['From'] = sender_email
        message['To'] = recipient
        html_data = MIMEText(html, 'html')
        message.attach(html_data)
        attachment_file = MIMEApplication(attachment)
        attachment_file.add_header('Content-Disposition', 'attachment', filename=attachment_file_name)
        attachment_file.add_header('Content-Type', attachment_content_type)
        message.attach(attachment_file)

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(smtp_server, port, context=context) as server:
            server.login(sender_email, password)
            server.sendmail(sender_email, recipient, message.as_string())


@celery_app.task(bind=True, default_retry_delay=5 * 60)
def send_email(self, recipients, subject='', text='', html=''):
    # here we will choose which email to select to send depending up the information available
    with app.app_context():
        try:
            email_configuration = EmailConfiguration.query.filter().first()
            if email_configuration:
                if email_configuration.email_provider == "amazon_ses":
                    send_email_ses(email_configuration.email_config, recipients, subject, text, html)
                elif email_configuration.email_provider == "smtp":
                    send_email_smtp(email_configuration.email_config, recipients, subject, text, html)
            else:
                app.logger.error("Error sending email: email settings not configured")
        except Exception as ex:
            app.logger.error("Error sending email: {0}".format(ex))


@celery_app.task(bind=True, default_retry_delay=5 * 60)
def send_email_with_attachment(recipients, attachment, attachment_file_name, attachment_content_type,
                               subject='', html=''):
    with app.app_context():
        try:
            email_configuration = EmailConfiguration.query.filter().first()
            if email_configuration:
                if email_configuration.email_provider == "amazon_ses":
                    send_email_with_attachment_ses(email_configuration.email_config, recipients, attachment,
                                                   attachment_file_name, attachment_content_type, subject, html)
                elif email_configuration.email_provider == "smtp":
                    send_email_with_attachment_smtp(email_configuration.email_config, recipients, attachment,
                                                    attachment_file_name, attachment_content_type, subject, html)
            else:
                app.logger.error("Error sending email: email settings not configured")
        except Exception as ex:
            app.logger.error("Error sending email: {0}".format(ex))
