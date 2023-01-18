package directory

import (
	"bytes"
	"context"
	"errors"
	"path"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	_ "github.com/lib/pq"
)

var minioClientMap map[NamespaceID]*minio.Client

func init() {
	minioClientMap = map[NamespaceID]*minio.Client{}
}

type FileManager interface {
	UploadFile(context.Context, string, []byte, interface{}) (UploadResult, error)
	DownloadFile(context.Context, string, string, interface{}) error
	Client() interface{}
	Bucket() string
}

type MinioFileManager struct {
	client    *minio.Client
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

func (mfm *MinioFileManager) UploadFile(ctx context.Context, filename string, data []byte, extra interface{}) (UploadResult, error) {
	err := mfm.createBucketIfNeeded(ctx)
	if err != nil {
		return UploadResult{}, err
	}

	info, err := mfm.client.PutObject(ctx, mfm.namespace, path.Join(mfm.namespace, filename),
		bytes.NewReader(data), int64(len(data)),
		extra.(minio.PutObjectOptions))

	if err != nil {
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

func (mfm *MinioFileManager) DownloadFile(ctx context.Context, remoteFile string, localFile string, extra interface{}) error {
	return mfm.client.FGetObject(ctx, mfm.namespace, path.Join(mfm.namespace, remoteFile), localFile, extra.(minio.GetObjectOptions))
}

func (mfm *MinioFileManager) Client() interface{} {
	return mfm.client
}

func (mfm *MinioFileManager) Bucket() string {
	return mfm.namespace
}

func (mfm *MinioFileManager) createBucketIfNeeded(ctx context.Context) error {

	exists, err := mfm.client.BucketExists(ctx, mfm.namespace)

	if err != nil {
		return err
	}

	if !exists {
		err = mfm.client.MakeBucket(ctx, mfm.namespace,
			minio.MakeBucketOptions{ObjectLocking: false})

	}
	return err
}

func newMinioClient(endpoints DBConfigs) (*minio.Client, error) {
	if endpoints.Minio == nil {
		return nil, errors.New("no defined minio config")
	}
	minioClient, err := minio.New(endpoints.Minio.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(endpoints.Minio.Username, endpoints.Minio.Password, ""),
		Secure: endpoints.Minio.Secure,
	})
	return minioClient, err
}

func MinioClient(ctx context.Context) (FileManager, error) {
	client, err := getClient(NewGlobalContext(), minioClientMap, newMinioClient)
	if err != nil {
		return nil, err
	}

	ns, err := ExtractNamespace(ctx)
	if err != nil {
		return nil, err
	}

	return &MinioFileManager{
		client:    client,
		namespace: string(ns),
	}, err
}
