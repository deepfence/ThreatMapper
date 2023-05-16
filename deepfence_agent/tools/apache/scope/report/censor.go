package report

import (
	"strings"
)

// CensorConfig describes how probe reports should
// be censored when rendered through the API.
type CensorConfig struct {
	HideCommandLineArguments bool
	HideEnvironmentVariables bool
}

// StripCommandArgs removes all the arguments from the command
func StripCommandArgs(command string) string {
	return strings.Split(command, " ")[0]
}
