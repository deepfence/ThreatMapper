package model

import (
	"strings"
)

func DigestToID(digest string) (string, string) {
	imageID := strings.TrimPrefix(digest, "sha256:")
	return imageID, imageID[:12]
}

func GetRegistryID(registryType, ns string) string {
	return registryType + "_" + EscapeSlashToUnderscore(ns)
}

func EscapeSlashToUnderscore(s string) string {
	return strings.ReplaceAll(s, "/", "_")
}
