package threatintel

import (
	"archive/tar"
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
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

	// ThreatIntelBaseURL is the base URL for direct threat intel downloads
	ThreatIntelBaseURL = "https://artifacts.threatmapper.org/threat-intel"

	// database types
	DBTypeVulnerability = "vulnerability"
	DBTypeSecrets       = "secret"
	DBTypeMalware       = "malware"
	DBTypePosture       = "posture"

	VulnerabilityRuleJSONFileName = "vulnerability.json"
)

// GetThreatIntelURL returns the direct download URL for a given database type and version
func GetThreatIntelURL(dbType, version string) string {
	if dbType == DBTypeVulnerability {
		return fmt.Sprintf("%s/%s/v6/%s_%s.tar.gz", ThreatIntelBaseURL, dbType, dbType, version)
	}
	return fmt.Sprintf("%s/%s/%s_%s.tar.gz", ThreatIntelBaseURL, dbType, dbType, version)
}

type DBUploadRequest struct {
	Database multipart.File `formData:"database" json:"database" validate:"required" required:"true"`
}

var ErrDatabaseNotFound = errors.New("database type not found")

type DeepfenceCommunicationMessage struct {
	Title         string `json:"title"`
	Content       string `json:"content"`
	Link          string `json:"link"`
	LinkTitle     string `json:"link_title"`
	ButtonContent string `json:"button_content"`
	ID            int64  `json:"id"`
	UpdatedAt     int64  `json:"updated_at"`
}

type Listing struct {
	Available map[string][]Entry              `json:"available"`
	Messages  []DeepfenceCommunicationMessage `json:"messages"`
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
	tr.Proxy = http.ProxyFromEnvironment
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

func DeepfenceRule2json(input []DeepfenceRule) []map[string]any {
	res := []map[string]any{}
	b, err := json.Marshal(input)
	if err != nil {
		log.Error().Err(err).Msg("deepfence rule marshal error")
	}

	err = json.Unmarshal(b, &res)
	if err != nil {
		log.Error().Err(err).Msg("deepfence rule unmarshal error")
	}

	return res
}

func ProcessTarGz(content []byte, processFile func(header *tar.Header, reader io.Reader) error) error {
	// Uncompress the gzipped content
	gzipReader, err := gzip.NewReader(bytes.NewReader(content))
	if err != nil {
		return fmt.Errorf("failed to create gzip reader: %w", err)
	}
	defer gzipReader.Close()

	// Create a tar reader to read the uncompressed data
	tarReader := tar.NewReader(gzipReader)

	// Iterate over the files in the tar archive
	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break // End of tar archive
		}
		if err != nil {
			return fmt.Errorf("failed to read tar file: %w", err)
		}

		// Run the provided callback function on the current file
		if err := processFile(header, tarReader); err != nil {
			return fmt.Errorf("failed to process file %s: %w", header.Name, err)
		}
	}

	return nil
}

func createArchive(files []string, buf io.Writer) error {
	gw := gzip.NewWriter(buf)
	defer gw.Close()
	tw := tar.NewWriter(gw)
	defer tw.Close()

	// Iterate over files and add them to the tar archive
	for _, file := range files {
		err := addToArchive(tw, file)
		if err != nil {
			return err
		}
	}

	return nil
}

func addToArchive(tw *tar.Writer, filename string) error {
	// Open the file which will be written into the archive
	file, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	// Get FileInfo about our file providing file size, mode, etc.
	info, err := file.Stat()
	if err != nil {
		return err
	}

	// Create a tar Header from the FileInfo data
	header, err := tar.FileInfoHeader(info, info.Name())
	if err != nil {
		return err
	}

	header.Name = path.Base(info.Name())

	// Write file header to the tar archive
	err = tw.WriteHeader(header)
	if err != nil {
		return err
	}

	// Copy file content to tar archive
	_, err = io.Copy(tw, file)
	if err != nil {
		return err
	}

	return nil
}
