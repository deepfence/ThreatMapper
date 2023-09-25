package utils

import (
	"fmt"
	"runtime/debug"

	"context"

	"github.com/hibiken/asynq"
	"github.com/pkg/errors"
)

type WorkerHandler func(ctx context.Context, t *asynq.Task) error

// RecoveredPanicError holds the recovered panic's error along with the stacktrace.
type RecoveredPanicError struct {
	V          interface{}
	Stacktrace string
}

func (p RecoveredPanicError) Error() string {
	return fmt.Sprintf("panic occurred: %#v, stacktrace: \n%s", p.V, p.Stacktrace)
}

// Recoverer recovers from any panic in the handler and appends RecoveredPanicError with the stacktrace
// to any error returned from the handler.
func Recoverer(h asynq.Handler) asynq.Handler {
	return asynq.HandlerFunc(func(ctx context.Context, task *asynq.Task) (err error) {
		defer func() {
			if r := recover(); r != nil {
				err = errors.WithStack(RecoveredPanicError{V: r, Stacktrace: string(debug.Stack())})
			}
		}()

		return h.ProcessTask(ctx, task)
	})
}
