package awssecurityhub

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/service/sts"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/securityhub"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

const MaxFindingsPerBatch = 100

var compAsff = map[string]string{
	"hipaa": "Software and Configuration Checks/Industry and Regulatory Standards/HIPAA Controls (USA)",
	"gdpr":  "Software and Configuration Checks/Industry and Regulatory Standards/GDPR Controls (Europe)",
	"pci":   "Software and Configuration Checks/Industry and Regulatory Standards/PCI-DSS",
	"nist":  "Software and Configuration Checks/Industry and Regulatory Standards/NIST 800-53 Controls (USA)",
	"aws-foundational-security": "Software and Configuration Checks/Industry and Regulatory Standards/" +
		"AWS Foundational Security Best Practices",
	"cis":  "Software and Configuration Checks/Industry and Regulatory Standards/CIS Host Hardening Benchmarks",
	"soc2": "Software and Configuration Checks/Industry and Regulatory Standards/SOC 2",
}
var compStatusAsff = map[string]string{
	"alarm": "FAILED",
	"ok":    "PASSED",
	"info":  "NOT_AVAILABLE",
	"skip":  "NOT_AVAILABLE",
	"note":  "NOT_AVAILABLE",
	"pass":  "PASSED",
	"warn":  "WARNING",
}

func New(ctx context.Context, b []byte) (*AwsSecurityHub, error) {
	s := AwsSecurityHub{}
	err := json.Unmarshal(b, &s)
	if err != nil {
		return &s, err
	}
	return &s, nil
}

func (a AwsSecurityHub) SendNotification(ctx context.Context, message string, extras map[string]interface{}) error {

	ctx, span := telemetry.NewSpan(ctx, "integrations", "aws-security-hub-send-notification")
	defer span.End()

	scanID, ok := extras["scan_id"]
	if !ok {
		log.Error().Msgf("AwsSecurityHub: SendNotification: node_id not found in extras")
		return nil
	}

	scanIDStr, ok := scanID.(string)
	if !ok {
		log.Error().Msgf("AwsSecurityHub: SendNotification: node_id not string")
		return nil
	}

	// Create an AWS session with your credentials and region
	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String(a.Config.AWSRegion),
		Credentials: credentials.NewStaticCredentials(a.Config.AWSAccessKey, a.Config.AWSSecretKey, ""),
	})
	if err != nil {
		fmt.Println("Failed to create AWS session", err)
		span.EndWithErr(err)
		return nil
	}
	stsSvc := sts.New(sess)
	id, err := stsSvc.GetCallerIdentity(&sts.GetCallerIdentityInput{})
	if err != nil {
		fmt.Println("Failed to get caller identity", err)
		span.EndWithErr(err)
		return nil
	}

	resource, err := getResource(ctx, a.Resource, scanIDStr, a.Config.AWSRegion, *id.Account)
	if err != nil {
		// if err.Err check here
		if err.Error() == "not aws" {
			log.Info().Msgf("skipping non aws resource")
			return nil
		}
		log.Error().Msg(err.Error())
		return nil
	}

	svc := securityhub.New(sess)
	var msg []map[string]interface{}
	d := json.NewDecoder(strings.NewReader(message))
	d.UseNumber()
	if err := d.Decode(&msg); err != nil {
		fmt.Println("Failed to marshal JSON data", err)
		return nil
	}
	fs := a.mapPayloadToFindings(msg, resource, *id.Account)

	// Split the JSON data into batches of 100
	var batches []*securityhub.BatchImportFindingsInput
	for i := 0; i < len(fs.Findings); i += MaxFindingsPerBatch {
		end := i + MaxFindingsPerBatch
		if end > len(fs.Findings) {
			end = len(fs.Findings)
		}
		batches = append(batches, &securityhub.BatchImportFindingsInput{
			Findings: fs.Findings[i:end],
		})
	}

	// Upload the JSON data to Security Hub in batches
	for _, batch := range batches {
		// Default timeout of aws client is 30 sec
		importFindings, err := svc.BatchImportFindings(batch)
		if err != nil {
			fmt.Println("Failed to upload JSON data to Security Hub", err)
			span.EndWithErr(err)
			return nil
		}

		fmt.Println("JSON data uploaded successfully to aws security hub with", importFindings.SuccessCount, "success count")
	}

	return nil
}

func getResource(ctx context.Context, scanType, scanID, region, accountID string) ([]*securityhub.Resource, error) {
	if scanType == utils.ScanTypeDetectedNode[utils.NEO4JVulnerabilityScan] {
		return getResourceForVulnerability(ctx, scanID, region, accountID)
	} else if scanType == utils.ScanTypeDetectedNode[utils.NEO4JComplianceScan] {
		return getResourceForCompliance(ctx, scanID, region, accountID)
	}
	return nil, fmt.Errorf("not aws")
}

