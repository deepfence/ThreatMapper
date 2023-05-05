package model

import "mime/multipart"

type DBUploadRequest struct {
	Database multipart.File `formData:"database" json:"database" validate:"required,nospace" required:"true"`
}
