package df_error

import "errors"

var (
	ErrTooManyRequests = errors.New("too many requests")
)
