package handler

import (
	"bufio"
	"bytes"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/threatintel"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

var (
	contentTypeError = BadDecoding{errors.New("file should have extension .tar.gz")}
)

func (h *Handler) UploadVulnerabilityDB(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()

	ctx := r.Context()

	if err := r.ParseMultipartForm(1024 * 1024); err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	file, fileHeader, err := r.FormFile("database")
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	defer file.Close()

	log.Info().Msgf("uploaded file content type %s", fileHeader.Header.Get("Content-Type"))
	if fileHeader.Header.Get("Content-Type") != "application/gzip" && fileHeader.Header.Get("Content-Type") != "application/x-gzip" {
		h.respondError(&contentTypeError, w)
		return
	}

	var out bytes.Buffer
	_, err = io.Copy(bufio.NewWriter(&out), file)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}

	path, checksum, err := threatintel.UploadToMinio(ctx, out.Bytes(),
		threatintel.VulnerabilityDBStore, fileHeader.Filename)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(&BadDecoding{err}, w)
		return
	}

	if err := threatintel.VulnDBUpdateListing(ctx, path, checksum, time.Now()); err != nil {
		log.Error().Err(err).Msg("failed to update database listing")
		h.respondError(&BadDecoding{err}, w)
		return
	}

	_ = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: path + " " + checksum})
}

func (h *Handler) UploadSecretsRules(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()

	ctx := r.Context()

	if err := r.ParseMultipartForm(1024 * 1024); err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	file, fileHeader, err := r.FormFile("database")
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	defer file.Close()

	log.Info().Msgf("uploaded file content type %s", fileHeader.Header.Get("Content-Type"))
	if fileHeader.Header.Get("Content-Type") != "application/gzip" && fileHeader.Header.Get("Content-Type") != "application/x-gzip" {
		h.respondError(&contentTypeError, w)
		return
	}

	var out bytes.Buffer
	_, err = io.Copy(bufio.NewWriter(&out), file)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}

	path, checksum, err := threatintel.UploadToMinio(ctx, out.Bytes(),
		threatintel.SecretsRulesStore, fileHeader.Filename)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(&BadDecoding{err}, w)
		return
	}

	if err := threatintel.UpdateSecretsRulesInfo(ctx, checksum, strings.TrimPrefix(path, "database/")); err != nil {
		log.Error().Msg(err.Error())
		h.respondError(&BadDecoding{err}, w)
		return
	}

	_ = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: path + " " + checksum})
}

func (h *Handler) UploadMalwareRules(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()

	ctx := r.Context()

	if err := r.ParseMultipartForm(1024 * 1024); err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	file, fileHeader, err := r.FormFile("database")
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	defer file.Close()

	log.Info().Msgf("uploaded file content type %s", fileHeader.Header.Get("Content-Type"))
	if fileHeader.Header.Get("Content-Type") != "application/gzip" && fileHeader.Header.Get("Content-Type") != "application/x-gzip" {
		h.respondError(&contentTypeError, w)
		return
	}

	var out bytes.Buffer
	_, err = io.Copy(bufio.NewWriter(&out), file)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}

	path, checksum, err := threatintel.UploadToMinio(ctx, out.Bytes(),
		threatintel.MalwareRulesStore, fileHeader.Filename)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(&BadDecoding{err}, w)
		return
	}

	if err := threatintel.UpdateMalwareRulesInfo(ctx, checksum, strings.TrimPrefix(path, "database/")); err != nil {
		log.Error().Msg(err.Error())
		h.respondError(&BadDecoding{err}, w)
		return
	}

	_ = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: path + " " + checksum})
}

func (h *Handler) UploadPostureControls(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()

	ctx := r.Context()

	if err := r.ParseMultipartForm(1024 * 1024); err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	file, fileHeader, err := r.FormFile("database")
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	defer file.Close()

	log.Info().Msgf("uploaded file content type %s", fileHeader.Header.Get("Content-Type"))
	if fileHeader.Header.Get("Content-Type") != "application/gzip" && fileHeader.Header.Get("Content-Type") != "application/x-gzip" {
		h.respondError(&contentTypeError, w)
		return
	}

	var out bytes.Buffer
	_, err = io.Copy(bufio.NewWriter(&out), file)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}

	path, checksum, err := threatintel.UploadToMinio(ctx, out.Bytes(),
		threatintel.PostureControlsStore, fileHeader.Filename)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(&BadDecoding{err}, w)
		return
	}

	if err := threatintel.UpdatePostureControlsInfo(ctx, checksum, strings.TrimPrefix(path, "database/")); err != nil {
		log.Error().Msg(err.Error())
		h.respondError(&BadDecoding{err}, w)
		return
	}

	if err := threatintel.TriggerLoadCloudControls(ctx); err != nil {
		log.Error().Msg(err.Error())
		h.respondError(&BadDecoding{err}, w)
		return
	}

	_ = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: path + " " + checksum})
}
