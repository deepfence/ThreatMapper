package handler

import (
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/minio/minio-go/v7"
)

var (
	listingJson          = "listing.json"
	vulnerabilityDbStore = "vulnerability"
	listingPath          = path.Join(vulnerabilityDbStore, listingJson)
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

	path, checksum, err := UploadToMinio(r.Context(), fb, fileHeader.Filename)
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(&BadDecoding{err}, w)
		return
	}

	go func() {
		UpdateListing(path, checksum)
	}()

	httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: path + " " + checksum})
}

func UploadToMinio(ctx context.Context, fb []byte, fName string) (string, string, error) {

	mc, err := directory.MinioClient(directory.WithDatabaseContext(ctx))
	if err != nil {
		log.Error().Msg(err.Error())
		return "", "", err
	}

	dbFile := path.Join(vulnerabilityDbStore, fName)
	info, err := mc.UploadFile(directory.WithDatabaseContext(ctx), dbFile, fb, minio.PutObjectOptions{})
	if err != nil {
		log.Error().Msg(err.Error())
		return "", "", err
	}

	return info.Key, sha256sum(fb), nil
}

func sha256sum(data []byte) string {
	hash := sha256.New()
	hash.Write(data)
	return fmt.Sprintf("sha256:%x", hash.Sum(nil))
}

func getEnvOrDefault(envVar string, defaultValue string) string {
	envValue, has := os.LookupEnv(envVar)
	if !has {
		return defaultValue
	}
	return envValue
}

func UpdateListing(newFile, newFileCheckSum string) {
	log.Info().Msg("update vulnerability database listing")

	ctx := context.Background()
	mc, err := directory.MinioClient(directory.WithDatabaseContext(ctx))
	if err != nil {
		log.Error().Msg(err.Error())
		return
	}

	data, err := mc.DownloadFileContexts(ctx, listingPath, minio.GetObjectOptions{})
	if err != nil {
		log.Error().Err(err).Msg("failed to load listing file")
	}

	listing, err := model.LoadListing(data)
	if err != nil {
		listing = model.NewVulnerabilityDBListing()
	}

	minioHost := getEnvOrDefault("DEEPFENCE_MINIO_HOST", "deepfence-file-server")
	minioPort := getEnvOrDefault("DEEPFENCE_MINIO_PORT", "9000")

	listing.Append(
		model.Database{
			Built:    time.Now(),
			Version:  5,
			URL:      fmt.Sprintf("http://%s/%s", minioHost+":"+minioPort, newFile),
			Checksum: newFileCheckSum,
		},
	)

	lb, err := listing.Bytes()
	if err != nil {
		log.Error().Msgf(err.Error())
		return
	}

	err = mc.DeleteFile(ctx, listingPath, true, minio.RemoveObjectOptions{ForceDelete: true})
	if err != nil {
		log.Error().Msgf(err.Error())
		return
	}

	_, err = mc.UploadFile(ctx, listingPath, lb,
		minio.PutObjectOptions{ContentType: "application/json"})
	if err != nil {
		log.Error().Msgf(err.Error())
		return
	}

	log.Info().Msgf("vulnerability db listing updated with file %s checksum %s",
		newFile, newFileCheckSum)

}
