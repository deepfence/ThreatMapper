package jira

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	jira "github.com/andygrunwald/go-jira"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
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

	auth := jira.BasicAuthTransport{}

	if j.Config.IsAuthToken {
		auth = jira.BasicAuthTransport{
			Username: strings.TrimSpace(j.Config.Username),
			Password: strings.TrimSpace(j.Config.APIToken),
		}
	} else {
		auth = jira.BasicAuthTransport{
			Username: strings.TrimSpace(j.Config.Username),
			Password: strings.TrimSpace(j.Config.Password),
		}
	}

	client, err := jira.NewClient(auth.Client(), strings.TrimSpace(j.Config.JiraSiteUrl))
	if err != nil {
		log.Error().Msgf(err.Error())
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
		return err
	}
	log.Info().Msgf("jira issue created id %s link %s", issue.ID, issue.Self)

	attachment, resp, err := client.Issue.PostAttachment(issue.ID, strings.NewReader(message), "scan-results.json")
	if err != nil {
		log.Error().Msgf(err.Error())
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Error().Msgf(err.Error())
		}
		log.Error().Msgf("jira attachment error reponse: %s", string(body))
		return err
	}

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
