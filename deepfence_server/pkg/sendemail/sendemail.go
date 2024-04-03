package sendemail

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/smtp"
	"strings"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ses"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/rs/zerolog/log"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

var (
	ErrNoEmailRecipients = errors.New("no email recipients")
	ErrNoEmailSubject    = errors.New("no email subject")
	ErrNoEmailBody       = errors.New("no email body")
)

type EmailSender interface {
	Send(recipients []string, subject string, text string, html string, attachments map[string][]byte) error
}

func NewEmailSender(ctx context.Context) (EmailSender, error) {

	_, span := telemetry.NewSpan(ctx, "send-email", "new-email-sender")
	defer span.End()

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return nil, err
	}
	setting, err := pgClient.GetSetting(ctx, model.EmailConfigurationKey)
	if err != nil {
		return nil, err
	}
	var emailConfig model.EmailConfigurationAdd
	err = json.Unmarshal(setting.Value, &emailConfig)
	if err != nil {
		return nil, err
	}
	aesValue, err := model.GetAESValueForEncryption(ctx, pgClient)
	if err != nil {
		return nil, err
	}
	encryptionKey := encryption.AES{}
	err = json.Unmarshal(aesValue, &encryptionKey)
	if err != nil {
		return nil, err
	}

	switch emailConfig.EmailProvider {
	case model.EmailSettingSMTP:
		return newEmailSenderSMTP(encryptionKey, emailConfig)
	case model.EmailSettingSendGrid:
		return newEmailSenderSendGrid(encryptionKey, emailConfig)
	case model.EmailSettingSES:
		return newEmailSenderSES(encryptionKey, emailConfig)
	default:
		return nil, errors.New("invalid email provider")
	}
}

func NewEmailSendByConfiguration(ctx context.Context, emailConfig model.EmailConfigurationAdd) (EmailSender, error) {
	_, span := telemetry.NewSpan(ctx, "send-email", "new-email-sender")
	defer span.End()

	switch emailConfig.EmailProvider {
	case model.EmailSettingSMTP:
		return &emailSenderSMTP{
			emailSenderCommon{
				emailConfig: emailConfig,
			},
		}, nil
	case model.EmailSettingSendGrid:
		return &emailSenderSendGrid{
			emailSenderCommon{
				emailConfig: emailConfig,
			},
		}, nil
	case model.EmailSettingSES:
		return &emailSenderSES{
			emailSenderCommon{
				emailConfig: emailConfig,
			},
		}, nil
	default:
		return nil, errors.New("invalid email provider")
	}
}

func (c *emailSenderCommon) getEmailBody(from string, recipients []string, subject string, text string, html string, attachments map[string][]byte) []byte {
	isPlainText := text != ""
	buf := bytes.NewBuffer(nil)
	withAttachments := len(attachments) > 0
	buf.WriteString(fmt.Sprintf("From: %s\r\n", from))
	buf.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	buf.WriteString(fmt.Sprintf("To: %s\r\n", strings.Join(recipients, ",")))
	writer := multipart.NewWriter(buf)
	boundary := writer.Boundary()
	switch {
	case withAttachments:
		buf.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=%s\r\n", boundary))
		buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	case isPlainText:
		buf.WriteString("Content-Type: text/plain; charset=utf-8\r\n")
	default:
		buf.WriteString("Content-Type: text/html; charset=utf-8\r\n")
	}

	buf.WriteString("\r\n")
	if isPlainText {
		buf.WriteString(text)
	} else {
		buf.WriteString(html)
	}

	if withAttachments {
		for k, v := range attachments {
			buf.WriteString(fmt.Sprintf("\r\n--%s\r\n", boundary))
			buf.WriteString(fmt.Sprintf("Content-Type: %s\r\n", http.DetectContentType(v)))
			buf.WriteString("Content-Transfer-Encoding: base64\r\n")
			buf.WriteString(fmt.Sprintf("Content-Disposition: attachment; filename=%s\r\n", k))

			b := make([]byte, base64.StdEncoding.EncodedLen(len(v)))
			base64.StdEncoding.Encode(b, v)
			buf.Write(b)
			buf.WriteString(fmt.Sprintf("\r\n--%s", boundary))
		}
		buf.WriteString("--")
	}
	return buf.Bytes()
}

func (c *emailSenderCommon) validateSendParams(recipients []string, subject string, text string, html string, attachments map[string][]byte) error {
	if len(recipients) == 0 {
		return ErrNoEmailRecipients
	}
	if subject == "" {
		return ErrNoEmailSubject
	}
	if text == "" && html == "" {
		return ErrNoEmailBody
	}
	return nil
}

type emailSenderCommon struct {
	emailConfig model.EmailConfigurationAdd
}

type emailSenderSES struct {
	emailSenderCommon
}

func newEmailSenderSES(encryptionKey encryption.AES, emailConfig model.EmailConfigurationAdd) (*emailSenderSES, error) {
	decryptedAccessKey, err := encryptionKey.Decrypt(emailConfig.AmazonAccessKey)
	if err != nil {
		return nil, err
	}
	decryptedSecretKey, err := encryptionKey.Decrypt(emailConfig.AmazonSecretKey)
	if err != nil {
		return nil, err
	}
	emailConfig.AmazonAccessKey = decryptedAccessKey
	emailConfig.AmazonSecretKey = decryptedSecretKey
	return &emailSenderSES{
		emailSenderCommon{
			emailConfig: emailConfig,
		},
	}, nil
}

