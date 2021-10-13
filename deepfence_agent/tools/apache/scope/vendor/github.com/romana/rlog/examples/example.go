package main

//import "time"
import "os"
import "github.com/romana/rlog"

func someRecursiveFunction(x int) {
	// The Trace log functions allow you to set a log level with a numeric
	// level, which could be determined at run time. Here, we are tracing or
	// logging the first few levels of the recursive function (to whatever
	// levels was determined via the RLOG_TRACE_LEVEL variable), but after that
	// will stop logging, even though the function itself may decend further.
	rlog.Tracef(x, "We're %d levels down now...", x)
	if x < 10 {
		someRecursiveFunction(x + 1)
	} else {
		rlog.Infof("Reached end of recursion at level %d", x)
	}
}

func main() {
	// Show different log levels
	rlog.Info("Start of program")
	rlog.Info("rlog is controlled via environment variables.")
	rlog.Info("Try the following settings:")
	rlog.Info("   export RLOG_LOG_LEVEL=DEBUG")
	rlog.Info("   export RLOG_TRACE_LEVEL=5")
	rlog.Info("   export RLOG_CALLER_INFO=yes")
	rlog.Debug("You only see this if you did 'export RLOG_LOG_LEVEL=DEBUG'")
	rlog.Infof("Format %s are possible %d", "strings", 123)
	rlog.Warn("Warning level log message")
	rlog.Error("Error level log message")
	rlog.Critical("Critical level log message")

	// Example of how to change settings programmatically from within
	// the running program: Modify your own environment variables.
	// Note that if the config file specifies the value with a '!' then
	// this value cannot be changed by modifying the environment variable.
	rlog.Debug("You can't see this if the log level is higher than DEBUG.")
	os.Setenv("RLOG_LOG_LEVEL", "DEBUG")
	rlog.UpdateEnv()
	rlog.Debug("You can see this message, because we changed level to DEBUG.")

	// Example of selective trace logging
	rlog.Trace(1, "Trace messages have their own numeric levels")
	rlog.Trace(1, "To see them set RLOG_TRACE_LEVEL to the cut-off number")
	someRecursiveFunction(1)

	// Example of redirecting log output to a new file at runtime
	newLogFile, err := os.OpenFile("/tmp/rlog-output.log", os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0777)
	if err == nil {
		rlog.Info("About to change log output. Check /tmp/rlog-output.log...")
		rlog.SetOutput(newLogFile)
		rlog.Info("This should go to the new logfile")
	}

	// Now redirecting it back to stderr. Any additional file logging will be
	// closed with this call.
	rlog.SetOutput(os.Stderr)

	rlog.Info("Back to stderr")

	// To test out changing the log configuration of a running process, set the
	// RLOG_CONF_FILE environment variable to an absolute path for a
	// configuration file that you can create and edit. Also, you might want to
	// set RLOG_CONF_CHECK_INTERVAL to a smaller number, so you don't have to
	// wait 15 seconds every time you change a setting.
	// Then uncomment the loop below (and the 'time' import at the top) and run
	// the example program.

	/*
		rlog.SetConfFile("some-other-rlog.conf")

		for {
			time.Sleep(time.Second * 1)
			rlog.Debug("A debug log message")
			rlog.Info("An info log message")
		}
	*/
}
