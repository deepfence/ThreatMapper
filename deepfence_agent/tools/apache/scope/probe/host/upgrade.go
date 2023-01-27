package host

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"

	"github.com/abrander/go-supervisord"
	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
)

func StartAgentUpgrade(req ctl.StartAgentUpgradeRequest) error {

	err := downloadFile("/tmp/deepfence.tar.gz", req.HomeDirectoryUrl)
	if err != nil {
		return err
	}

	c, err := supervisord.NewUnixSocketClient("/var/run/supervisor.sock")
	if err != nil {
		return err
	}

	err = c.ClearLog()
	if err != nil {
		return err
	}

	_, err = c.StopAllProcesses(true)
	if err != nil {
		return err
	}

	Backup("/home/deepfence")

	err = extractTarGz("/tmp/deepfence.tar.gz", "/home/deepfence")
	if err != nil {
		return err
	}

	_, err = c.StartAllProcesses(true)
	if err != nil {
		return err
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

	// Get the data
	resp, err := http.Get(url)
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

func Backup(dir string) {
	cmd := exec.Command("mv", dir, dir+".old")
	cmd.Run()
	cmd = exec.Command("mkdir", "-p", dir)
	cmd.Run()
}
