package sendemail

import (
	"bytes"
	"embed"
	"html/template"

	"github.com/Masterminds/sprig/v3"
)

type EmailTemplateType string

const (
	PasswordResetTemplate EmailTemplateType = "reset-password.html"
	UserInviteTemplate    EmailTemplateType = "invite-user.html"
)

const (
	PasswordResetEmailSubject = "Deepfence - Reset Password"
	UserInviteEmailSubject    = "Deepfence - Invitation to join %s"
)

var (
	//go:embed templates/*.html
	emailTemplatesContent embed.FS

	EmailTemplates = template.Must(
		template.New("").Funcs(sprig.FuncMap()).ParseFS(emailTemplatesContent, []string{"templates/*.html"}...))
)

type PasswordReset struct {
	Project    string
	Username   string
	InviteLink string
}

type UserInvite struct {
	Project          string
	Username         string
	RequestedBy      string
	RequestedByEmail string
	InviteLink       string
}

func RenderEmailTemplate(emailTemplateType EmailTemplateType, data interface{}) (string, error) {
	var rendered bytes.Buffer
	err := EmailTemplates.ExecuteTemplate(&rendered, string(emailTemplateType), data)
	if err != nil {
		return "", err
	}
	return rendered.String(), nil
}
