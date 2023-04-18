package email

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ses"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/encryption"
	"mime/multipart"
	"net/http"
	"net/smtp"
	"os"
	"path/filepath"
)

// BatchSize todo: add support for batch size
const BatchSize = 100

func New(b []byte) (*Email, error) {
	h := Email{}
	err := json.Unmarshal(b, &h)
	if err != nil {
		return &h, err
	}
	return &h, nil
}

func (e Email) SendNotification(message string) error {
	postgresCtx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(postgresCtx)
	if err != nil {
		return err
	}
	setting, err := pgClient.GetSetting(postgresCtx, model.EmailConfigurationKey)
	var emailConfig model.EmailConfigurationAdd
	err = json.Unmarshal(setting.Value, &emailConfig)
	if err != nil {
		return err
	}
	aesValue, err := model.GetAESValueForEncryption(postgresCtx, pgClient)
	if err != nil {
		return err
	}
	aes := encryption.AES{}
	err = json.Unmarshal(aesValue, &aes)
	if err != nil {
		return err
	}
	if emailConfig.EmailProvider == "smtp" {
		err = e.SendMailSmtp(aes, emailConfig, message, nil)
	} else {
		err = e.SendMailSes(aes, emailConfig, message, nil)
	}
	return err
}

func (e Email) SendMailSmtp(aes encryption.AES, emailConfig model.EmailConfigurationAdd, message string, attachments map[string][]byte) error {
	decryptedPassword, err := aes.Decrypt(emailConfig.Password)
	if err != nil {
		return err
	}
	auth := smtp.PlainAuth("", emailConfig.EmailID, decryptedPassword, emailConfig.Smtp)
	err = smtp.SendMail(emailConfig.Smtp+":"+emailConfig.Port, auth, emailConfig.EmailID, []string{e.Config.EmailId}, e.ToBytes(message, attachments))
	return err
}

func (e Email) SendMailSes(aes encryption.AES, emailConfig model.EmailConfigurationAdd, message string, attachments map[string][]byte) error {
	// Create an AWS session with your credentials and region
	decryptedAccessKey, err := aes.Decrypt(emailConfig.AmazonAccessKey)
	if err != nil {
		return err
	}
	decryptedSecretKey, err := aes.Decrypt(emailConfig.AmazonSecretKey)
	if err != nil {
		return err
	}
	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String(emailConfig.SesRegion),
		Credentials: credentials.NewStaticCredentials(decryptedAccessKey, decryptedSecretKey, ""),
	})
	if err != nil {
		fmt.Println("Failed to create AWS session", err)
		return err
	}
	svc := ses.New(sess)
	input := &ses.SendRawEmailInput{
		FromArn: aws.String(""),
		RawMessage: &ses.RawMessage{
			Data: e.ToBytes(message, attachments),
		},
		ReturnPathArn: aws.String(""),
		Source:        aws.String(""),
		SourceArn:     aws.String("")}
	_, err = svc.SendRawEmail(input)
	return err
}

func (e Email) GetAttachmentsMap(filePaths []string) (map[string][]byte, error) {
	var attachments map[string][]byte
	for _, filePath := range filePaths {
		b, err := os.ReadFile(filePath)
		if err != nil {
			return attachments, err
		}

		_, fileName := filepath.Split(filePath)
		attachments[fileName] = b
	}

	return attachments, nil
}

func (e Email) ToBytes(message string, attachments map[string][]byte) []byte {
	buf := bytes.NewBuffer(nil)
	withAttachments := len(attachments) > 0
	buf.WriteString(fmt.Sprintf("Subject: %s\n", "Deepfence - Alert Subscription"))
	buf.WriteString(fmt.Sprintf("To: %s\n", e.Config.EmailId))
	buf.WriteString("MIME-Version: 1.0\n")
	writer := multipart.NewWriter(buf)
	boundary := writer.Boundary()
	if withAttachments {
		buf.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=%s\n", boundary))
		buf.WriteString(fmt.Sprintf("--%s\n", boundary))
	} else {
		buf.WriteString("Content-Type: text/plain; charset=utf-8\n")
	}

	buf.WriteString(message)
	if withAttachments {
		for k, v := range attachments {
			buf.WriteString(fmt.Sprintf("\n\n--%s\n", boundary))
			buf.WriteString(fmt.Sprintf("Content-Type: %s\n", http.DetectContentType(v)))
			buf.WriteString("Content-Transfer-Encoding: base64\n")
			buf.WriteString(fmt.Sprintf("Content-Disposition: attachment; filename=%s\n", k))

			b := make([]byte, base64.StdEncoding.EncodedLen(len(v)))
			base64.StdEncoding.Encode(b, v)
			buf.Write(b)
			buf.WriteString(fmt.Sprintf("\n--%s", boundary))
		}

		buf.WriteString("--")
	}

	return buf.Bytes()
}
