package cronjobs

import (
	"context"
	url2 "net/url"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/hibiken/asynq"
	m "github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

var (
	bucket = aws.String("deepfence-tm-binaries")
)

func CheckAgentUpgrade(ctx context.Context, task *asynq.Task) error {
	log.Info().Msg("Start agent version check")

	sess, _ := session.NewSession(&aws.Config{
		Region: aws.String("us-east-2"), Credentials: credentials.AnonymousCredentials},
	)

	svc := s3.New(sess)

	resp, err := svc.ListObjects(&s3.ListObjectsInput{
		Bucket: bucket,
	})

	if err != nil {
		return err
	}

	downloader := s3manager.NewDownloaderWithClient(svc)

	versioned_tarball := map[string]*aws.WriteAtBuffer{}
	for _, item := range resp.Contents {
		buf := []byte{}
		b := aws.NewWriteAtBuffer(buf)
		_, err := downloader.Download(b,
			&s3.GetObjectInput{
				Bucket: bucket,
				Key:    item.Key,
			})
		if err != nil {
			log.Error().Msgf("S3 download of %v failed: %v", *item.Key, err)
			continue
		}

		key := (*item.Key)[:strings.IndexByte(*item.Key, '/')]
		versioned_tarball[key] = b
	}

	tags_with_urls, err := prepareAgentBinariesReleases(ctx, versioned_tarball)
	if err != nil {
		return err
	}

	err = ingestAgentVersion(ctx, tags_with_urls)
	return err
}

func prepareAgentBinariesReleases(ctx context.Context, versioned_tarball map[string]*aws.WriteAtBuffer) (map[string]string, error) {
	processed_tags := map[string]string{}
	minio, err := directory.MinioClient(ctx)
	if err != nil {
		return processed_tags, err
	}

	for version, b := range versioned_tarball {
		res, err := minio.UploadFile(ctx,
			version,
			b.Bytes(),
			false,
			m.PutObjectOptions{ContentType: "application/gzip"})
		key := ""
		if err != nil {
			ape, ok := err.(directory.AlreadyPresentError)
			if ok {
				log.Warn().Err(err).Msg("Skip upload")
				key = ape.Path
			} else {
				log.Error().Err(err).Msg("Upload")
				continue
			}
		} else {
			key = res.Key
		}

		url, err := minio.ExposeFile(ctx, key, false, 10*time.Hour, url2.Values{})
		if err != nil {
			log.Error().Err(err)
			continue
		}
		log.Debug().Msgf("Exposed URL: %v", url)
		processed_tags[version] = url
	}
	return processed_tags, nil
}

func ingestAgentVersion(ctx context.Context, tags_to_url map[string]string) error {
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(15 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	tags_to_ingest := []map[string]string{}
	for k, v := range tags_to_url {
		tags_to_ingest = append(tags_to_ingest, map[string]string{"tag": k, "url": v})
	}

	if _, err = tx.Run(`
		UNWIND $batch as row
		MERGE (n:AgentVersion{node_id: row.tag})
		ON CREATE SET n.url = row.url`,
		map[string]interface{}{"batch": tags_to_ingest}); err != nil {
		return err
	}

	return tx.Commit()
}
