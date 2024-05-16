package supervisor

import (
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
	SelfID               = "deepfenced"
	logRootEnv           = "${DF_INSTALL_DIR}/var/log/deepfenced/"
	ExitCodeBashNotFound = 127
)

var (
	ErrPath           = errors.New("no paths")
	ErrAlreadyRunning = errors.New("already running")
	ErrNotRunning     = errors.New("not running")
)

var (
	processes = map[string]*procHandler{}
	access    = sync.RWMutex{}
	logRoot   string
)

func init() {
	logRoot = os.ExpandEnv(logRootEnv)
	err := os.Mkdir(logRoot, os.ModeDir)
	if err != nil {
		log.Error().Msgf("Failed to create %v: %v", logRoot, err)
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
	expandedEnvs := os.Environ()
	for i := range envs {
		expandedEnvs = append(expandedEnvs, os.ExpandEnv(envs[i]))
	}
	return &procHandler{
		name:        name,
		path:        os.ExpandEnv(path),
		started:     false,
		wait:        func() error { return ErrNotRunning },
		kill:        func() error { return ErrNotRunning },
		autorestart: autorestart,
		cgroup:      cgroup,
		command:     os.ExpandEnv(command),
		env:         expandedEnvs,
	}
}

func startLogging(name string, cmd *exec.Cmd) {
	f, err := os.OpenFile(logRoot+name+".log", os.O_WRONLY|os.O_CREATE|os.O_APPEND|os.O_SYNC, 0666)
	if err != nil {
		log.Error().Msgf("Cannot start logging: %v", err)
		return
	}
	cmd.Stdout = f
	cmd.Stderr = f
}

func (ph *procHandler) start() error {
	if ph.started {
		return ErrAlreadyRunning
	}
	cmd := exec.Command("/bin/bash", "-c", ph.command)
	cmd.Env = ph.env
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Pdeathsig: syscall.SIGKILL,
	}
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
		done := make(chan bool)

		go func() {
			shortRetries := 5
		loop:
			for {
				err := cmd.Start()
				startTime := time.Now()
				if err != nil {
					log.Error().Msgf("Failed to start, name:%s, error:%s", ph.name, err.Error())
					break loop
				}
				if ph.cgroup != "" {
					err = cgroups.AttachProcessToCgroup(ph.cgroup, cmd.Process.Pid)
					if err != nil {
						log.Error().Msgf("cgroup failed, name:%s, error:%s", ph.name, err.Error())
					}
				}
				go func() {
					err = cmd.Wait()
					if err != nil {
						if e, is := err.(*exec.ExitError); is {
							if e.ExitCode() == ExitCodeBashNotFound {
								done <- false
							}
						}
						log.Error().Msgf("Done with error, name:%s, error:%s", ph.name, err.Error())
					}
					log.Info().Msgf("Process: %s exited", ph.name)
					done <- true
				}()

				select {
				case <-stop:
					_ = cmd.Process.Signal(syscall.SIGTERM)
					break loop
				case restart := <-done:
					if !restart {
						log.Info().Msgf("%s defenitively stopped", ph.command)
						break loop
					}

					stopTime := time.Now()
					if stopTime.Sub(startTime) <= 5*time.Second {
						shortRetries -= 1
						if shortRetries == 0 {
							log.Info().Msgf("%s keeps crashing, stopped", ph.command)
							// set flag to inicate the process is stopped
							ph.started = false
							break loop
						}
					} else {
						shortRetries = 5
					}

					log.Info().Msgf("%s restarting...", ph.command)
					time.Sleep(time.Second * 5)
					cmd = exec.Command("/bin/bash", "-c", ph.command)
					cmd.Env = ph.env
					cmd.SysProcAttr = &syscall.SysProcAttr{
						Pdeathsig: syscall.SIGKILL,
					}
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
	if !ph.started {
		log.Info().Msgf("Process:%s not running", ph.name)
		return nil
	}

	log.Info().Msgf("Killing process:%s", ph.name)
	err := ph.kill()
	if err != nil {
		log.Error().Msgf("Error in process kill:%s, error:%s", ph.name, err.Error())
	}

	log.Info().Msgf("Process kill signal sent: %s", ph.name)

	ph.started = false

	err = ph.wait()

	if err != nil {
		log.Error().Msgf("Process kill wait error:%s, error:%s", ph.name, err.Error())
	} else {
		log.Info().Msgf("Process kill wait complete: %s", ph.name)
	}

	return nil
}

var selfAccess sync.Mutex

func selfUpgradeFromFile(path string) error {
	selfAccess.Lock()
	defer selfAccess.Unlock()

	log.Info().Msgf("Running SelfUpgradeFromFile, path:%s", path)
	f, err := os.Open(path)
	if err != nil {
		log.Error().Msgf("SelfUpgradeFromFile, error:%s", err.Error())
		return err
	}

	tries := 3
	for {
		if tries == 0 {
			break
		}
		tries -= 1

		err = selfupdate.Apply(f, selfupdate.Options{})
		if err != nil {
			log.Error().Msgf("SelfUpgradeFromFile, selfupdate.Apply error:%s", err.Error())
			rollerr := selfupdate.RollbackError(err)
			if rollerr != nil {
				log.Error().Msgf("SelfUpgradeFromFile, error:%s", rollerr.Error())
				return rollerr
			}
		} else {
			break
		}
	}
	return err
}

func selfUpgradeFromURL(url string) error {
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

func WriteTo(dst, org string) error {
	out, err := os.Create(dst)
	if err != nil {
		log.Error().Msgf(err.Error())
		return err
	}
	defer out.Close()

	in, err := os.Open(org)
	if err != nil {
		log.Error().Msgf(err.Error())
		return err
	}
	defer in.Close()

	_, err = io.Copy(out, in)

	return err
}

func UpgradeProcessFromFile(name, path string, restartSelf bool) error {
	if name == SelfID {
		return selfUpgradeFromFile(path)
	}

	access.RLock()
	process, has := processes[name]
	access.RUnlock()
	if !has {
		return ErrPath
	}
	process.access.Lock()
	defer process.access.Unlock()

	restart := false
	if process.started {
		log.Info().Msgf("Stop process started: %s", name)
		err := process.stop()
		if err != nil {
			return err
		}
		log.Info().Msgf("Stop process done: %s", name)
		restart = true
	}

	//process.path= /home/deepfence/bin/cloud_scanner
	//path=/tmp/bins1655807479/cloud_scanner
	err := WriteTo(process.path, path)
	if err != nil {
		return err
	}

	if restart && !restartSelf {
		log.Info().Msgf("Restarting process: %s", name)
		err = process.start()
	}
	return err
}

func UpgradeProcessFromURL(name, url string) error {
	if name == SelfID {
		return selfUpgradeFromURL(url)
	}

	access.RLock()
	process, has := processes[name]
	if !has {
		access.RUnlock()
		return ErrPath
	}
	access.RUnlock()
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
	access.RLock()
	process, has := processes[name]
	access.RUnlock()
	if !has {
		return ErrPath
	}
	process.access.Lock()
	defer process.access.Unlock()
	if process.started {
		return ErrAlreadyRunning
	}
	return process.start()
}

func StopProcess(name string) error {
	access.RLock()
	process, has := processes[name]
	access.RUnlock()
	if !has {
		return ErrPath
	}

	process.access.Lock()
	defer process.access.Unlock()
	if !process.started {
		return ErrNotRunning
	}
	return process.stop()
}

func StopAllProcesses() []error {
	access.RLock()
	defer access.RUnlock()

	errs := []error{}
	for _, process := range processes {
		log.Info().Msgf("Stopping process: %s", process.name)
		err := process.stop()
		if err != nil {
			log.Info().Msgf("Error in Stopping process:%s, error:%s", process.name, err.Error())
			errs = append(errs, err)
		} else {
			log.Info().Msgf("Process stopped:%s", process.name)
		}
	}
	log.Info().Msgf("StopAllProcesses completed")
	return errs
}

func LoadProcess(name, path, command, env string, autorestart bool, cgroup string) {
	access.Lock()
	defer access.Unlock()
	processes[name] = NewProcHandler(name, path, command, env, autorestart, cgroup)
}
