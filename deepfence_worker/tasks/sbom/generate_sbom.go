package sbom

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"os"
	"path"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	workerUtils "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/deepfence/golang_deepfence_sdk/utils/tasks"
	"github.com/deepfence/package-scanner/sbom/syft"
	psUtils "github.com/deepfence/package-scanner/utils"
	"github.com/hibiken/asynq"
	"github.com/minio/minio-go/v7"
	"github.com/twmb/franz-go/pkg/kgo"
)

var (
	syftBin = "syft"
	scanMap = sync.Map{}
)

type SbomGenerator struct {
	ingestC chan *kgo.Record
}

func NewSbomGenerator(ingest chan *kgo.Record) SbomGenerator {
	return SbomGenerator{ingestC: ingest}
}

func StopVulnerabilityScan(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	log.Info().Msgf("StopVulnerabilityScan, payload: %s ", string(task.Payload()))

	var params utils.SbomParameters
	if err := json.Unmarshal(task.Payload(), &params); err != nil {
		log.Error().Msgf("StopVulnerabilityScan, error in Unmarshal: %s", err.Error())
		return nil
	}

	scanID := params.ScanID
	cancelFnObj, found := scanMap.Load(scanID)
	logMsg := ""
	if found {
		cancelFn := cancelFnObj.(context.CancelFunc)
		cancelFn()
		logMsg = "Stop GenerateSBOM request submitted"
	} else {
		logMsg = "Failed to Stop scan, SBOM may have already generated or errored out"
	}

	log.Info().Msgf("%s, scan_id: %s", logMsg, scanID)
	return nil
}

func (s SbomGenerator) GenerateSbom(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	var (
		params utils.SbomParameters
		err    error
	)

	tenantID, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}
	if len(tenantID) == 0 {
		log.Error().Msg("tenant-id/namespace is empty")
		return directory.ErrNamespaceNotFound
	}

	rh := []kgo.RecordHeader{
		{Key: "namespace", Value: []byte(tenantID)},
	}

	log.Info().Msgf("payload: %s ", string(task.Payload()))

	if err := json.Unmarshal(task.Payload(), &params); err != nil {
		return err
	}

	res, scanCtx := tasks.StartStatusReporter(params.ScanID,
		func(status tasks.ScanStatus) error {
			sb, err := json.Marshal(status)
			if err != nil {
				return err
			}
			s.ingestC <- &kgo.Record{
				Topic:   utils.VulnerabilityScanStatus,
				Value:   sb,
				Headers: rh,
			}
			return nil
		}, tasks.StatusValues{
			IN_PROGRESS: utils.ScanStatusInProgress,
			CANCELLED:   utils.ScanStatusCancelled,
			FAILED:      utils.ScanStatusFailed,
			SUCCESS:     utils.ScanStatusSuccess,
		},
		time.Minute*20,
	)

	log.Info().Msgf("Adding scan id to map:%s", params.ScanID)
	scanMap.Store(params.ScanID, scanCtx)
	defer func() {
		log.Info().Msgf("Removing scan id from map:%s", params.ScanID)
		scanMap.Delete(params.ScanID)
		res <- err
		close(res)
	}()

	if params.RegistryID == "" {
		log.Error().Msgf("registry id is empty in params %+v", params)
		return err
	}

	worker, err := directory.Worker(ctx)
	if err != nil {
		return err
	}

	// get registry credentials
	authFile, creds, err := workerUtils.GetConfigFileFromRegistry(ctx, params.RegistryID)
	if err != nil {
		log.Error().Err(err).Msgf("failed to generate registry auth file for task payload %s", string(task.Payload()))
		return err
	}

	defer func() {
		log.Info().Msgf("remove auth directory %s", authFile)
		if authFile == "" {
			return
		}
		if err := os.RemoveAll(authFile); err != nil {
			log.Error().Msg(err.Error())
		}
	}()

	// generate sbom
	cfg := psUtils.Config{
		SyftBinPath:           syftBin,
		HostName:              params.HostName,
		NodeType:              "container_image", // this is required by package scanner
		NodeID:                params.NodeID,
		KubernetesClusterName: params.KubernetesClusterName,
		ScanID:                params.ScanID,
		ImageID:               params.ImageID,
		ContainerName:         params.ContainerName,
		RegistryID:            params.RegistryID,
		RegistryCreds: psUtils.RegistryCreds{
			AuthFilePath:  authFile,
			SkipTLSVerify: creds.SkipTLSVerify,
			UseHTTP:       creds.UseHTTP,
		},
		IsRegistry: creds.IsRegistry,
	}

	if params.ImageName != "" {
		if creds.ImagePrefix != "" {
			cfg.Source = creds.ImagePrefix + "/" + params.ImageName
		} else {
			cfg.Source = params.ImageName
		}
	} else {
		cfg.Source = params.ImageID
	}

	log.Debug().Msgf("config: %+v", cfg)

	err = scanCtx.Checkpoint("Before generating SBOM")
	if err != nil {
		return err
	}

	ctx, sbomSpan := telemetry.NewSpan(ctx, "vuln-scan", "generate-sbom")
	rawSbom, err := syft.GenerateSBOM(scanCtx.Context, cfg)
	if err != nil {
		sbomSpan.EndWithErr(err)
		return err
	}

	gzpb64Sbom := bytes.Buffer{}
	gzipwriter := gzip.NewWriter(&gzpb64Sbom)
	_, err = gzipwriter.Write(rawSbom)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	gzipwriter.Close()

	err = scanCtx.Checkpoint("Before storing to minio")
	if err != nil {
		log.Error().Msg(err.Error())
	}

	// upload sbom to minio
	mc, err := directory.FileServerClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	sbomFile := path.Join("/sbom/", utils.ScanIDReplacer.Replace(params.ScanID)+".json.gz")
	info, err := mc.UploadFile(ctx, sbomFile, gzpb64Sbom.Bytes(), true,
		minio.PutObjectOptions{ContentType: "application/gzip"})
	if err != nil {
		log.Error().Err(err).Msg("failed to uplaod sbom")
		return err
	}
	sbomSpan.End()

	log.Info().Msgf("sbom file uploaded %+v", info)

	// write sbom to minio and return details another task will scan sbom

	params.SBOMFilePath = sbomFile

	payload, err := json.Marshal(params)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil
	}

	err = worker.Enqueue(utils.ScanSBOMTask, payload, utils.DefaultTaskOpts()...)
	if err != nil {
		return err
	}

	return nil
}
