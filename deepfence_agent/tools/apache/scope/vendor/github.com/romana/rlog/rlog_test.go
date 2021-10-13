// Copyright (c) 2016 Pani Networks
// All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

package rlog

import (
	"bufio"
	"fmt"
	"os"
	"path"
	"runtime"
	"strconv"
	"testing"
	"time"
)

var logfile string

// These two flags are used to quickly change behaviour of our tests, so that
// we can manually check and test things during development of those tests.
// The settings here reflect the correct behaviour for normal test runs.
var removeLogfile = true
var fixedLogfileName = false

// setup is called at the start of each test and prepares a new log file. It
// also returns a new configuration, as it may have been supplied by the user
// in environment variables, which can be used by this test.
func setup() rlogConfig {
	if fixedLogfileName {
		logfile = "/tmp/rlog-test.log"
	} else {
		logfile = fmt.Sprintf("/tmp/rlog-test-%d.log", time.Now().UnixNano())
	}

	// If there's a logfile with that name already, remove it so that our tests
	// always start from scratch.
	os.Remove(logfile)

	// Provide a default config, which can be used or modified by the tests
	return rlogConfig{
		logLevel:       "",
		traceLevel:     "",
		logTimeFormat:  "",
		confFile:       "",
		logFile:        logfile,
		logStream:      "NONE",
		logNoTime:      "true",
		showCallerInfo: "false",
	}
}

// cleanup is called at the end of each test.
func cleanup() {
	if removeLogfile {
		os.Remove(logfile)
	}
}

