package directory

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	_ "github.com/lib/pq"
)

var (
	MinioBucket         = utils.GetEnvOrDefault("DEEPFENCE_MINIO_BUCKET", string(NonSaaSDirKey))
	MinioDatabaseBucket = utils.GetEnvOrDefault("DEEPFENCE_MINIO_DB_BUCKET", string(DatabaseDirKey))
	minioClientMap      sync.Map
)

func init() {
	minioClientMap = sync.Map{}
}

type AlreadyPresentError struct {
	Path string
}

func (e AlreadyPresentError) Error() string {
	return fmt.Sprintf("Already exists here: %s", e.Path)
}

type PathDoesNotExistsError struct {
	Path string
}

func (e PathDoesNotExistsError) Error() string {
	return fmt.Sprintf("Path doesnot exists here: %s", e.Path)
}

type FileDeleteError struct {
	Path string
}

func (e FileDeleteError) Error() string {
	return fmt.Sprintf("Failed to delete file: %s", e.Path)
}

type FileManager interface {
	ListFiles(ctx context.Context, pathPrefix string, recursive bool, maxKeys int, skipDir bool) []ObjectInfo
	UploadLocalFile(ctx context.Context, filename string, localFilename string, overwrite bool, extra interface{}) (UploadResult, error)
	UploadFile(ctx context.Context, filename string, data []byte, overwrite bool, extra interface{}) (UploadResult, error)
	DeleteFile(ctx context.Context, filename string, addFilePathPrefix bool, extra interface{}) error
	DownloadFile(ctx context.Context, remoteFile string, localFile string, extra interface{}) error
	DownloadFileTo(ctx context.Context, remoteFile string, localFile io.WriteCloser, extra interface{}) error
	DownloadFileContexts(ctx context.Context, remoteFile string, extra interface{}) ([]byte, error)
	ExposeFile(ctx context.Context, filePath string, addFilePathPrefix bool, expires time.Duration, reqParams url.Values) (string, error)
	CreatePublicUploadURL(ctx context.Context, filePath string, addFilePathPrefix bool, expires time.Duration, reqParams url.Values) (string, error)
	Client() interface{}
	Bucket() string
	CreatePublicBucket(ctx context.Context, bucket string) error
	CleanNamespace(ctx context.Context) error
}

type MinioFileManager struct {
	client    *minio.Client
	bucket    string
	namespace string
}

type UploadResult struct {
	Bucket       string
	Key          string
	ETag         string
	Size         int64
	LastModified time.Time
	Location     string
	VersionID    string
}

type ObjectInfo struct {
	Key          string    `json:"name"`         // Name of the object
	LastModified time.Time `json:"lastModified"` // Date and time the object was last modified.
	Size         int64     `json:"size"`         // Size in bytes of the object.
	ContentType  string    `json:"contentType"`  // A standard MIME type describing the format of the object data.
	Expires      time.Time `json:"expires"`      // The date and time at which the object is no longer able to be cached.
	IsDir        bool      `json:"isDir"`        // Is this object a directory
}

func checkIfFileExists(ctx context.Context, client *minio.Client, bucket, filename string) (string, bool) {
	info, err := client.StatObject(ctx, bucket, filename, minio.StatObjectOptions{})
	if err != nil {
		return "", false
	}
	return info.Key, true
}

func (mfm *MinioFileManager) optionallyAddNamespacePrefix(filePath string, addFilePathPrefix bool) string {
	if addFilePathPrefix {
		return mfm.addNamespacePrefix(filePath)
	} else {
		return strings.TrimPrefix(filePath, "/")
	}
}

func (mfm *MinioFileManager) addNamespacePrefix(filePath string) string {
	return filepath.Join(mfm.namespace, filePath)
}

