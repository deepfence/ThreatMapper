package jira

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	jira "github.com/andygrunwald/go-jira"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
)

func New(ctx context.Context, b []byte) (*Jira, error) {
	h := Jira{}
	err := json.Unmarshal(b, &h)
	if err != nil {
		return &h, err
	}
	return &h, nil
}

func (j Jira) SendNotification(ctx context.Context, message string, extras map[string]interface{}) error {

	_, span := telemetry.NewSpan(ctx, "integrations", "jira-send-notification")
	defer span.End()

	auth := jira.BasicAuthTransport{
		Transport: &http.Transport{
			Proxy:           http.ProxyFromEnvironment,
			TLSClientConfig: &tls.Config{RootCAs: x509.NewCertPool(), InsecureSkipVerify: true},
		},
	}
	if j.Config.IsAuthToken {
		auth.Username = strings.TrimSpace(j.Config.Username)
		auth.Password = strings.TrimSpace(j.Config.APIToken)
	} else {
		auth.Username = strings.TrimSpace(j.Config.Username)
		auth.Password = strings.TrimSpace(j.Config.Password)
	}

	client, err := jira.NewClient(auth.Client(), strings.TrimSpace(j.Config.JiraSiteURL))
	if err != nil {
		log.Error().Msgf(err.Error())
		span.EndWithErr(err)
		return err
	}

	extraStr := []string{}
	for k, v := range extras {
		if v != "" {
			extraStr = append(extraStr, fmt.Sprintf("%s: %v", k, v))
		}
	}

	i := jira.Issue{
		Fields: &jira.IssueFields{
			Assignee: &jira.User{
				Name: j.Config.JiraAssignee,
			},
			Description: fmt.Sprintf("Scan Details:\n\n%s", strings.Join(extraStr, "\n")),
			Type: jira.IssueType{
				Name: j.Config.IssueType,
			},
			Project: jira.Project{
				Key: j.Config.JiraProjectKey,
			},
			Summary: fmt.Sprintf("Deepfence %v Scan Issues for %s - %s",
				extras["scan_type"], extras["node_type"], extras["node_name"]),
		},
	}

	issue, resp, err := client.Issue.Create(&i)
	if err != nil {
		log.Error().Msgf(err.Error())
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Error().Msgf(err.Error())
		}
		log.Error().Msgf("jira error reponse: %s", string(body))
		span.EndWithErr(err)
		return err
	}
	log.Info().Msgf("jira issue created id %s link %s", issue.ID, issue.Self)

	// parse message in case of custom fields
	var msgWithCustomFields []map[string]interface{}
	if len(j.Config.CustomFields) > 0 {
		var msg []map[string]interface{}
		err = json.Unmarshal([]byte(message), &msg)
		if err != nil {
			log.Error().Msgf(err.Error())
			return err
		}

		for _, m := range msg {
			customFields := make(map[string]interface{})
			for _, f := range j.Config.CustomFields {
				if value, ok := m[f]; ok {
					customFields[f] = value
				}
			}
			msgWithCustomFields = append(msgWithCustomFields, customFields)
		}

		finalByte, err := json.MarshalIndent(msgWithCustomFields, "", "  ")
		if err != nil {
			log.Error().Msgf(err.Error())
			span.EndWithErr(err)
			return err
		}

		message = string(finalByte)
	}

	attachment, resp, err := client.Issue.PostAttachment(issue.ID, strings.NewReader(message), "scan-results.json")
	if err != nil {
		log.Error().Msgf(err.Error())
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Error().Msgf(err.Error())
		}
		log.Error().Msgf("jira attachment error reponse: %s", string(body))
		span.EndWithErr(err)
		return err
	}
	defer resp.Body.Close()

	log.Info().Msgf(
		"jira issue id %s attchment added %+v",
		issue.ID,
		func(as *[]jira.Attachment) string {
			a := []string{}
			for _, i := range *as {
				a = append(a, i.Self)
			}
			return strings.Join(a, ",")
		}(attachment),
	)

	return nil
}

func (j Jira) IsValidCredential(ctx context.Context) (bool, error) {
	auth := jira.BasicAuthTransport{
		Transport: &http.Transport{
			Proxy:           http.ProxyFromEnvironment,
			TLSClientConfig: &tls.Config{RootCAs: x509.NewCertPool(), InsecureSkipVerify: true},
		},
	}
	if j.Config.IsAuthToken {
		auth.Username = strings.TrimSpace(j.Config.Username)
		auth.Password = strings.TrimSpace(j.Config.APIToken)
	} else {
		auth.Username = strings.TrimSpace(j.Config.Username)
		auth.Password = strings.TrimSpace(j.Config.Password)
	}

	jiraClient, err := jira.NewClient(auth.Client(), strings.TrimSpace(j.Config.JiraSiteURL))
	if err != nil {
		log.Error().Msgf(err.Error())
		return false, err
	}
	_, _, err = jiraClient.User.GetSelf()
	if err != nil {
		log.Error().Msgf(err.Error())
		return false, fmt.Errorf("failed to connect to Jira: %v", err)
	}

	return true, nil
}