// fileMatch compares entries in the logfile with expected entries provided as
// a list of strings (one for each line). If a timeLayout string is provided
// then we will assume the first part of the line is a timestamp, which we will
// check to see if it's correctly formatted according to the specified time
// layout.
func fileMatch(t *testing.T, checkLines []string, timeLayout string) {
	// We need to know how many characters at the start of the line we should
	// assume to belong to the time stamp. The formatted time stamp can
	// actually be of different length than the time layout string, because
	// actual timezone names can have more characters than the TZ specified in
	// the layout. So we create the current time in the specified layout, which
	// should be very similar to the timestamps in the log lines.
	currentSampleTimestamp := time.Now().Format(timeLayout)
	timeStampLen := len(currentSampleTimestamp)

	// Scan over the logfile, line by line and compare to the lines provided in
	// checkLines.
	file, err := os.Open(logfile)
	if err != nil {
		t.Fatal(err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	i := 0
	for scanner.Scan() {
		line := scanner.Text()
		// Process and strip off the time stamp at the start, if a time layout
		// string was provided.
		if timeLayout != "" {
			dateTime := line[:timeStampLen]
			line = line[timeStampLen+1:]
			_, err := time.Parse(timeLayout, dateTime)
			if err != nil {
				t.Fatalf("Incorrect date/time format.\nSHOULD: %s\nIS:     %s\n", timeLayout, dateTime)
			}
		}
		t.Logf("\n-- fileMatch: SHOULD %s\n              IS     %s\n",
			checkLines[i], line)
		if i >= len(checkLines) {
			t.Fatal("Not enough lines provided in checkLines.")
		}
		if line != checkLines[i] {
			t.Fatalf("Log line %d does not match check line.\nSHOULD: %s\nIS:     %s\n", i, checkLines[i], line)
		}
		i++
	}
	if len(checkLines) > i {
		t.Fatalf("Only %d of %d checklines found in output file.", i, len(checkLines))
	}
	if i == 0 {
		t.Fatal("No input scanned")
	}
}

// ---------- Tests -----------

// TestLogLevels performs some basic tests for each known log level.
func TestLogLevels(t *testing.T) {
	conf := setup()
	defer cleanup()

	conf.logLevel = "DEBUG"
	initialize(conf, true) // re-initialize the environment variable config

	Debug("Test Debug")
	Info("Test Info")
	Warn("Test Warning")
	Error("Test Error")
	Critical("Test Critical")

	checkLines := []string{
		"DEBUG    : Test Debug",
		"INFO     : Test Info",
		"WARN     : Test Warning",
		"ERROR    : Test Error",
		"CRITICAL : Test Critical",
	}
	fileMatch(t, checkLines, "")
}

// TestLogLevelsLimited checks that we can limit the output of log and trace
// messages that don't meed the minimum configured logging levels.
func TestLogLevelsLimited(t *testing.T) {
	conf := setup()
	defer cleanup()

	conf.logLevel = "WARN"
	conf.traceLevel = "3"
	initialize(conf, true)

	Debug("Test Debug")
	Info("Test Info")
	Warn("Test Warning")
	Error("Test Error")
	Critical("Test Critical")
	Trace(1, "Trace 1")
	Trace(2, "Trace 2")
	Trace(3, "Trace 3")
	Trace(4, "Trace 4")
	checkLines := []string{
		"WARN     : Test Warning",
		"ERROR    : Test Error",
		"CRITICAL : Test Critical",
		"TRACE(1) : Trace 1",
		"TRACE(2) : Trace 2",
		"TRACE(3) : Trace 3",
	}
	fileMatch(t, checkLines, "")
}

// TestLogFormatted checks whether the *f functions for formatted output work
// as expected.
func TestLogFormatted(t *testing.T) {
	conf := setup()
	defer cleanup()

	conf.logLevel = "DEBUG"
	conf.traceLevel = "1"
	initialize(conf, true)

	Debugf("Test Debug %d", 123)
	Infof("Test Info %d", 123)
	Warnf("Test Warning %d", 123)
	Errorf("Test Error %d", 123)
	Criticalf("Test Critical %d", 123)
	Tracef(1, "Trace 1 %d", 123)
	Tracef(2, "Trace 2 %d", 123)
	checkLines := []string{
		"DEBUG    : Test Debug 123",
		"INFO     : Test Info 123",
		"WARN     : Test Warning 123",
		"ERROR    : Test Error 123",
		"CRITICAL : Test Critical 123",
		"TRACE(1) : Trace 1 123",
	}
	fileMatch(t, checkLines, "")
}

// TestLogTimestamp checks that the time stamp format can be changed and that
// we indeed get a properly formatted timestamp output.
func TestLogTimestamp(t *testing.T) {
	conf := setup()
	conf.logNoTime = "false"
	defer cleanup()

	checkLines := []string{
		"INFO     : Test Info",
	}

	// Map of various 'user specified' time layouts and the actual time layout
	// to which they should be mapped. Some of the capitalization in the well
	// known time stamps is off, to show that those names can be specified in a
	// case insensitive manner.
	checkTimeStamps := map[string]string{
		"ansIC":    time.ANSIC,
		"UNIXDATE": time.UnixDate,
		"rubydate": time.RubyDate,
		"rfc822":   time.RFC822,
		"rfc822z":  time.RFC822Z,
		"rfc1123":  time.RFC1123,
		"rfc1123z": time.RFC1123Z,
		"RFC3339":  time.RFC3339,
		//"RFC3339Nano": time.RFC3339Nano,  // Not included in the tests, since
		// output length can vary depending on whether there are trailing zeros.
		// Not worth the trouble.
		"Kitchen": time.Kitchen,
		"":        time.RFC3339, // If nothing specified, default is RFC3339
		"2006/01/02 15:04:05": "2006/01/02 15:04:05", // custom format
	}

	for tsUserSpecified, tsActualFormat := range checkTimeStamps {
		os.Remove(logfile)

		// Specify a time layout...
		conf.logTimeFormat = tsUserSpecified
		initialize(conf, true)

		Info("Test Info")
		// We can specify a time layout to fileMatch, which then performs the extra
		// check for the correctly formatted time stamp.
		fileMatch(t, checkLines, tsActualFormat)
	}
}

// TestLogCallerInfo manually figures out the caller info, which should be
// displayed by rlog. The code that's creating the expected caller info
// within the test is pretty much exactly the code that should be at work
// within rlog.
func TestLogCallerInfo(t *testing.T) {
	conf := setup()
	defer cleanup()

	conf.showCallerInfo = "true"
	initialize(conf, true)

	Info("Test Info")
	pc, fullFilePath, line, _ := runtime.Caller(0)
	line-- // The log was called in the line before, so... -1

	// The following lines simply format the caller info in the way that it
	// should be formatted by rlog
	callingFuncName := runtime.FuncForPC(pc).Name()
	dirPath, fileName := path.Split(fullFilePath)
	var moduleName string
	if dirPath != "" {
		dirPath = dirPath[:len(dirPath)-1]
		_, moduleName = path.Split(dirPath)
	}
	moduleAndFileName := moduleName + "/" + fileName

	shouldLine := fmt.Sprintf("INFO     : [%d %s:%d (%s)] Test Info",
		os.Getpid(), moduleAndFileName, line, callingFuncName)

	checkLines := []string{shouldLine}
	fileMatch(t, checkLines, "")
}

// TestLogLevelsFiltered checks whether the per-module filtering works
// correctly. For that, we provide a log-level filter that names this
// executable here, so that log messages should be displayed, and a trace level
// filter for a non-existent module, so that trace messages should not be
// displayed.
func TestLogLevelsFiltered(t *testing.T) {
	conf := setup()
	defer cleanup()

	conf.logLevel = "rlog_test.go=WARN"
	conf.traceLevel = "foobar.go=2" // should not see any of those
	initialize(conf, true)

	Debug("Test Debug")
	Info("Test Info")
	Warn("Test Warning")
	Error("Test Error")
	Critical("Test Critical")
	Trace(1, "Trace 1")
	Trace(2, "Trace 2")
	Trace(3, "Trace 3")
	Trace(4, "Trace 4")
	checkLines := []string{
		"WARN     : Test Warning",
		"ERROR    : Test Error",
		"CRITICAL : Test Critical",
	}
	fileMatch(t, checkLines, "")
}

// writeLogfile is a small utility function for the creation of unique config
// files for these tests.
func writeLogfile(lines []string) string {
	confFile := fmt.Sprintf("/tmp/rlog-test-%d.conf", time.Now().UnixNano())
	cf, _ := os.Create(confFile)
	defer cf.Close()
	for _, l := range lines {
		cf.WriteString(l + "\n")
	}
	return confFile
}

// checkLogFilter simplifies the checking of correct log levels in the tests.
func checkLogFilter(t *testing.T, shouldPattern string, shouldLevel int) {
	f := logFilterSpec.filters[0]
	if f.Pattern != shouldPattern || f.Level != shouldLevel {
		t.Fatalf("Incorrect default filter '%s' / %d. Should be: '%s' / %d",
			f.Pattern, f.Level, shouldPattern, shouldLevel)
	}
}

// TestConfFile tests the reading of an rlog config file and the proper
// processing of settings from a config file.
func TestConfFile(t *testing.T) {
	conf := setup()
	defer cleanup()

	// Set the default configuration and check how this is reflected in the
	// internal settings variables.
	initialize(conf, true)

	checkLogFilter(t, "", levelInfo)
	t.Log("trace filter = ", traceFilterSpec)
	if len(traceFilterSpec.filters) > 0 {
		t.Fatal("Incorrect trace filters: ", traceFilterSpec.filters)
	}

	conf.confFile = writeLogfile([]string{"RLOG_LOG_LEVEL=DEBUG"})
	defer os.Remove(conf.confFile)
	initialize(conf, true)
	// No explicit log level was set in the initial, default config. Therefore,
	// the conf file value should have overwritten that.
	checkLogFilter(t, "", levelDebug)

	// Now we test with an initial config, which contains an explicit value for
	// the log level. The INFO value should remain.
	conf.logLevel = "INFO"
	initialize(conf, true)
	checkLogFilter(t, "", levelInfo)

	// Now we test the 'override' option (start the config in the conf file
	// with a '!'). With that, the conf file takes precedence.
	conf.confFile = writeLogfile([]string{"!RLOG_LOG_LEVEL=DEBUG"})
	defer os.Remove(conf.confFile)
	initialize(conf, true)
	checkLogFilter(t, "", levelDebug)

	// Test that a full filter spec can be read from logfile and also test that
	// space trimming worked correctly.
	conf.confFile = writeLogfile([]string{
		"  !RLOG_LOG_LEVEL = foo.go=DEBUG   ",
	})
	defer os.Remove(conf.confFile)
	initialize(conf, true)
	checkLogFilter(t, "foo.go", levelDebug)
}

// TestRaceConditions stress tests thread safety of rlog. Useful when running
// with the race detector flag (--race).
func TestRaceConditions(t *testing.T) {
	conf := setup()
	defer cleanup()

	for i := 0; i < 1000; i++ {
		go func(conf rlogConfig, i int) {
			for j := 0; j < 100; j++ {
				// Change behaviour and config around a little
				if j%2 == 0 {
					conf.showCallerInfo = "true"
				}
				conf.traceLevel = strconv.Itoa(j%10 - 1) // sometimes this will be -1
				//initialize(conf, j%3 == 0)
				initialize(conf, false)
				Debug("Test Debug")
				Info("Test Info")
				Trace(1, "Some trace")
				Trace(2, "Some trace")
				Trace(3, "Some trace")
				Trace(4, "Some trace")
			}
		}(conf, i)
	}
}
