package handler

import (
	"errors"
	"io"
	"net/http"
	"path"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/minio/minio-go/v7"
)

func (h *Handler) UploadVulnerabilityDB(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()

	if err := r.ParseMultipartForm(1024 * 1024); err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	file, fileHeader, err := r.FormFile("database")
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	defer file.Close()

	log.Info().Msgf("uploaded file content type %s", fileHeader.Header.Get("Content-Type"))
	if (fileHeader.Header.Get("Content-Type")) != "application/gzip" {
		respondError(&BadDecoding{errors.New("files should be of kind .tar.gz ")}, w)
		return
	}

	fb, err := io.ReadAll(file)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}

	mc, err := directory.MinioClient(r.Context())
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}

	dbFile := path.Join("database", "vulnerability", fileHeader.Filename)
	info, err := mc.UploadFile(r.Context(), dbFile, fb, minio.PutObjectOptions{})
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: info.Key})
}
