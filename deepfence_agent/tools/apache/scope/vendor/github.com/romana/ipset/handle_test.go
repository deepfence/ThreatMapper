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
	"bytes"
	"io"
	"os/exec"
	"strings"
	"testing"

	"github.com/pkg/errors"
)

func TestNew(t *testing.T) {
	cases := []struct {
		name    string
		options []OptFunc
		expect  func(*Handle) bool
	}{
		{
			name: "create new set",
			options: []OptFunc{
				HandleWithBin("/test"),
				HandleWithArgs("save"),
			},
			expect: func(h *Handle) bool { return h.ipsetBin == "/test" && h.args[0] == "save" },
		},
		{
			name: "fail to create new set",
			options: []OptFunc{
				func(h *Handle) error { return errors.New("Dummy err") },
			},
			expect: func(h *Handle) bool { return h == nil },
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			res, _ := NewHandle(tc.options...)
			if !tc.expect(res) {
				t.Fatalf(tc.name)
			}
		})
	}
}

type fakeBuffer struct {
	bytes.Buffer
}

func (*fakeBuffer) Close() error { return nil }

var testBuffer = fakeBuffer{}

func TestWrite(t *testing.T) {
	cases := []struct {
		name   string
		handle *Handle
		expect func(*Handle, error) bool
	}{
		{
			name: "fail on closed process",
			handle: &Handle{
				cmd:    &exec.Cmd{},
				stdin:  &testBuffer,
				isOpen: defaultIsOpenFunc,
			},
			expect: func(h *Handle, err error) bool { return strings.Contains(err.Error(), "Process not started") },
		},
		{
			name: "fail on unexpected write result",
			handle: &Handle{
				cmd:    &exec.Cmd{},
				stdin:  &testBuffer,
				isOpen: func(*Handle) bool { return true },
			},
			expect: func(h *Handle, err error) bool { return testBuffer.String() == "Test" },
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			testBuffer.Reset()
			_, err := io.WriteString(tc.handle, "Test")
			if !tc.expect(tc.handle, err) {
				t.Fatalf("%s with buffer %s, error=%s", tc.name, testBuffer.String(), err)
			}
		})
	}
}

func TestAdd(t *testing.T) {
	cases := []struct {
		name   string
		handle *Handle
		set    *Set
		expect func(*Handle, error) bool
	}{
		{
			name: "fail on unexpected Add()",
			handle: &Handle{
				cmd:    &exec.Cmd{},
				stdin:  &testBuffer,
				isOpen: func(*Handle) bool { return true },
			},
			set:    &Set{Name: "super", Type: "hash:net", Members: []Member{{Elem: "foo"}, {Elem: "bar"}}},
			expect: func(h *Handle, err error) bool { return testBuffer.String() == "add super foo\nadd super bar\n" },
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			testBuffer.Reset()
			err := tc.handle.Add(tc.set)
			if !tc.expect(tc.handle, err) {
				t.Fatalf("%s with buffer %s, error=%s", tc.name, testBuffer.String(), err)
			}
		})
	}
}

func TestDelete(t *testing.T) {
	cases := []struct {
		name   string
		handle *Handle
		set    *Set
		expect func(*Handle, error) bool
	}{
		{
			name: "fail on unexpected Delete()",
			handle: &Handle{
				cmd:    &exec.Cmd{},
				stdin:  &testBuffer,
				isOpen: func(*Handle) bool { return true },
			},
			set:    &Set{Name: "super", Type: "hash:net", Members: []Member{{Elem: "foo"}, {Elem: "bar"}}},
			expect: func(h *Handle, err error) bool { return testBuffer.String() == "del super foo\ndel super bar\n" },
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			testBuffer.Reset()
			err := tc.handle.Delete(tc.set)
			if !tc.expect(tc.handle, err) {
				t.Fatalf("%s with buffer %s, error=%s", tc.name, testBuffer.String(), err)
			}
		})
	}
}

func TestCreate(t *testing.T) {
	cases := []struct {
		name   string
		handle *Handle
		set    *Set
		expect func(*Handle, error) bool
	}{
		{
			name: "fail on unexpected Create()",
			handle: &Handle{
				cmd:    &exec.Cmd{},
				stdin:  &testBuffer,
				isOpen: func(*Handle) bool { return true },
			},
			set: &Set{Name: "super", Type: "hash:net",
				Members: []Member{{Elem: "foo"}, {Elem: "bar"}},
				Header:  Header{Hashsize: 1}},
			expect: func(h *Handle, err error) bool { return testBuffer.String() == "create super hash:net  hashsize 1\n" },
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			testBuffer.Reset()
			err := tc.handle.Create(tc.set)
			if !tc.expect(tc.handle, err) {
				t.Fatalf("%s with buffer %s, error=%s", tc.name, testBuffer.String(), err)
			}
		})
	}
}

func TestFlush(t *testing.T) {
	cases := []struct {
		name   string
		handle *Handle
		set    *Set
		expect func(*Handle, error) bool
	}{
		{
			name: "fail on unexpected Flush()",
			handle: &Handle{
				cmd:    &exec.Cmd{},
				stdin:  &testBuffer,
				isOpen: func(*Handle) bool { return true },
			},
			set: &Set{Name: "super", Type: "hash:net",
				Members: []Member{{Elem: "foo"}, {Elem: "bar"}},
				Header:  Header{Hashsize: 1}},
			expect: func(h *Handle, err error) bool { return testBuffer.String() == "flush super\n" },
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			testBuffer.Reset()
			err := tc.handle.Flush(tc.set)
			if !tc.expect(tc.handle, err) {
				t.Fatalf("%s with buffer %s, error=%s", tc.name, testBuffer.String(), err)
			}
		})
	}
}

func TestDestroy(t *testing.T) {
	cases := []struct {
		name   string
		handle *Handle
		set    *Set
		expect func(*Handle, error) bool
	}{
		{
			name: "fail on unexpected Destroy()",
			handle: &Handle{
				cmd:    &exec.Cmd{},
				stdin:  &testBuffer,
				isOpen: func(*Handle) bool { return true },
			},
			set: &Set{Name: "super", Type: "hash:net",
				Members: []Member{{Elem: "foo"}, {Elem: "bar"}},
				Header:  Header{Hashsize: 1}},
			expect: func(h *Handle, err error) bool { return testBuffer.String() == "destroy super\n" },
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			testBuffer.Reset()
			err := tc.handle.Destroy(tc.set)
			if !tc.expect(tc.handle, err) {
				t.Fatalf("%s with buffer %s, error=%s", tc.name, testBuffer.String(), err)
			}
		})
	}
}
