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
	fmt.Printf("Fetching %v\n", req.HomeDirectoryUrl)
	err := downloadFile("/tmp/deepfence.tar.gz", req.HomeDirectoryUrl)
	if err != nil {
		fmt.Printf("Download failed\n")
		return err
	}
	fmt.Printf("Download done\n")

	Backup("/home/deepfence")
	Backup("/usr/local/discovery")

	fmt.Printf("Backup done\n")

	pid, _, _ := syscall.Syscall(syscall.SYS_FORK, 0, 0, 0)
	if pid == 0 {

		fmt.Printf("Inside child\n")

		c, err := supervisord.NewUnixSocketClient("/var/run/supervisor.sock")
		if err != nil {
			log.Fatal().Err(err)
		}

		fmt.Printf("Extract\n")

		err = extractTarGz("/tmp/deepfence.tar.gz", "/")
		if err != nil {
			log.Fatal().Err(err)
		}

		fmt.Printf("Kill\n")
		c.SignalAllProcesses(syscall.SIGKILL)

		fmt.Printf("Done\n")

		os.Exit(0)
	}

	fmt.Printf("Child created: %v\n", pid)

	proc, err := os.FindProcess(int(pid))
	proc.Wait()

	fmt.Printf("Child dead\n")
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

func Backup(dir string) {
	cmd := exec.Command("mv", dir, dir+".old")
	cmd.Run()
	cmd = exec.Command("mkdir", "-p", dir)
	cmd.Run()
}
