package sendemail

import (
	"bytes"
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
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/encryption"
)

var (
	NoEmailRecipientsError = errors.New("no email recipients")
	NoEmailSubjectError    = errors.New("no email subject")
	NoEmailBodyError       = errors.New("no email body")
)

type EmailSender interface {
	Send(recipients []string, subject string, text string, html string, attachments map[string][]byte) error
}

func NewEmailSender() (EmailSender, error) {
	ctx := directory.NewGlobalContext()
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
	if emailConfig.EmailProvider == "smtp" {
		return newEmailSenderSMTP(encryptionKey, emailConfig)
	} else {
		return newEmailSenderSES(encryptionKey, emailConfig)
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
	if withAttachments {
		buf.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=%s\r\n", boundary))
		buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	} else if isPlainText == true {
		buf.WriteString("Content-Type: text/plain; charset=utf-8\r\n")
	} else {
		buf.WriteString("Content-Type: text/html; charset=utf-8\r\n")
	}

	buf.WriteString("\r\n")
	if isPlainText == true {
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
		return NoEmailRecipientsError
	}
	if subject == "" {
		return NoEmailSubjectError
	}
	if text == "" && html == "" {
		return NoEmailBodyError
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

	return smtp.SendMail(
		e.emailConfig.Smtp+":"+e.emailConfig.Port,
		smtp.PlainAuth("", e.emailConfig.EmailID, e.emailConfig.Password, e.emailConfig.Smtp),
		e.emailConfig.EmailID,
		recipients,
		e.getEmailBody(e.emailConfig.EmailID, recipients, subject, text, html, attachments),
	)
}
