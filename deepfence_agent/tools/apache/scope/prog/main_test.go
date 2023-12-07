package main

import (
	"flag"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLogCensoredArgs(t *testing.T) {
	setupFlags(&flags{})
	args := []string{
		"-probe.token=secret",
		"-service-token=secret",
		"-probe.kubernetes.password=secret",
		"-probe.kubernetes.token=secret",
		"http://secret:secret@frontend.dev.weave.works:80",
		"https://secret:secret@cloud.weave.works:443",
		"https://secret@cloud.weave.works",
	}
	flag.CommandLine.Parse(args)

	msg := getCensoredArgs()
	assert.NotContains(t, msg, "secret")
	assert.Contains(t, msg, "cloud.weave.works:443")
}
