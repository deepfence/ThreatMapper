package model

import (
	"fmt"
	"strings"
)

var (
	registryNamespaceReplacer = strings.NewReplacer("/", "_", ":", "_", "+", "_")
)

func DigestToID(digest string) (string, string) {
	imageID := strings.TrimPrefix(digest, "sha256:")
	var shortImageID string
	if len(imageID) > 12 {
		shortImageID = imageID[:12]
	} else {
		shortImageID = imageID
	}
	return imageID, shortImageID
}

func GetRegistryID(registryType, ns string, pgID int32) string {
	return fmt.Sprintf("%s-%s-%d", registryType, EscapeSpecialCharToUnderscore(ns), pgID)
}

func EscapeSpecialCharToUnderscore(s string) string {
	return registryNamespaceReplacer.Replace(s)
}
