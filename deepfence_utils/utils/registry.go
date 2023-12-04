package utils

import (
	"fmt"
	"strings"
)

var (
	registryNamespaceReplacer = strings.NewReplacer("/", "_", ":", "_", "+", "_")
)

func GetRegistryID(registryType, ns string, pgID int32) string {
	return fmt.Sprintf("%s-%s-%d", registryType, EscapeSpecialCharToUnderscore(ns), pgID)
}

func EscapeSpecialCharToUnderscore(s string) string {
	return registryNamespaceReplacer.Replace(s)
}