func getResourceForVulnerability(ctx context.Context, scanID, region, accountID string) ([]*securityhub.Resource, error) {

	ctx, span := telemetry.NewSpan(ctx, "integrations", "get-resource-for-vulnerability")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	defer tx.Close(ctx)

	// query for Host/Node
	query := `MATCH (m:VulnerabilityScan{node_id: $id})-[:SCHEDULED|SCANNED]->(o:Node) WHERE o.pseudo <> true RETURN o.cloud_provider as cp, o.instance_id as instanceID, o.cloud_account_id as cloudAccountID`
	vars := map[string]interface{}{"id": scanID}
	r, err := tx.Run(ctx, query, vars)

	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}

	records, err := r.Collect(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}

	if len(records) > 1 {
		log.Error().Msgf("Too many results: %v", len(records))
		return nil, fmt.Errorf("not aws")
	}

	if len(records) == 1 {
		rec := records[0]
		if rec.Values[0].(string) != "aws" {
			return nil, fmt.Errorf("not aws")
		}
		return []*securityhub.Resource{
			{
				Type: aws.String("AwsEc2Instance"),
				Id:   aws.String(fmt.Sprintf("arn:aws:ec2:%s:%s:instance/%s", region, rec.Values[2].(string), rec.Values[1].(string))),
			},
		}, nil
	}

	// query for containerImage
	query = `MATCH (m:VulnerabilityScan{node_id: $id})-[:SCHEDULED|SCANNED]->(o:ContainerImage)<-[:HOSTS]-(p:RegistryAccount) 
	RETURN o.docker_image_name as name, p.registry_type as type LIMIT 1`
	r, err = tx.Run(ctx, query, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}

	records, err = r.Collect(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}

	if len(records) > 1 {
		log.Error().Msgf("Too many results: %v", len(records))
		return nil, fmt.Errorf("not aws")
	}

	if len(records) == 1 {
		rec := records[0]
		if rec.Values[1].(string) != "ecr" {
			return nil, fmt.Errorf("not aws")
		}
		return []*securityhub.Resource{
			{
				Type: aws.String("AwsEcrContainerImage"),
				Id:   aws.String(fmt.Sprintf("arn:aws:ecr:%s:%s:repository/%s", region, accountID, rec.Values[0].(string))),
			},
		}, nil
	}
	return nil, fmt.Errorf("not aws")
}

func getResourceForCompliance(ctx context.Context, scanID, region, accountID string) ([]*securityhub.Resource, error) {
	ctx, span := telemetry.NewSpan(ctx, "integrations", "get-resource-for-compliance")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	defer tx.Close(ctx)

	// query for Host/Node
	query := `MATCH (m:ComplianceScan{node_id: $id})-[:SCHEDULED|SCANNED]->(o:Node) WHERE o.pseudo <> true RETURN o.cloud_provider as cp, o.instance_id as instanceID, o.cloud_account_id as cloudAccountID`
	vars := map[string]interface{}{"id": scanID}
	r, err := tx.Run(ctx, query, vars)

	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}

	records, err := r.Collect(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}

	if len(records) > 1 {
		log.Error().Msgf("Too many results: %v", len(records))
		return nil, fmt.Errorf("not aws")
	}

	if len(records) == 1 {
		rec := records[0]
		if rec.Values[0].(string) != "aws" {
			return nil, fmt.Errorf("not aws")
		}
		return []*securityhub.Resource{
			{
				Type: aws.String("AwsEc2Instance"),
				Id:   aws.String(fmt.Sprintf("arn:aws:ec2:%s:%s:instance/%s", region, rec.Values[2].(string), rec.Values[1].(string))),
			},
		}, nil
	}
	return nil, fmt.Errorf("not aws")
}

