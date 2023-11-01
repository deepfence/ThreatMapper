package router

import (
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"syscall"

	"github.com/abrander/go-supervisord"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

func StartAgentUpgrade(req ctl.StartAgentUpgradeRequest) error {
	log.Info().Msgf("Fetching %v", req.HomeDirectoryUrl)
	err := downloadFile("/tmp/deepfence.tar.gz", req.HomeDirectoryUrl)
	if err != nil {
		log.Info().Msgf("Download failed")
		return err
	}
	log.Info().Msgf("Download done")

	err = Backup("/home/deepfence")
	if err != nil {
		return err
	}
	err = Backup("/usr/local/discovery")
	if err != nil {
		return err
	}

	log.Info().Msgf("Backup done")

	pid, _, _ := syscall.Syscall(syscall.SYS_FORK, 0, 0, 0)
	if pid == 0 {

		log.Info().Msgf("Inside child\n")

		c, err := supervisord.NewUnixSocketClient("/var/run/supervisor.sock")
		if err != nil {
			log.Fatal().Err(err)
		}

		log.Info().Msgf("Extract")

		err = extractTarGz("/tmp/deepfence.tar.gz", "/")
		if err != nil {
			log.Fatal().Err(err)
		}

		log.Info().Msgf("Kill")
		_, err = c.SignalAllProcesses(syscall.SIGKILL)
		if err != nil {
			log.Error().Msgf("Kill all err: %v", err)
		}
		log.Info().Msgf("Done")

		os.Exit(0)
	}

	log.Info().Msgf("Child created: %v\n", pid)

	proc, err := os.FindProcess(int(pid))
	if err == nil {
		_, _ = proc.Wait()
	}

	log.Info().Msgf("Child dead\n")
	os.Exit(0)

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
