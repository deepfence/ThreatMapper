package log

import (
	"io"
	stdlog "log"
	"strings"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

type adapter struct {
	level zerolog.Level
}

// NewStdLoggerWithLevel will return an instance of *log.Logger
// where all messages will have the specified level
func NewStdLoggerWithLevel(level zerolog.Level) *stdlog.Logger {
	return stdlog.New(adapter{level}, "", 0)
}

// NewStdLogger will return an instance of io.Writer
// where all messages will have the specified level
func NewIOWriter(level zerolog.Level) io.Writer {
	return adapter{level}
}

func (a adapter) Write(p []byte) (int, error) {
	return a.WriteLevel(a.level, p)
}

func (a adapter) WriteLevel(level zerolog.Level, p []byte) (int, error) {
	n := len(p)
	if n <= 0 {
		return 0, nil
	}
	log.Logger.WithLevel(level).CallerSkipFrame(2).Msg(strings.TrimSpace(string(p)))
	return n, nil
}
