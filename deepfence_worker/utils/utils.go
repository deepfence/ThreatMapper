package utils

import (
	"bytes"
	"errors"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
)

var ReportRetentionTime = 24 * time.Hour

func TimeRangeFilter(key string, start, end time.Time) []reporters.CompareFilter {
	return []reporters.CompareFilter{
		{
			FieldName:   key,
			FieldValue:  strconv.FormatInt(start.UnixMilli(), 10),
			GreaterThan: true,
		},
		{
			FieldName:   key,
			FieldValue:  strconv.FormatInt(end.UnixMilli(), 10),
			GreaterThan: false,
		},
	}
}

// used to replace http:// or https:// from registry url
var httpReplacer = strings.NewReplacer(
	"http://", "",
	"https://", "",
)

func RunCommand(cmd *exec.Cmd) (*bytes.Buffer, error) {
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	errorOnRun := cmd.Run()
	if errorOnRun != nil {
		return nil, errors.New(fmt.Sprint(errorOnRun) + ": " + stderr.String())
	}
	return &out, nil
}