func (mfm *MinioFileManager) ListFiles(ctx context.Context, pathPrefix string, recursive bool, maxKeys int, skipDir bool) []ObjectInfo {

	ctx, span := telemetry.NewSpan(ctx, "fileserver", "list-files")
	defer span.End()

	prefix := mfm.addNamespacePrefix(pathPrefix) + "/"

	objects := mfm.client.ListObjects(ctx, mfm.bucket,
		minio.ListObjectsOptions{
			WithVersions: false,
			WithMetadata: false,
			Prefix:       prefix,
			Recursive:    recursive,
			MaxKeys:      maxKeys,
			StartAfter:   "",
			UseV1:        false,
		})

	var objectsInfo []ObjectInfo
	for obj := range objects {
		isDir := strings.HasSuffix(obj.Key, "/")
		if skipDir && isDir {
			continue
		}
		objectsInfo = append(objectsInfo, ObjectInfo{
			Key:          obj.Key,
			LastModified: obj.LastModified,
			Size:         obj.Size,
			ContentType:  obj.ContentType,
			Expires:      obj.Expires,
			IsDir:        isDir,
		})
	}
	return objectsInfo
}

func (mfm *MinioFileManager) UploadLocalFile(ctx context.Context,
	filename string, localFilename string, overwrite bool, extra interface{}) (UploadResult, error) {

	ctx, span := telemetry.NewSpan(ctx, "fileserver", "upload-local-file")
	defer span.End()

	err := mfm.createBucketIfNeeded(ctx)
	if err != nil {
		span.EndWithErr(err)
		return UploadResult{}, err
	}

	objectName := mfm.addNamespacePrefix(filename)

	key, has := checkIfFileExists(ctx, mfm.client, mfm.bucket, objectName)
	if has {
		if !overwrite {
			return UploadResult{}, AlreadyPresentError{Path: key}
		} else {
			log.Info().Msgf("overwrite file %s", key)
			err := mfm.DeleteFile(ctx, objectName, false, minio.RemoveObjectOptions{ForceDelete: true})
			if err != nil {
				log.Error().Err(err).Msg("failed to delete file while overwriting")
				span.EndWithErr(err)
				return UploadResult{}, FileDeleteError{Path: key}
			}
		}
	}

	info, err := mfm.client.FPutObject(ctx, mfm.bucket, objectName, localFilename, extra.(minio.PutObjectOptions))
	if err != nil {
		span.EndWithErr(err)
		return UploadResult{}, err
	}

	return UploadResult{
		Location:     info.Location,
		Bucket:       info.Bucket,
		Key:          info.Key,
		ETag:         info.ETag,
		Size:         info.Size,
		LastModified: info.LastModified,
		VersionID:    info.VersionID,
	}, nil
}

func (mfm *MinioFileManager) UploadFile(ctx context.Context,
	filename string, data []byte, overwrite bool, extra interface{}) (UploadResult, error) {

	ctx, span := telemetry.NewSpan(ctx, "fileserver", "upload-file")
	defer span.End()

	err := mfm.createBucketIfNeeded(ctx)
	if err != nil {
		span.EndWithErr(err)
		return UploadResult{}, err
	}

	objectName := mfm.addNamespacePrefix(filename)

	key, has := checkIfFileExists(ctx, mfm.client, mfm.bucket, objectName)
	if has {
		if !overwrite {
			return UploadResult{}, AlreadyPresentError{Path: key}
		} else {
			log.Info().Msgf("overwrite file %s", key)
			err := mfm.DeleteFile(ctx, objectName, false, minio.RemoveObjectOptions{ForceDelete: true})
			if err != nil {
				span.EndWithErr(err)
				log.Error().Err(err).Msg("failed to delete file while overwriting")
				return UploadResult{}, FileDeleteError{Path: key}
			}
		}
	}

	info, err := mfm.client.PutObject(ctx, mfm.bucket, objectName, bytes.NewReader(data), int64(len(data)), extra.(minio.PutObjectOptions))
	if err != nil {
		span.EndWithErr(err)
		return UploadResult{}, err
	}

	return UploadResult{
		Location:     info.Location,
		Bucket:       info.Bucket,
		Key:          info.Key,
		ETag:         info.ETag,
		Size:         info.Size,
		LastModified: info.LastModified,
		VersionID:    info.VersionID,
	}, nil
}

