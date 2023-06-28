package supervisor

import (
	"bufio"
	"errors"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/cgroups"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/minio/selfupdate"
)

const (
	self_id      = "self"
	log_root_env = "${DF_INSTALL_DIR}/var/log/deepfenced/"
)

var (
	PathError           = errors.New("No paths")
	AlreadyRunningError = errors.New("Already running")
	NotRunningError     = errors.New("Not running")
)

var (
	processes = map[string]*procHandler{}
	access    = sync.Mutex{}
	log_root  string
)

func init() {
	log_root = os.ExpandEnv(log_root_env)
	err := os.Mkdir(log_root, os.ModeDir)
	if err != nil {
		log.Error().Msgf("Failed to create %v: %v", log_root, err)
	}
}

type procHandler struct {
	name        string
	path        string
	command     string
	env         []string
	started     bool
	wait        func() error
	kill        func() error
	autorestart bool
	access      sync.Mutex
	cgroup      string
}

func NewProcHandler(name, path, command, env string, autorestart bool, cgroup string) *procHandler {
	envs := strings.Split(env, ",")
	expanded_envs := os.Environ()
	for i := range envs {
		expanded_envs = append(expanded_envs, os.ExpandEnv(envs[i]))
	}
	return &procHandler{
		name:        name,
		path:        os.ExpandEnv(path),
		started:     false,
		wait:        func() error { return NotRunningError },
		kill:        func() error { return NotRunningError },
		autorestart: autorestart,
		cgroup:      cgroup,
		command:     os.ExpandEnv(command),
		env:         expanded_envs,
	}
}

func startLogging(name string, cmd *exec.Cmd) {
	outReader, err := cmd.StdoutPipe()
	if err != nil {
		log.Error().Msgf("Cannot start logging: %v", err)
		return
	}
	errReader, err := cmd.StderrPipe()
	if err != nil {
		log.Error().Msgf("Cannot start logging: %v", err)
		return
	}
	cmdReader := io.MultiReader(outReader, errReader)
	f, err := os.Create(log_root + name)
	if err != nil {
		log.Error().Msgf("Cannot start logging: %v", err)
		return
	}
	go func() {
		defer f.Close()
		for {
			scanner := bufio.NewScanner(cmdReader)
			for scanner.Scan() {
				m := scanner.Bytes()
				_, err := f.Write(m)
				if err != nil {
					log.Error().Msgf("Error while logging: %v", err)
					continue
				}
				f.Write([]byte{'\n'})
			}
		}
	}()
}

func (ph *procHandler) start() error {
	if ph.started {
		return AlreadyRunningError
	}
	cmd := exec.Command("/bin/bash", "-c", ph.command)
	cmd.Env = ph.env
	startLogging(ph.name, cmd)
	if !ph.autorestart {
		err := cmd.Start()
		if err != nil {
			return err
		}
		if ph.cgroup != "" {
			err = cgroups.AttachProcessToCgroup(ph.cgroup, cmd.Process.Pid)
			if err != nil {
				log.Error().Msgf("cgroup failed: %v", err)
			}
		}
		ph.wait = func() error {
			return cmd.Wait()
		}
		ph.kill = func() error {
			return cmd.Process.Signal(syscall.SIGTERM)
		}
	} else {
		stop := make(chan struct{})
		ackstop := make(chan struct{})
		done := make(chan struct{})

		go func() {
		loop:
			for {
				err := cmd.Start()
				if err != nil {
					log.Error().Msgf("Failed to start: %v", err)
					break loop
				}
				if ph.cgroup != "" {
					err = cgroups.AttachProcessToCgroup(ph.cgroup, cmd.Process.Pid)
					if err != nil {
						log.Error().Msgf("cgroup failed: %v", err)
					}
				}
				go func() {
					err = cmd.Wait()
					if err != nil {
						log.Error().Msgf("Done with error: %v", err)
					}
					done <- struct{}{}
				}()

				select {
				case <-stop:
					cmd.Process.Signal(syscall.SIGTERM)
					break loop
				case <-done:
					log.Info().Msgf("%s restarting...", ph.command)
					time.Sleep(time.Second * 5)
					cmd = exec.Command("/bin/bash", "-c", ph.command)
					cmd.Env = ph.env
					startLogging(ph.name, cmd)
				}
			}
			<-done
			ackstop <- struct{}{}
		}()

		ph.wait = func() error {
			<-ackstop
			return nil
		}
		ph.kill = func() error {
			stop <- struct{}{}
			return nil
		}
	}
	ph.started = true

	return nil
}

func (ph *procHandler) stop() error {
	ph.kill()

	ph.started = false

	ph.wait()

	return nil
}

var selfAccess sync.Mutex

func selfUpgrade(url string) error {
	selfAccess.Lock()
	defer selfAccess.Unlock()

	tries := 3
	var err error
	for {
		if tries == 0 {
			break
		}
		tries -= 1
		resp, err := http.Get(url)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		err = selfupdate.Apply(resp.Body, selfupdate.Options{})
		if err != nil {
			rollerr := selfupdate.RollbackError(err)
			if rollerr != nil {
				return rollerr
			}
		} else {
			break
		}
	}
	return err
}

func downloadAndWrite(path, url string) error {
	out, err := os.Create(path)
	if err != nil {
		return err
	}
	defer out.Close()

	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	_, err = io.Copy(out, resp.Body)

	return err
}

func UpgradeProcess(name, url string) error {
	if name == self_id {
		return selfUpgrade(url)
	}

	process, has := processes[name]
	if !has {
		return PathError
	}
	process.access.Lock()
	defer process.access.Unlock()

	restart := false
	if process.started {
		log.Debug().Msg("Stop process")
		err := process.stop()
		if err != nil {
			return err
		}
		restart = true
	}

	err := downloadAndWrite(process.path, url)
	if err != nil {
		return err
	}

	if restart {
		log.Debug().Msg("Restart process")
		err = process.start()
	}
	return err
}

func StartProcess(name string) error {
	process, has := processes[name]
	if !has {
		return PathError
	}
	process.access.Lock()
	defer process.access.Unlock()
	if process.started {
		return AlreadyRunningError
	}
	return process.start()
}

func StopProcess(name string) error {
	process, has := processes[name]
	if !has {
		return PathError
	}
	process.access.Lock()
	defer process.access.Unlock()
	if !process.started {
		return NotRunningError
	}
	return process.stop()
}

func LoadProcess(name, path, command, env string, autorestart bool, cgroup string) {
	processes[name] = NewProcHandler(name, path, command, env, autorestart, cgroup)
}
