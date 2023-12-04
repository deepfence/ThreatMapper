package model

import (
	"strings"
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
