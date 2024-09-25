package log

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

type LogErrorWriter struct{}

func (LogErrorWriter) Write(b []byte) (int, error) {
	if len(b) == 0 {
		return 0, nil
	}
	log.Error().CallerSkipFrame(3).Msg(strings.TrimSpace(string(b)))
	return len(b), nil
}

type LogInfoWriter struct{}

func (LogInfoWriter) Write(b []byte) (int, error) {
	if len(b) == 0 {
		return 0, nil
	}
	log.Info().CallerSkipFrame(3).Msg(strings.TrimSpace(string(b)))
	return len(b), nil
}

func init() {
	log.Logger = log.Output(
		zerolog.ConsoleWriter{
			Out:        os.Stderr,
			TimeFormat: time.RFC1123Z,
			FormatCaller: func(i interface{}) string {
				return filepath.Join(
					filepath.Base(filepath.Dir(fmt.Sprintf("%s", i))),
					filepath.Base(fmt.Sprintf("%s", i)),
				)
			},
			FormatMessage:       formatRedact,
			FormatFieldValue:    formatRedact,
			FormatErrFieldValue: formatRedact,
		},
	).With().Caller().Logger().Hook(NamespaceHook{})
}

// redact sensitive contents from all log fields and message
var (
	sensitiveContents = []string{
		os.Getenv("DEEPFENCE_REDIS_PASSWORD"),
		os.Getenv("DEEPFENCE_FILE_SERVER_PASSWORD"),
		os.Getenv("DEEPFENCE_POSTGRES_USER_DB_PASSWORD"),
		os.Getenv("DEEPFENCE_NEO4J_PASSWORD"),
	}
	REDACTED = "[REDACTED]"
)

func formatRedact(i interface{}) string {

	redacted, ok := i.(string)
	if !ok {
		redacted = fmt.Sprintf("%s", i)
	}

	for _, s := range sensitiveContents {
		if len(s) > 0 {
			redacted = strings.ReplaceAll(redacted, s, REDACTED)
		}
	}

	return redacted
}

// namesapce hook adds tenant namespace in saas mode
type NamespaceHook struct{}

func (h NamespaceHook) Run(e *zerolog.Event, level zerolog.Level, msg string) {
	if ns := e.GetCtx().Value("namespace"); ns != nil {
		e.Any("namespace", ns)
	}
}

func Initialize(logLevel string) error {
	level, err := zerolog.ParseLevel(logLevel)

	if err != nil {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	} else {
		zerolog.SetGlobalLevel(level)
	}

	return err
}

func Trace() *zerolog.Event {
	return log.Logger.Trace()
}

func Debug() *zerolog.Event {
	return log.Logger.Debug()
}

func Info() *zerolog.Event {
	return log.Logger.Info()
}

func Warn() *zerolog.Event {
	return log.Logger.Warn()
}

func Error() *zerolog.Event {
	return log.Logger.Error()
}

func Fatal() *zerolog.Event {
	return log.Logger.Fatal()
}

func Panic() *zerolog.Event {
	return log.Logger.Panic()
}

func WithCtx(ctx context.Context) zerolog.Logger {
	return log.With().Ctx(ctx).Logger()
}
