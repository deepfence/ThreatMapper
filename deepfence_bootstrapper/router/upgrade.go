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

	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/supervisor"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

const (
	binaires_file = "/tmp/binaries.tar.gz"
)

func StartAgentUpgrade(req ctl.StartAgentUpgradeRequest) error {
	log.Info().Msgf("Fetching %v", req.HomeDirectoryUrl)
	err := downloadFile(binaires_file, req.HomeDirectoryUrl)
	if err != nil {
		return err
	}
	defer os.Remove(binaires_file)
	log.Info().Msgf("Download done")

	dir, err := os.MkdirTemp("/tmp", "bins")
	if err != nil {
		return err
	}
	defer os.Remove(dir)

	err = extractTarGz(binaires_file, dir)
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
		plugins = append(plugins, NamePath{name: filepath.Base(path), path: path})
		return nil
	})

	if err != nil {
		return err
	}

	for _, plugin := range plugins {
		err = supervisor.UpgradeProcessFromFile(plugin.name, plugin.path)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}

	return nil
}

func downloadFile(filepath string, url string) (err error) {

	// Create the file
	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{Transport: tr}
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

func extractTarGz(input_file, output_dir string) error {
	cmd := exec.Command("tar", "xf", input_file, "-C", output_dir)
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
