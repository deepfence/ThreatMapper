// Copyright (c) 2017 Pani Networks
// All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

package ipset

import (
	"context"
	"encoding/xml"
	"io"
	"io/ioutil"
	"os/exec"
	"strconv"
	"strings"

	"github.com/pkg/errors"
	"github.com/romana/rlog"
)

// Handle for an ipset session,
// it keeps state and allocated resources together.
// Handle is open when underlying process
// initizlized and started and hasn't exited yet.
type Handle struct {
	// arguments used to initialize underlying command.
	args []string
	// binary used to initialize underlying command.
	ipsetBin string

	// underlying command.
	cmd *exec.Cmd

	// handleInteractive flag tells to initialize
	// handle for interactive usage.
	handleInteractive bool
	stdin             io.WriteCloser
	stdout            io.ReadCloser
	stderr            io.ReadCloser

	// isOpen indicates if handle is open.
	isOpen func(*Handle) bool
}

var (
	// Default strategy is to allow os figure out where binary is.
	defaultIpsetBin = "ipset"

	// Default strategy is to ignore `already exists` messages
	// on Create/Add and `doesn't exist` messages on Delete calls, and to use
	// interactive mode for Write() call.
	defaultIpsetArgs = []string{"--exist", "-"}
)

// NewHandle takes a variable amount of option functions and returns configured *Handle.
func NewHandle(options ...OptFunc) (*Handle, error) {
	var err error

	ipsetBinWithPath, err := exec.LookPath(defaultIpsetBin)
	if err != nil {
		return nil, err
	}

	h := Handle{
		ipsetBin:          ipsetBinWithPath,
		isOpen:            defaultIsOpenFunc,
		handleInteractive: true,
	}

	for _, opt := range options {
		err = opt(&h)
		if err != nil {
			return nil, errors.Wrap(err, "failed to create handle")
		}

	}

	if len(h.args) == 0 {
		h.args = defaultIpsetArgs
	}

	h.cmd = exec.Command(h.ipsetBin, h.args...)

	if h.handleInteractive {
		h.stdin, err = h.cmd.StdinPipe()
		h.stderr, err = h.cmd.StderrPipe()
		h.stdout, err = h.cmd.StdoutPipe()
	}
	rlog.Tracef(3, "creating handle for %s %s, interactive=%t", h.ipsetBin, h.args, h.handleInteractive)

	return &h, err
}

// Start interactive session, normally transfers the Handle
// into the open state.
func (h *Handle) Start() error {
	return h.cmd.Start()
}

// Wait for handle to stop interactive session and deallocate resources.
func (h *Handle) Wait(ctx context.Context) error {
	if !h.isOpen(h) {
		return ErrorNotStarted
	}

	// users should call Quit() before calling Wait()
	// but just in case they don't.
	_ = h.Quit()

	success := make(chan struct{})
	go func() {
		h.cmd.Wait()
		close(success)
	}()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-success:
	}

	return nil
}

// Write into the open handle.
func (h *Handle) Write(p []byte) (int, error) {
	if !h.isOpen(h) {
		return 0, ErrorNotStarted
	}

	return h.stdin.Write(p)
}

// Read from the open handle.
func (h *Handle) Read(p []byte) (int, error) {
	if !h.isOpen(h) {
		return 0, ErrorNotStarted
	}

	return h.stdout.Read(p)
}

// StdErr provides access to stderr of running process.
func (h *Handle) StdErr() (io.Reader, error) {
	if !h.isOpen(h) {
		return nil, ErrorNotStarted
	}

	return h.stderr, nil
}

// Quit interactive session.
func (h *Handle) Quit() error {
	if !h.isOpen(h) {
		return ErrorNotStarted
	}

	_, err := io.WriteString(h, "quit\n")
	if err != nil {
		return errors.Wrap(err, "failed to finish session")
	}

	return nil

}

// Add members of sets to ipset through the open handle.
func (h *Handle) Add(s renderer) error {
	if s == nil {
		return nil
	}

	if !h.isOpen(h) {
		return ErrorNotStarted
	}

	_, err := io.WriteString(h, s.Render(RenderAdd))
	if err != nil {
		return errors.Wrap(err, "failed to add members")
	}

	return nil
}

// Swap contents of 2 sets through the open handle.
func (h *Handle) Swap(s1, s2 *Set) error {
	if s1 == nil || s2 == nil {
		return ErrorUnexpectedNil
	}

	if s1.Type != s2.Type {
		return ErrorIncompatibleSwap
	}

	if !h.isOpen(h) {
		return ErrorNotStarted
	}

	sets := &Ipset{[]*Set{s1, s2}}
	//	_, err := io.WriteString(h, fmt.Sprintf("swap %s %s\n", s1.Name, s2.Name))
	_, err := io.WriteString(h, sets.Render(RenderSwap))
	if err != nil {
		return errors.Wrap(err, "failed to swap sets")
	}

	return nil
}

