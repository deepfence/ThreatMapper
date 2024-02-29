package threatintel

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"sort"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/minio/minio-go/v7"
)

const (
	threatintelPollDuration = 5 * time.Hour

	// database types
	DBTypeVulnerability        = "vulnerability-scan"
	DBTypeSecrets              = "secret-scan"
	DBTypeMalware              = "malware-scan"
	DBTypeLinuxCompliance      = "compliance-scan/linux"
	DBTypeKubernetesCompliance = "compliance-scan/kubernetes"
	DBTypeCloudCompliance      = "compliance-scan/cloud"
)

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

	mc, err := directory.MinioClient(directory.WithDatabaseContext(ctx))
	if err != nil {
		return "", "", err
	}

	dbFile := path.Join(dbPath, fName)
	info, err := mc.UploadFile(directory.WithDatabaseContext(ctx), dbFile, fb, true, minio.PutObjectOptions{})
	if err != nil {
		return "", "", err
	}

	return info.Key, utils.SHA256sum(fb), nil
}

func ExposeFile(ctx context.Context, fName string) (string, error) {

	mc, err := directory.MinioClient(directory.WithDatabaseContext(ctx))
	if err != nil {
		return "", err
	}

	url, err := mc.ExposeFile(ctx, fName, false, threatintelPollDuration*3, url.Values{})
	if err != nil {
		return "", err
	}

	return url, nil
}

func downloadFile(ctx context.Context, url string) (*bytes.Buffer, error) {

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
