package handler

import (
	"bufio"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
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

	var out bytes.Buffer
	_, err = io.Copy(bufio.NewWriter(&out), file)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}

	path, checksum, err := UploadToMinio(r.Context(), out.Bytes(), fileHeader.Filename)
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
		return "", "", err
	}

	dbFile := path.Join(model.VulnerabilityDbStore, fName)
	info, err := mc.UploadFile(directory.WithDatabaseContext(ctx), dbFile, fb, minio.PutObjectOptions{})
	if err != nil {
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

	data, err := mc.DownloadFileContexts(ctx, model.ListingPath, minio.GetObjectOptions{})
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
			Built:   time.Now(),
			Version: 5,
			URL: fmt.Sprintf(
				"http://%s/%s",
				minioHost+":"+minioPort,
				path.Join(string(directory.DatabaseDirKey), newFile),
			),
			Checksum: newFileCheckSum,
		},
		model.Version5,
	)

	lb, err := listing.Bytes()
	if err != nil {
		log.Error().Msgf(err.Error())
		return
	}

	err = mc.DeleteFile(ctx, model.ListingPath, true, minio.RemoveObjectOptions{ForceDelete: true})
	if err != nil {
		log.Error().Msgf(err.Error())
		return
	}

	_, err = mc.UploadFile(ctx, model.ListingPath, lb, minio.PutObjectOptions{ContentType: "application/json"})
	if err != nil {
		log.Error().Msgf(err.Error())
		return
	}

	log.Info().Msgf("vulnerability db listing updated with file %s checksum %s",
		newFile, newFileCheckSum)

}

func downloadVulnerabilityDb() {

	log.Info().Msg("download latest vulnerability database")

	df_listing_url := getEnvOrDefault(
		"DEEPFENCE_THREAT_INTEL_URL",
		model.DEEPFENCE_THREAT_INTEL_URL,
	)

	client := http.Client{Timeout: 60 * time.Second}

	resp, err := client.Get(df_listing_url)
	if err != nil {
		log.Error().Msgf(err.Error())
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Error().Msgf("listing url response: %s", resp.Status)
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Msgf(err.Error())
		return
	}

	var listing model.VulnerabilityDBListing
	if err := json.Unmarshal(body, &listing); err != nil {
		log.Error().Msgf(err.Error())
		return
	}

	// sort by built time
	listing.Sort(model.Version5)

	latest := listing.Latest(model.Version5)

	log.Info().Msgf("latest threat intel db: %v", latest)

	data, err := downloadFile(latest.URL)
	if err != nil {
		log.Error().Msgf(err.Error())
		return
	}

	path, checksum, err := UploadToMinio(context.Background(), data.Bytes(), path.Base(latest.URL))
	if err != nil {
		log.Error().Msg(err.Error())
		return
	}

	go func() {
		UpdateListing(path, checksum)
	}()

}

func PeriodicDownloadDB() {
	// handle startup
	downloadVulnerabilityDb()

	// start checking for update periodically
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for t := range ticker.C {
		log.Info().Msgf("download vulnerability database at %s", t)
		downloadVulnerabilityDb()
	}
}

func downloadFile(url string) (*bytes.Buffer, error) {

	client := http.Client{Timeout: 600 * time.Second}

	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("bad status: %s", resp.Status)
	}

	var out bytes.Buffer
	_, err = io.Copy(bufio.NewWriter(&out), resp.Body)
	if err != nil {
		return nil, err
	}

	return &out, nil
}
