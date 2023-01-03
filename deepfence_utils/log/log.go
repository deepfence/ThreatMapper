package log

import (
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
	if len(b) <= 0 {
		return 0, nil
	}
	log.Error().CallerSkipFrame(3).Msg(strings.TrimSpace(string(b)))
	return len(b), nil
}

type LogInfoWriter struct{}

func (LogInfoWriter) Write(b []byte) (int, error) {
	if len(b) <= 0 {
		return 0, nil
	}
	log.Info().CallerSkipFrame(3).Msg(strings.TrimSpace(string(b)))
	return len(b), nil
}

type AsynqLogger struct{}

func (a AsynqLogger) Debug(args ...interface{}) {
	log.Debug().Msg(fmt.Sprint(args...))
}

func (a AsynqLogger) Info(args ...interface{}) {
	log.Info().Msg(fmt.Sprint(args...))
}

func (a AsynqLogger) Warn(args ...interface{}) {
	log.Warn().Msg(fmt.Sprint(args...))
}

func (a AsynqLogger) Error(args ...interface{}) {
	log.Error().Msg(fmt.Sprint(args...))
}

func (a AsynqLogger) Fatal(args ...interface{}) {
	log.Fatal().Msg(fmt.Sprint(args...))
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
		},
	).With().Caller().Logger()
}

func Initialize(log_level string) {

	switch log_level {
	case zerolog.LevelTraceValue:
		zerolog.SetGlobalLevel(zerolog.TraceLevel)
	case zerolog.LevelDebugValue:
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case zerolog.LevelInfoValue:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case zerolog.LevelWarnValue:
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case zerolog.LevelErrorValue:
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	case zerolog.LevelFatalValue:
		zerolog.SetGlobalLevel(zerolog.FatalLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
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