func (mfm *MinioFileManager) DeleteFile(ctx context.Context, filePath string, addFilePathPrefix bool, extra interface{}) error {
	ctx, span := telemetry.NewSpan(ctx, "fileserver", "delete-file")
	defer span.End()

	return mfm.client.RemoveObject(ctx, mfm.bucket, mfm.optionallyAddNamespacePrefix(filePath, addFilePathPrefix), extra.(minio.RemoveObjectOptions))
}

func (mfm *MinioFileManager) DownloadFile(ctx context.Context, remoteFile string, localFile string, extra interface{}) error {
	ctx, span := telemetry.NewSpan(ctx, "fileserver", "download-file")
	defer span.End()

	return mfm.client.FGetObject(ctx, mfm.bucket, mfm.addNamespacePrefix(remoteFile), localFile, extra.(minio.GetObjectOptions))
}

func (mfm *MinioFileManager) DownloadFileTo(ctx context.Context, remoteFile string, writer io.WriteCloser, extra interface{}) error {
	ctx, span := telemetry.NewSpan(ctx, "fileserver", "download-file-to")
	defer span.End()

	obj, err := mfm.client.GetObject(ctx, mfm.bucket, mfm.addNamespacePrefix(remoteFile), extra.(minio.GetObjectOptions))
	if err != nil {
		span.EndWithErr(err)
		return err
	}
	_, err = io.Copy(writer, obj)
	if err != nil {
		span.EndWithErr(err)
		return err
	}
	return writer.Close()
}

func (mfm *MinioFileManager) DownloadFileContexts(ctx context.Context, remoteFile string, extra interface{}) ([]byte, error) {

	ctx, span := telemetry.NewSpan(ctx, "fileserver", "download-file-contents")
	defer span.End()

	object, err := mfm.client.GetObject(ctx, mfm.bucket, mfm.addNamespacePrefix(remoteFile), extra.(minio.GetObjectOptions))
	if err != nil {
		span.EndWithErr(err)
		return nil, err
	}

	var buff bytes.Buffer
	if _, err = io.Copy(bufio.NewWriter(&buff), object); err != nil {
		span.EndWithErr(err)
		return nil, err
	}

	return buff.Bytes(), nil
}

func (mfm *MinioFileManager) ExposeFile(ctx context.Context, filePath string, addFilePathPrefix bool, expires time.Duration, reqParams url.Values) (string, error) {
	// Force browser to download file - url.Values{"response-content-disposition": []string{"attachment; filename=\"b.txt\""}},

	ctx, span := telemetry.NewSpan(ctx, "fileserver", "expose-file")
	defer span.End()

	consoleIP, err := GetManagementHost(ctx)
	if err != nil {
		span.EndWithErr(err)
		return "", err
	}

	actualPath := mfm.optionallyAddNamespacePrefix(filePath, addFilePathPrefix)

	key, has := checkIfFileExists(ctx, mfm.client, mfm.bucket, actualPath)
	if !has {
		err := PathDoesNotExistsError{Path: actualPath}
		span.EndWithErr(err)
		return "", err
	}

	headers := http.Header{}
	if !strings.Contains(mfm.client.EndpointURL().Hostname(), "s3.amazonaws.com") {
		headers.Add("Host", consoleIP)
	}

	urlLink, err := mfm.client.PresignHeader(
		ctx,
		"GET",
		mfm.bucket,
		key,
		expires,
		reqParams,
		headers,
	)
	if err != nil {
		span.EndWithErr(err)
		return "", err
	}

	return updateURL(urlLink.String(), consoleIP), nil
}

