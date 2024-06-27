package errors

import (
	"errors"
	"net"
	"net/http"
	"syscall"
)

type HTTPError struct {
	StatusCode int
	Message    string
}

func NewHTTPError(code int, message string) *HTTPError {
	return &HTTPError{StatusCode: code, Message: message}
}

func (he *HTTPError) Error() string {
	return he.Message
}

func CheckResponseCode(resp *http.Response, code int) error {
	if resp.StatusCode != code {
		return NewHTTPError(resp.StatusCode, resp.Status)
	}
	return nil
}

func CheckHTTPError(err error) error {

	if errors.Is(err, syscall.ECONNREFUSED) {
		return NewHTTPError(0, "Connection Refused")
	}
	if netError, ok := err.(net.Error); ok && netError.Timeout() {
		return NewHTTPError(0, "Connection Timeout")
	}

	return nil
}