func (a AwsSecurityHub) mapPayloadToFindings(msg []map[string]interface{}, resource []*securityhub.Resource, accountID string) *securityhub.BatchImportFindingsInput {
	findings := securityhub.BatchImportFindingsInput{}
	if a.Resource == utils.ScanTypeDetectedNode[utils.NEO4JVulnerabilityScan] {
		for _, m := range msg {
			accID, found := m["cloud_account_id"]
			if !found {
				accID = accountID
			}
			if !utils.InSlice(accID.(string), a.Config.AWSAccountID) {
				fmt.Println("Skipping result as not in list of selected account IDs:", accID)
				continue
			}
			finding := securityhub.AwsSecurityFinding{}

			var pkgName, pkgVersion string
			pkgNameWithVersion, ok := m["cve_caused_by_package"].(string)
			if ok {
				packageSplit := strings.Split(pkgNameWithVersion, ":")
				if len(packageSplit) > 1 {
					pkgName = packageSplit[0]
					pkgVersion = packageSplit[1]
				}
			}
			updatedAt, ok := m["updated_at"].(int64)
			if !ok {
				updatedAt = time.Now().Unix()
			}
			updatedAtStr := time.Unix(updatedAt, 0).Format(time.RFC3339)

			cvssScore, ok := m["cve_cvss_score"].(float64)
			if !ok {
				cvssScore = 0.0
			}
			cvssScoreStr := fmt.Sprintf("%f", cvssScore)

			cveLinks, ok := m["urls"].([]string)
			if !ok || len(cveLinks) == 0 {
				cveLinks = []string{}
			}

			cveSeverity, ok := m["cve_severity"].(string)
			if !ok || cveSeverity == "" || cveSeverity == "unknown" {
				cveSeverity = "not available"
			}

			cveDescription, ok := m["cve_description"].(string)
			if !ok || cveDescription == "" {
				cveDescription = "not available"
			}

			// cveDescription should not be more than 1024 characters: not allowed by aws security hub
			if len(cveDescription) > 1024 {
				cveDescription = cveDescription[:1024]
			}

			finding.SetProductArn(fmt.Sprintf("arn:aws:securityhub:%s:%s:product/%s/default", a.Config.AWSRegion, accID.(string), accID.(string)))
			finding.SetAwsAccountId(accID.(string))
			finding.SetCreatedAt(updatedAtStr)
			finding.SetUpdatedAt(updatedAtStr)
			finding.SetTitle(m["cve_id"].(string))
			finding.SetDescription(cveDescription)
			finding.SetGeneratorId("deepfence-vulnerability-mapper-v2-0")
			finding.SetId(fmt.Sprintf("%s/%s/%s", a.Config.AWSRegion, a.Config.AWSAccountID, m["cve_id"].(string)))
			finding.SetResources(resource)
			finding.SetSchemaVersion("2018-10-08")
			finding.SetSeverity(&securityhub.Severity{
				Label:    aws.String(strings.ToUpper(cveSeverity)),
				Original: aws.String(cvssScoreStr),
			})
			finding.SetTypes([]*string{aws.String("Software and Configuration Checks/Vulnerabilities/CVE")})
			finding.SetVulnerabilities([]*securityhub.Vulnerability{
				{
					Id:            aws.String(m["cve_id"].(string)),
					ReferenceUrls: aws.StringSlice(cveLinks),
					VulnerablePackages: []*securityhub.SoftwarePackage{
						{
							Name:    aws.String(pkgName),
							Version: aws.String(pkgVersion),
						},
					},
				}})
			findings.SetFindings(append(findings.Findings, &finding))
		}
	} else if a.Resource == utils.ScanTypeDetectedNode[utils.NEO4JComplianceScan] {
		for _, m := range msg {
			accID, found := m["cloud_account_id"]
			if !found {
				accID = accountID
			}
			if !utils.InSlice(accID.(string), a.Config.AWSAccountID) {
				fmt.Println("Skipping result as not in list of selected account IDs:", accID)
				continue
			}
			finding := securityhub.AwsSecurityFinding{}

			updatedAt, ok := m["updated_at"].(int64)
			if !ok {
				updatedAt = time.Now().Unix()
			}
			updatedAtStr := time.Unix(updatedAt, 0).Format(time.RFC3339)

			testSev, ok := m["test_severity"].(string)
			if !ok {
				testSev = "not available"
			}

			compSev, ok := m["status"].(string)
			if !ok || compSev == "" || compSev == "unknown" {
				compSev = "not available"
			}

			compDescription, ok := m["description"].(string)
			if !ok || compDescription == "" {
				compDescription = "not available"
			}

			// compDescription should not be more than 1024 characters: not allowed by aws security hub
			if len(compDescription) > 1024 {
				compDescription = compDescription[:1024]
			}

			finding.SetProductArn(fmt.Sprintf("arn:aws:securityhub:%s:%s:product/%s/default", a.Config.AWSRegion, accID.(string), accID.(string)))
			finding.SetAwsAccountId(accID.(string))
			finding.SetCreatedAt(updatedAtStr)
			finding.SetUpdatedAt(updatedAtStr)
			finding.SetTitle(m["test_category"].(string))
			finding.SetDescription(compDescription)
			finding.SetGeneratorId("deepfence-compliance-v2-0")
			finding.SetId(fmt.Sprintf("%s/%s/%s", a.Config.AWSRegion, a.Config.AWSAccountID, m["node_id"].(string)))
			finding.SetResources(resource)
			finding.SetSchemaVersion("2018-10-08")
			finding.SetSeverity(&securityhub.Severity{
				Label:    aws.String(strings.ToUpper(compSev)),
				Original: aws.String(testSev),
			})
			finding.SetTypes([]*string{aws.String(compAsff[m["compliance_check_type	"].(string)])})
			finding.SetCompliance(&securityhub.Compliance{
				Status: aws.String(compStatusAsff[m["status"].(string)]),
			})
			findings.SetFindings(append(findings.Findings, &finding))
		}
	}
	return &findings
}

// todo
func (a AwsSecurityHub) IsValidCredential(ctx context.Context) (bool, error) {
	return true, nil
}
