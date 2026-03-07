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

	// Upload to the v6 directory so it's alongside latest.json
	path, checksum, err := threatintel.UploadToMinio(ctx, out.Bytes(),
		threatintel.GrypeV6DBDir, fileHeader.Filename)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(&BadDecoding{err}, w)
		return
	}

	if err := threatintel.VulnDBUpdateLatest(ctx, path, checksum, time.Now()); err != nil {
		log.Error().Err(err).Msg("failed to update database latest.json")
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

func (h *Handler) DatabaseInfo(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	dbUpdated := model.DatabaseInfoResponse{}

	// Get vulnerability DB info - gracefully handle if not yet available
	vulnDB, err := threatintel.GetLatestVulnerabilityDB(ctx)
	if err != nil {
		log.Warn().Err(err).Msg("vulnerability database not yet available")
		// Leave VulnerabilityDBUpdatedAt as zero time
	} else if vulnDB != nil {
		dbUpdated.VulnerabilityDBUpdatedAt = vulnDB.Built
	}

	// Get secrets rules info - gracefully handle if not yet available
	_, _, secretsRulesUpdatedAt, err := threatintel.FetchSecretsRulesInfo(ctx)
	if err != nil {
		log.Warn().Err(err).Msg("secrets rules not yet available")
		// Leave SecretsRulesUpdatedAt as zero time
	} else {
		dbUpdated.SecretsRulesUpdatedAt = time.UnixMilli(secretsRulesUpdatedAt)
	}

	// Get malware rules info - gracefully handle if not yet available
	_, _, malwareRulesUpdatedAt, err := threatintel.FetchMalwareRulesInfo(ctx)
	if err != nil {
		log.Warn().Err(err).Msg("malware rules not yet available")
		// Leave MalwareRulesUpdatedAt as zero time
	} else {
		dbUpdated.MalwareRulesUpdatedAt = time.UnixMilli(malwareRulesUpdatedAt)
	}

	// Get posture controls info - gracefully handle if not yet available
	_, _, postureControlsUpdatedAt, err := threatintel.FetchPostureControlsInfo(ctx)
	if err != nil {
		log.Warn().Err(err).Msg("posture controls not yet available")
		// Leave PostureControlsUpdatedAt as zero time
	} else {
		dbUpdated.PostureControlsUpdatedAt = time.UnixMilli(postureControlsUpdatedAt)
	}

	log.Info().Msgf("databases updated at %+v", dbUpdated)

	_ = httpext.JSON(w, http.StatusOK, dbUpdated)
}
