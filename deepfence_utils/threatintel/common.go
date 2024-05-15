package threatintel

import (
	"bufio"
	"bytes"
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"path"
	"sort"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/jellydator/ttlcache/v3"
	"github.com/minio/minio-go/v7"
)

const (
	threatintelPollDuration = 5 * time.Hour

	// database types
	DBTypeVulnerability = "vulnerability"
	DBTypeSecrets       = "secret"
	DBTypeMalware       = "malware"
	DBTypePosture       = "posture"
)

type DBUploadRequest struct {
	Database multipart.File `formData:"database" json:"database" validate:"required" required:"true"`
}

var ErrDatabaseNotFound = errors.New("database type not found")

type Listing struct {
	Available map[string][]Entry `json:"available"`
}

type Entry struct {
	Built    time.Time `json:"built"`
	Version  string    `json:"version"`
	Type     string    `json:"type"`
	URL      string    `json:"url"`
	Checksum string    `json:"checksum"`
}

func (l *Listing) GetLatest(version, dbType string) (Entry, error) {

	entries := []Entry{}

	for _, e := range l.Available[version] {
		if e.Type == dbType {
			entries = append(entries, e)
		}
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Built.Before(entries[j].Built)
	})

	if len(entries) >= 1 {
		return entries[len(entries)-1], nil
	}

	return Entry{}, ErrDatabaseNotFound

}

func (l *Listing) GetLatestN(version string, dbType ...string) ([]Entry, error) {

	entries := []Entry{}

	for _, e := range dbType {
		dbinfo, err := l.GetLatest(version, e)
		if err != nil && err != ErrDatabaseNotFound {
			return entries, err
		}
		entries = append(entries, dbinfo)
	}

	return entries, nil

}

func UploadToMinio(ctx context.Context, fb []byte, dbPath, fName string) (string, string, error) {

	ctx = directory.WithDatabaseContext(ctx)

	mc, err := directory.FileServerClient(ctx)
	if err != nil {
		return "", "", err
	}

	dbFile := path.Join(dbPath, fName)
	info, err := mc.UploadFile(ctx, dbFile, fb, true, minio.PutObjectOptions{})
	if err != nil {
		return "", "", err
	}

	return info.Key, utils.SHA256sum(fb), nil
}

func DeleteFileMinio(ctx context.Context, fName string) error {

	ctx = directory.WithDatabaseContext(ctx)

	mc, err := directory.FileServerClient(ctx)
	if err != nil {
		return err
	}

	err = mc.DeleteFile(ctx, fName, true, minio.RemoveObjectOptions{ForceDelete: true})
	if err != nil {
		log.Error().Err(err).Msgf("failed to remove file %s", fName)
		return err
	}

	return nil
}

func ExposeFile(ctx context.Context, fName string, consoleURL string, ttlCache *ttlcache.Cache[string, string]) (string, error) {

	mc, err := directory.FileServerClient(directory.WithDatabaseContext(ctx))
	if err != nil {
		return "", err
	}

	var exposedURL string
	cacheVal := ttlCache.Get(consoleURL + fName)
	if cacheVal == nil {
		exposedURL, err = mc.ExposeFile(ctx, fName, true, threatintelPollDuration*3, url.Values{}, consoleURL)
		if err != nil {
			return "", err
		}
		ttlCache.Set(consoleURL+fName, exposedURL, threatintelPollDuration)
	} else {
		exposedURL = cacheVal.Value()
	}

	return exposedURL, nil
}

func downloadFile(ctx context.Context, url string) (*bytes.Buffer, error) {

	tr := http.DefaultTransport.(*http.Transport).Clone()
	tr.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}

	client := http.Client{Timeout: 600 * time.Second}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
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
