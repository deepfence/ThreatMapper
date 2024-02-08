package errors

import "errors"

var (
	ErrTooManyRequests = errors.New("too many requests")
)