func (e *emailSenderSES) Send(recipients []string, subject string, text string, html string, attachments map[string][]byte) error {
	err := e.validateSendParams(recipients, subject, text, html, attachments)
	if err != nil {
		return err
	}

	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String(e.emailConfig.SesRegion),
		Credentials: credentials.NewStaticCredentials(e.emailConfig.AmazonAccessKey, e.emailConfig.AmazonSecretKey, ""),
	})
	if err != nil {
		return err
	}
	svc := ses.New(sess)
	input := &ses.SendRawEmailInput{
		RawMessage: &ses.RawMessage{
			Data: e.getEmailBody(e.emailConfig.EmailID, recipients, subject, text, html, attachments),
		},
	}
	_, err = svc.SendRawEmail(input)
	return err
}

type emailSenderSMTP struct {
	emailSenderCommon
}

func newEmailSenderSMTP(encryptionKey encryption.AES, emailConfig model.EmailConfigurationAdd) (*emailSenderSMTP, error) {
	decryptedPassword, err := encryptionKey.Decrypt(emailConfig.Password)
	if err != nil {
		return nil, err
	}
	emailConfig.Password = decryptedPassword

	return &emailSenderSMTP{
		emailSenderCommon{
			emailConfig: emailConfig,
		},
	}, nil
}

func (e *emailSenderSMTP) Send(recipients []string, subject string, text string, html string, attachments map[string][]byte) error {
	err := e.validateSendParams(recipients, subject, text, html, attachments)
	if err != nil {
		return err
	}

	err = smtp.SendMail(
		e.emailConfig.SMTP+":"+e.emailConfig.Port,
		smtp.PlainAuth("", e.emailConfig.EmailID, e.emailConfig.Password, e.emailConfig.SMTP),
		e.emailConfig.EmailID,
		recipients,
		e.getEmailBody(e.emailConfig.EmailID, recipients, subject, text, html, attachments),
	)

	if err != nil {
		log.Error().Msg("Error in emailSenderSMTP Send(): " + err.Error())
		err = e.SendCustom(recipients, subject, text, html, attachments)
	}
	return err
}

type emailSenderSendGrid struct {
	emailSenderCommon
}

func newEmailSenderSendGrid(encryptionKey encryption.AES, emailConfig model.EmailConfigurationAdd) (*emailSenderSendGrid, error) {
	decryptedAPIKey, err := encryptionKey.Decrypt(emailConfig.APIKey)
	if err != nil {
		return nil, err
	}
	emailConfig.APIKey = decryptedAPIKey

	return &emailSenderSendGrid{
		emailSenderCommon{
			emailConfig: emailConfig,
		},
	}, nil
}

func (e *emailSenderSendGrid) Send(recipients []string, subject string, text string, html string, attachments map[string][]byte) error {
	err := e.validateSendParams(recipients, subject, text, html, attachments)
	if err != nil {
		return err
	}

	from := mail.NewEmail("", e.emailConfig.EmailID)
	to := mail.NewEmail("", recipients[0])

	client := sendgrid.NewSendClient(e.emailConfig.APIKey)
	message := mail.NewSingleEmail(from, subject, to, text, html)

	// add attachment
	for k, v := range attachments {
		att := mail.NewAttachment()
		att.SetContent(base64.StdEncoding.EncodeToString(v))
		att.SetType(http.DetectContentType(v))
		att.SetFilename(k)
		att.SetDisposition("attachment")
		att.SetContentID(k)
		att.SetContent(base64.StdEncoding.EncodeToString(v))
		message.AddAttachment(att)
	}
	response, err := client.Send(message)
	if err != nil {
		log.Error().Msg("Error in emailSenderSendGrid Send(): " + err.Error())
		return err
	}
	// check 2xx
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return errors.New("sendgrid error: " + response.Body)
	}
	return nil
}

func (e *emailSenderSMTP) SendCustom(recipients []string, subject string, text string,
	html string, attachments map[string][]byte) error {

	err := e.validateSendParams(recipients, subject, text, html, attachments)
	if err != nil {
		return err
	}

	emailBody := e.getEmailBody(e.emailConfig.EmailID, recipients,
		subject, text, html, attachments)

	// Connect to the SMTP Server
	servername := e.emailConfig.SMTP + ":" + e.emailConfig.Port
	host := e.emailConfig.SMTP

	auth := smtp.PlainAuth("", e.emailConfig.EmailID, e.emailConfig.Password, e.emailConfig.SMTP)

	// TLS config
	tlsconfig := &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         host,
	}

	conn, err := tls.Dial("tcp", servername, tlsconfig)
	if err != nil {
		return err
	}

	c, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}

	// Auth
	if err = c.Auth(auth); err != nil {
		return err
	}

	// To && From
	if err = c.Mail(e.emailConfig.EmailID); err != nil {
		return err
	}

	for _, addr := range recipients {
		if err = c.Rcpt(addr); err != nil {
			return err
		}
	}

	// Data
	w, err := c.Data()
	if err != nil {
		return err
	}

	_, err = w.Write(emailBody)
	if err != nil {
		return err
	}

	err = w.Close()
	if err != nil {
		return err
	}

	err = c.Quit()
	return err
}
