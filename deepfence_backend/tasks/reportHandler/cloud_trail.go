package main

import (
	"crypto/md5"
	"encoding/json"
	"fmt"

	"github.com/olivere/elastic/v7"
)

type WebIdentitySessionContext struct {
	FederatedProvider string                 `json:"federatedProvider,omitempty"`
	Attributes        map[string]interface{} `json:"attributes,omitempty"`
}
type SessionContext struct {
	Attributes          map[string]interface{}    `json:"attributes,omitempty"`
	SessionIssuer       map[string]interface{}    `json:"sessionIssuer,omitempty"`
	WebIdFederationData WebIdentitySessionContext `json:"webIdFederationData,omitempty"`
}

type UserIdentity struct {
	IdentityType     string         `json:"type,omitempty"`
	PrincipalId      string         `json:"principalId,omitempty"`
	Arn              string         `json:"arn,omitempty"`
	AccountId        string         `json:"accountId,omitempty"`
	AccessKeyId      string         `json:"accessKeyId,omitempty"`
	UserName         string         `json:"userName,omitempty"`
	InvokedBy        string         `json:"invokedBy,omitempty"`
	SessionContext   SessionContext `json:"sessionContext,omitempty"`
	IdentityProvider string         `json:"identityProvider,omitempty"`
}

type CloudTrailLogEvent struct {
	DocId                        string                   `json:"doc_id,omitempty"`
	Type                         string                   `json:"type,omitempty"`
	TimeStamp                    int64                    `json:"time_stamp,omitempty"`
	Timestamp                    string                   `json:"@timestamp,omitempty"`
	Masked                       string                   `json:"masked,omitempty"`
	EventVersion                 string                   `json:"eventVersion,omitempty"`
	UserIdentity                 UserIdentity             `json:"userIdentity,omitempty"`
	EventTime                    string                   `json:"eventTime,omitempty"`
	EventName                    string                   `json:"eventName,omitempty"`
	EventSource                  string                   `json:"eventSource,omitempty"`
	AwsRegion                    string                   `json:"awsRegion,omitempty"`
	SourceIPAddress              string                   `json:"sourceIPAddress,omitempty"`
	UserAgent                    string                   `json:"userAgent,omitempty"`
	RequestID                    string                   `json:"requestID,omitempty"`
	ErrorCode                    string                   `json:"errorCode,omitempty"`
	ErrorMessage                 string                   `json:"errorMessage,omitempty"`
	RequestParameters            map[string]interface{}   `json:"requestParameters,omitempty"`
	ResponseElements             map[string]interface{}   `json:"responseElements,omitempty"`
	ServiceEventDetails          map[string]interface{}   `json:"serviceEventDetails,omitempty"`
	AdditionalEventData          map[string]interface{}   `json:"additionalEventData,omitempty"`
	EventID                      string                   `json:"eventID,omitempty"`
	ReadOnly                     bool                     `json:"readOnly,omitempty"`
	ManagementEvent              bool                     `json:"managementEvent,omitempty"`
	Resources                    []map[string]interface{} `json:"resources,omitempty"`
	AccountId                    string                   `json:"accountId,omitempty"`
	EventCategory                string                   `json:"eventCategory,omitempty"`
	EventType                    string                   `json:"eventType,omitempty"`
	ApiVersion                   string                   `json:"apiVersion,omitempty"`
	RecipientAccountId           string                   `json:"recipientAccountId,omitempty"`
	SharedEventID                string                   `json:"sharedEventID,omitempty"`
	Annotation                   string                   `json:"annotation,omitempty"`
	VpcEndpointId                string                   `json:"vpcEndpointId,omitempty"`
	InsightDetails               map[string]interface{}   `json:"insightDetails,omitempty"`
	Addendum                     map[string]interface{}   `json:"addendum,omitempty"`
	EdgeDeviceDetails            map[string]interface{}   `json:"edgeDeviceDetails,omitempty"`
	TlsDetails                   map[string]interface{}   `json:"tlsDetails,omitempty"`
	SessionCredentialFromConsole string                   `json:"sessionCredentialFromConsole,omitempty"`
}

func processCloudTrailAlert(cloudTrailAlert []byte, bulkp *elastic.BulkProcessor) {
	var cloudTrailDoc CloudTrailLogEvent
	err := json.Unmarshal(cloudTrailAlert, &cloudTrailDoc)
	if err != nil {
		log.Errorf("error unmarshal cloud trail alert: %s", err)
		return
	}
	docId := fmt.Sprintf("%x", md5.Sum([]byte(cloudTrailDoc.EventID)))
	cloudTrailDoc.DocId = docId
	event, err := json.Marshal(cloudTrailDoc)
	if err != nil {
		log.Errorf("error marshal updated cloud trail alert: %s", err)
		return
	} else {
		bulkp.Add(elastic.NewBulkUpdateRequest().Index(cloudTrailAlertsIndexName).Id(docId).
			Script(elastic.NewScriptStored("default_upsert").Param("event", cloudTrailDoc)).
			Upsert(cloudTrailDoc).ScriptedUpsert(true).RetryOnConflict(3))
		cloudTrailTaskQueue <- event
	}
}
