package utils

import "net/mail"

func ValidateEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}