func (mfm *MinioFileManager) CreatePublicUploadURL(ctx context.Context, filePath string, addFilePathPrefix bool, expires time.Duration, reqParams url.Values) (string, error) {

	ctx, span := telemetry.NewSpan(ctx, "fileserver", "create-public-upload-url")
	defer span.End()

	consoleIP, err := GetManagementHost(ctx)
	if err != nil {
		span.EndWithErr(err)
		return "", err
	}

	headers := http.Header{}
	if !strings.Contains(mfm.client.EndpointURL().Hostname(), "s3.amazonaws.com") {
		headers.Add("Host", consoleIP)
	}

	urlLink, err := mfm.client.PresignHeader(
		ctx,
		"PUT",
		mfm.bucket,
		mfm.optionallyAddNamespacePrefix(filePath, addFilePathPrefix),
		expires,
		reqParams,
		headers,
	)
	if err != nil {
		span.EndWithErr(err)
		return "", err
	}

	return updateURL(urlLink.String(), consoleIP), nil
}

func (mfm *MinioFileManager) Client() interface{} {
	return mfm.client
}

func (mfm *MinioFileManager) Bucket() string {
	return mfm.bucket
}

func (mfm *MinioFileManager) createBucketIfNeeded(ctx context.Context) error {

	ctx, span := telemetry.NewSpan(ctx, "fileserver", "create-bucket-if-needed")
	defer span.End()

	exists, err := mfm.client.BucketExists(ctx, mfm.bucket)

	if err != nil {
		span.EndWithErr(err)
		return err
	}

	if !exists {
		err = mfm.client.MakeBucket(ctx, mfm.bucket, minio.MakeBucketOptions{ObjectLocking: false})
	}
	return err
}

func (mfm *MinioFileManager) CreatePublicBucket(ctx context.Context, bucket string) error {

	ctx, span := telemetry.NewSpan(ctx, "fileserver", "create-public-bucket")
	defer span.End()

	exists, err := mfm.client.BucketExists(ctx, bucket)
	if err != nil {
		span.EndWithErr(err)
		return err
	} else if exists {
		return nil
	}

	err = mfm.client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{ObjectLocking: false})
	if err != nil {
		span.EndWithErr(err)
		return err
	}

	return nil
}

func (mfm *MinioFileManager) CleanNamespace(ctx context.Context) error {

	ctx, span := telemetry.NewSpan(ctx, "fileserver", "clear-namespace")
	defer span.End()

	files := mfm.ListFiles(ctx, "", true, 0, false)
	log.Info().Msgf("delete %d file for namespace %s", len(files), mfm.namespace)
	for _, f := range files {
		if err := mfm.DeleteFile(ctx, f.Key, false, minio.RemoveObjectOptions{ForceDelete: true}); err != nil {
			log.Error().Err(err).Msgf("failed to delete file %s", f.Key)
			span.EndWithErr(err)
		}
	}

	return nil
}

func updateURL(url string, consoleIP string) string {
	minioHost := utils.GetEnvOrDefault("DEEPFENCE_MINIO_HOST", "deepfence-file-server")
	minioPort := utils.GetEnvOrDefault("DEEPFENCE_MINIO_PORT", "9000")

	updated := strings.ReplaceAll(url,
		fmt.Sprintf("%s:%s", minioHost, minioPort),
		fmt.Sprintf("%s/file-server", consoleIP),
	)

	return strings.ReplaceAll(updated, "http://", "https://")
}

func newMinioClient(endpoints DBConfigs) (*minio.Client, error) {
	if endpoints.Minio == nil {
		return nil, errors.New("no defined minio config")
	}
	minioClient, err := minio.New(endpoints.Minio.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(endpoints.Minio.Username, endpoints.Minio.Password, ""),
		Secure: endpoints.Minio.Secure,
		Region: endpoints.Minio.Region,
	})
	return minioClient, err
}

func MinioClient(ctx context.Context) (FileManager, error) {
	client, err := getClient(NewGlobalContext(), &minioClientMap, newMinioClient)
	if err != nil {
		return nil, err
	}

	ns, err := ExtractNamespace(ctx)
	if err != nil {
		return nil, err
	}

	bucket := MinioBucket
	if ns == DatabaseDirKey {
		bucket = MinioDatabaseBucket
	}

	return &MinioFileManager{
		client:    client,
		bucket:    bucket,
		namespace: string(ns),
	}, err
}