// Delete memebers of sets from ipset through the open handle.
func (h *Handle) Delete(s renderer) error {
	if s == nil {
		return nil
	}

	if !h.isOpen(h) {
		return ErrorNotStarted
	}

	_, err := io.WriteString(h, s.Render(RenderDelete))
	if err != nil {
		return errors.Wrap(err, "failed to delete members")
	}

	return nil
}

// Create sets and members in ipset through the open handle.
func (h *Handle) Create(s renderer) error {
	if s == nil {
		return nil
	}

	if !h.isOpen(h) {
		return ErrorNotStarted
	}

	_, err := io.WriteString(h, s.Render(RenderCreate))
	if err != nil {
		return errors.Wrap(err, "failed to create set")
	}

	return nil
}

// Flush sets in ipset through the open handle.
// Warning. Will flush all sets if no sets are given.
func (h *Handle) Flush(s renderer) error {
	if s == nil {
		return nil
	}

	if !h.isOpen(h) {
		return ErrorNotStarted
	}

	_, err := io.WriteString(h, s.Render(RenderFlush))
	if err != nil {
		return errors.Wrap(err, "failed to flush set")
	}

	return nil
}

// Destroy sets in ipset through the open handle.
// Warning. Will destroy everything in ipset if no sets are given.
func (h *Handle) Destroy(s renderer) error {
	if s == nil {
		return nil
	}

	if !h.isOpen(h) {
		return ErrorNotStarted
	}

	_, err := io.WriteString(h, s.Render(RenderDestroy))
	if err != nil {
		return errors.Wrap(err, "failed to destroy set")
	}

	return nil
}

// Add members of sets to ipset.
func Add(set *Set, options ...OptFunc) ([]byte, error) {
	return oneshot(set, nil, RenderAdd, options...)
}

// Create sets and members in ipset.
func Create(set *Set, options ...OptFunc) ([]byte, error) {
	return oneshot(set, nil, RenderCreate, options...)
}

// Delete memebers from ipset.
func Delete(set *Set, options ...OptFunc) ([]byte, error) {
	return oneshot(set, nil, RenderDelete, options...)
}

// Destroy sets in ipset. Destroys everything if no sets are given.
func Destroy(set *Set, options ...OptFunc) ([]byte, error) {
	return oneshot(set, nil, RenderDestroy, options...)
}

// Flush sets in ipset. Flushes everythin if no sets are given.
func Flush(set *Set, options ...OptFunc) ([]byte, error) {
	return oneshot(set, nil, RenderFlush, options...)
}

// Swap contents of 2 sets.
func Swap(set1, set2 *Set, options ...OptFunc) ([]byte, error) {
	if set1 == nil || set2 == nil {
		return nil, ErrorUnexpectedNil
	}
	return oneshot(set1, set2, RenderSwap, options...)
}

// Rename set.
func Rename(set1, set2 *Set, options ...OptFunc) ([]byte, error) {
	if set1 == nil || set2 == nil {
		return nil, ErrorUnexpectedNil
	}
	return oneshot(set1, set2, RenderRename, options...)
}

// Version captures version of ipset and parses it for later verification.
func Version(options ...OptFunc) (*IpsetVersion, error) {
	options = append(options, HandleWithArgs("version"), handleNonInteractive())

	handle, err := NewHandle(options...)
	if err != nil {
		return nil, err
	}

	data, err := handle.cmd.CombinedOutput()
	if err != nil {
		return nil, err
	}

	sdata := strings.TrimSpace(string(data))
	sdata = strings.Replace(sdata, "v", "", -1)
	sdata = strings.Replace(sdata, ",", "", -1)
	temp := strings.Split(sdata, " ")
	if len(temp) < 2 {
		return nil, errors.Errorf("can not parse %s as a version string", string(data))
	}

	verUtil := strings.Split(temp[1], ".")
	if len(verUtil) < 2 {
		return nil, errors.Errorf("can not parse %s as a version string", string(data))
	}

	major, err := strconv.Atoi(verUtil[0])
	if err != nil {
		return nil, errors.Wrapf(err, "can not parse %s as a version string", string(data))
	}

	minor, err := strconv.Atoi(verUtil[1])
	if err != nil {
		return nil, errors.Wrapf(err, "can not parse %s as a version string", string(data))
	}

	verProto, err := strconv.Atoi(temp[len(temp)-1])
	if err != nil {
		return nil, errors.Wrapf(err, "can not parse %s as a version string", string(data))
	}

	return &IpsetVersion{Major: major, Minor: minor, Proto: verProto}, nil
}

// IpsetVersion prepresents ipset version.
type IpsetVersion struct {
	Major int
	Minor int
	Proto int
}

// Check that given version is supported.
func (v *IpsetVersion) Check() bool {
	if v == nil {
		return false
	}
	return v.Major >= SupportedVersionMajor && v.Minor >= SupportedVersionMinor && v.Proto >= SupportVersionProto
}

