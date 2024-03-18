package router

import (
	"crypto/tls"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/supervisor"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

const (
	binariesFile = "/tmp/binaries.tar.gz"
)

func StartAgentUpgrade(req ctl.StartAgentUpgradeRequest) error {
	log.Info().Msgf("Fetching %v", req.HomeDirectoryURL)
	err := downloadFile(binariesFile, req.HomeDirectoryURL)
	if err != nil {
		return err
	}
	defer os.Remove(binariesFile)
	log.Info().Msgf("Download done")

	dir, err := os.MkdirTemp("/tmp", "bins")
	if err != nil {
		return err
	}
	defer os.Remove(dir)

	err = extractTarGz(binariesFile, dir)
	if err != nil {
		return err
	}

	type NamePath struct {
		name string
		path string
	}

	plugins := []NamePath{}
	err = filepath.Walk(dir, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		plugins = append(plugins, NamePath{name: filepath.Base(path), path: path})
		return nil
	})

	if err != nil {
		return err
	}

	restart := false
	for _, plugin := range plugins {
		err = supervisor.UpgradeProcessFromFile(plugin.name, plugin.path)
		if err != nil {
			log.Error().Msgf("plugin: %v, path: %v, err: %v", plugin.name, plugin.path, err)
		} else if plugin.name == supervisor.SelfID {
			restart = true
		}
	}

	if restart {
		log.Info().Msgf("Restart self")
		err = restartSelf()
	}

	return err
}

func restartSelf() error {
	errs := supervisor.StopAllProcesses()
	for i := range errs {
		log.Error().Msg(errs[i].Error())
	}
	argv0, err := exec.LookPath(os.Args[0])
	if err != nil {
		return err
	}
	return syscall.Exec(argv0, os.Args, os.Environ())
}

func downloadFile(filepath string, url string) (err error) {

	// Create the file
	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	tr := http.DefaultTransport.(*http.Transport).Clone()
	tr.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}

	client := &http.Client{
		Timeout:   5 * time.Minute,
		Transport: tr,
	}
	// Get the data
	resp, err := client.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Check server response
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	// Writer the body to file
	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return err
	}

	return nil
}

func extractTarGz(inputFile, outputDir string) error {
	cmd := exec.Command("tar", "xf", inputFile, "-C", outputDir)
	return cmd.Run()
}

func Backup(dir string) error {
	cmd := exec.Command("mv", dir, dir+".old")
	err := cmd.Run()
	if err != nil {
		return err
	}
	cmd = exec.Command("mkdir", "-p", dir)
	err = cmd.Run()
	if err != nil {
		return err
	}
	return nil
}
