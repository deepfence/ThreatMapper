package host

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"syscall"
	"crypto/tls"

	"github.com/abrander/go-supervisord"
	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

func StartAgentUpgrade(req ctl.StartAgentUpgradeRequest) error {

	console_ip := os.Getenv("MGMT_CONSOLE_URL")
	url := strings.ReplaceAll(req.HomeDirectoryUrl, "deepfence-file-server:9000", fmt.Sprintf("%s/file-server", console_ip))
	fmt.Println("Fetching %v", url)
	err := downloadFile("/tmp/deepfence.tar.gz", url)
	if err != nil {
		return err
	}

	Backup("/home/deepfence")

	pid, _, _ := syscall.Syscall(syscall.SYS_FORK, 0, 0, 0)
	if pid == 0 {

		c, err := supervisord.NewUnixSocketClient("/var/run/supervisor.sock")
		if err != nil {
			log.Fatal().Err(err)
		}

		err = extractTarGz("/tmp/deepfence.tar.gz", "/home/deepfence")
		if err != nil {
			log.Fatal().Err(err)
		}

		err = c.Restart()
		if err != nil {
			log.Fatal().Err(err)
		}
		os.Exit(0)
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

func Backup(dir string) {
	cmd := exec.Command("mv", dir, dir+".old")
	cmd.Run()
	cmd = exec.Command("mkdir", "-p", dir)
	cmd.Run()
}
