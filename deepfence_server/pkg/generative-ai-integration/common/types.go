package common

const (
	cloudPostureRemediationQuery      = "%s remediation script for %s %s control %s"
	linuxPostureRemediationQuery      = "%s remediation script for %s control %s %s"
	kubernetesPostureRemediationQuery = "%s remediation script for %s control %s"
	vulnerabilityRemediationQuery     = "%s remediation script for vulnerability %s %s"
	secretRemediationQuery            = "how to remove secret %s"
	malwareRemediationQuery           = "remediation for malware %s (%s)"

	RemediationFormatAll = "all"
)

func GetRemediationFormat(remediationFormat string) string {
	if remediationFormat == RemediationFormatAll {
		return ""
	}
	return remediationFormat
}