// Test tests existence of a set or existence of member in a set.
func Test(set1 *Set, options ...OptFunc) ([]byte, error) {
	return oneshot(set1, nil, RenderTest, options...)
}

// oneshot creates a temporary handle to execute one command.
func oneshot(set1, set2 *Set, rType RenderType, options ...OptFunc) ([]byte, error) {
	iset := &Ipset{}
	if set1 != nil {
		iset.Sets = append(iset.Sets, set1)
	}
	if set2 != nil {
		iset.Sets = append(iset.Sets, set2)
	}

	args := renderSet2args(iset, rType)
	options = append(options, HandleAppendArgs(args...), handleNonInteractive())

	handle, err := NewHandle(options...)
	if err != nil {
		return nil, err
	}

	rlog.Tracef(3, "executing %s %s", handle.ipsetBin, handle.args)

	return handle.cmd.CombinedOutput()
}

// IsSuccessful returns true if process has exited with exit code=0.
func (h *Handle) IsSuccessful() bool {
	if h.cmd == nil || h.cmd.ProcessState == nil {
		return false
	}

	return h.cmd.ProcessState.Success()
}

// OptFunc is a signature for option functions that change
// configuration of handle.
type OptFunc func(*Handle) error

// HandleWithBin is an options to use non default location of ipset binary.
func HandleWithBin(bin string) OptFunc {
	return func(h *Handle) error {
		h.ipsetBin = bin
		return nil
	}
}

// handleNonInteractive configures handle for non-interactive mode.
func handleNonInteractive() OptFunc {
	return func(h *Handle) error {
		h.handleInteractive = false
		return nil
	}
}

// HandleWithArgs is an options for to use non default arguments for call to ipset binary.
func HandleWithArgs(args ...string) OptFunc {
	return func(h *Handle) error {
		h.args = args
		return nil
	}
}

// HandleAppendArgs is an options that adds more args after HandleWithArgs was used.
func HandleAppendArgs(args ...string) OptFunc {
	return func(h *Handle) error {
		h.args = append(h.args, args...)
		return nil
	}
}

// Load ipset config from system.
func Load(ctx context.Context, options ...OptFunc) (*Ipset, error) {

	// this will override any arguments passed down with options.
	options = append([]OptFunc{HandleWithArgs("save", "-o", "xml")}, options...)

	handle, err := NewHandle(options...)
	if err != nil {
		return nil, errors.Wrap(err, "failed to create ipset handler")
	}

	err = handle.Start()
	if err != nil {
		return nil, errors.Wrap(err, "failed to start ipset")
	}

	var ipset Ipset
	err = xml.NewDecoder(handle.stdout).Decode(&ipset)
	if err != nil {
		return nil, errors.Wrap(err, "failed to parse ipset config")
	}

	rlog.Tracef(3, "loaded %d sets from ipset", len(ipset.Sets))

	handle.Wait(ctx)

	return &ipset, nil

}

// LoadFromFile loads ipset config from xml file produced with ipset save -o xml.
func LoadFromFile(filename string) (*Ipset, error) {
	rlog.Tracef(3, "loading ipset configuration form file %s", filename)

	data, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load ipset config from file")
	}

	var ipset Ipset
	err = xml.Unmarshal(data, &ipset)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load ipset config from file")
	}

	rlog.Tracef(3, "loaded %d sets from file", len(ipset.Sets))

	return &ipset, nil
}

// renderSet2args is a helper that renders sets for use with oneshot functions.
func renderSet2args(iset renderer, rType RenderType) []string {
	// by default Render produces interactive version
	// of commands that have \n at the end,
	// this removes it for compatibility with
	// oneshot version of functions.
	trimmed := strings.TrimSpace(iset.Render(rType))
	return strings.Split(trimmed, " ")
}

// renderer abstracts render behavior which allows treating
// Ipset and Set objects similarly.
type renderer interface {
	Render(rType RenderType) string
}

// defaultIsOpenFunc is true when underlying process started
// and not exited.
func defaultIsOpenFunc(h *Handle) bool {
	if h == nil || h.cmd == nil {
		return false
	}

	started := h.cmd.Process != nil
	exited := h.cmd.ProcessState != nil

	return started && !exited
}

// Error represents errors.
type Error string

func (e Error) Error() string { return string(e) }

// Errors
const (
	ErrorNotStarted       Error = "Process not started"
	ErrorUnexpectedNil    Error = "function does not accept nil"
	ErrorIncompatibleSwap Error = "swaped sets must be of the same type"
	ErrorItemExist        Error = "item already in collection"
)

// SuppressItemExist suppresses ErrorItemExist error.
func SuppressItemExist(e error) error {
	if errors.Cause(e) == ErrorItemExist {
		return nil
	}
	return e
}

// Minimal ipset version supported by this package.
const (
	SupportedVersionMajor int = 6
	SupportedVersionMinor int = 29
	SupportVersionProto       = 6
)
