package threatintel

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/VirusTotal/gyp"
)

type Artefact struct {
	Name    string `json:"name"`
	Type    string `json:"type"`
	Content []byte `json:"content"`
}

type DeepfenceRule struct {
	RuleID      string `json:"rule_id"`
	Type        string `json:"type"`
	Payload     string `json:"payload"`
	Severity    string `json:"severity"`
	Description string `json:"description"`
}

type TracerFeeds struct {
	NetworkRules      []DeepfenceRule `json:"network_rules"`
	FilesystemRules   []DeepfenceRule `json:"filesystem_rules"`
	ProcessRules      []DeepfenceRule `json:"process_rules"`
	ExternalArtefacts []Artefact      `json:"external_artefacts"`
}

type ScannerFeeds struct {
	VulnerabilityRules   []DeepfenceRule `json:"vulnerability_rules"`
	SecretRules          []DeepfenceRule `json:"secret_rules"`
	MalwareRules         []DeepfenceRule `json:"malware_rules"`
	ComplianceRules      []DeepfenceRule `json:"compliance_rules"`
	CloudComplianceRules []DeepfenceRule `json:"cloud_compliance_rules"`
}

type FeedsBundle struct {
	Version      string       `json:"version"`
	CreatedAt    int64        `json:"created_at"`
	ScannerFeeds ScannerFeeds `json:"scanner_feeds"`
	TracerFeeds  TracerFeeds  `json:"tracer_feeds"`
	Extra        []string     `json:"extra"`
}

func NewFeeds(createdAt int64, version string) *FeedsBundle {
	return &FeedsBundle{
		Version:   version,
		CreatedAt: createdAt,
	}
}

func (fb *FeedsBundle) RemoveAllTypeNetworkRules(t string) {
	remaining := []DeepfenceRule{}
	for _, rule := range fb.TracerFeeds.NetworkRules {
		if rule.Type != t {
			remaining = append(remaining, rule)
		}
	}
	fb.TracerFeeds.NetworkRules = remaining
}

func (fb *FeedsBundle) AddNetworkRules(df ...DeepfenceRule) {
	fb.TracerFeeds.NetworkRules = append(fb.TracerFeeds.NetworkRules, df...)
}

func (fb *FeedsBundle) AddFilesystemRules(df []DeepfenceRule) {
	fb.TracerFeeds.FilesystemRules = append(fb.TracerFeeds.FilesystemRules, df...)
}

func (fb *FeedsBundle) AddProcessRules(df []DeepfenceRule) {
	fb.TracerFeeds.ProcessRules = append(fb.TracerFeeds.ProcessRules, df...)
}

func (fb *FeedsBundle) AddTracerArtefacts(df []Artefact) {
	fb.TracerFeeds.ExternalArtefacts = append(fb.TracerFeeds.ExternalArtefacts, df...)
}

func (fb *FeedsBundle) AddVulnerabilityRules(df []DeepfenceRule) {
	fb.ScannerFeeds.VulnerabilityRules = append(fb.ScannerFeeds.VulnerabilityRules, df...)
}

func (fb *FeedsBundle) AddSecretRules(df []DeepfenceRule) {
	fb.ScannerFeeds.SecretRules = append(fb.ScannerFeeds.SecretRules, df...)
}

func (fb *FeedsBundle) AddMalwareRules(df []DeepfenceRule) {
	fb.ScannerFeeds.MalwareRules = append(fb.ScannerFeeds.MalwareRules, df...)
}

func (fb *FeedsBundle) AddComplianceRules(df []DeepfenceRule) {
	fb.ScannerFeeds.ComplianceRules = append(fb.ScannerFeeds.ComplianceRules, df...)
}

func (fb *FeedsBundle) AddCloudComplianceRules(df []DeepfenceRule) {
	fb.ScannerFeeds.CloudComplianceRules = append(fb.ScannerFeeds.CloudComplianceRules, df...)
}

func ExtractDFRules2NativeRules(inpath, outdir string) error {
	var feeds FeedsBundle
	inFile, err := os.OpenFile(inpath, os.O_RDONLY, fs.ModePerm)
	if err != nil {
		return err
	}
	defer inFile.Close()

	dec := json.NewDecoder(inFile)
	err = dec.Decode(&feeds)
	if err != nil {
		return err
	}

	if len(feeds.ScannerFeeds.MalwareRules) > 0 {
		ExportYaraRules(outdir, feeds.ScannerFeeds.MalwareRules, feeds.Extra)
	}
	if len(feeds.ScannerFeeds.SecretRules) > 0 {
		ExportYaraRules(outdir, feeds.ScannerFeeds.SecretRules, feeds.Extra)
	}

	return nil
}

func groupType2filenames(rules []DeepfenceRule) map[string][]DeepfenceRule {
	res := map[string][]DeepfenceRule{}
	for i := range rules {
		index := strings.Index(rules[i].Type, "-")
		filename := rules[i].Type
		if index != -1 {
			filename = rules[i].Type[index+1:]
		}

		switch {
		case strings.HasPrefix(rules[i].Type, "suricata"):
			filename += ".rules"
		case strings.HasPrefix(rules[i].Type, "modsec"):
			filename += ".conf"
		case strings.Contains(rules[i].Type, "secret"):
			filename += ".secret.yar"
		case strings.Contains(rules[i].Type, "malware"):
			filename += ".malware.yar"
		}
		res[filename] = append(res[filename], rules[i])
	}
	return res
}

func ExportYaraRules(outDir string, rules []DeepfenceRule, extra []string) {
	ruleGroups := groupType2filenames(rules)

	for k, groupRules := range ruleGroups {
		file, err := os.OpenFile(filepath.Join(outDir, k), os.O_CREATE|os.O_WRONLY|os.O_TRUNC, fs.ModePerm)
		if err != nil {
			log.Printf("failed to open file: %s, skipping", err)
			continue
		}
		defer file.Close()
		for i := range extra {
			file.WriteString(fmt.Sprintf("import \"%s\"\n", extra[i]))
		}
		for _, rule := range groupRules {
			decoded, err := base64.StdEncoding.DecodeString(rule.Payload)
			if err != nil {
				fmt.Printf("err on base 64: %v\n", err)
				continue
			}
			rs, err := gyp.ParseString(string(decoded))
			if err != nil {
				fmt.Printf("err on marshal: %v\n", err)
				continue
			}
			for _, r := range rs.Rules {
				r.WriteSource(file)
			}
		}
	}
}
