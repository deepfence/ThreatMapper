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
	"strings"
	"testing"

	"github.com/pkg/errors"
)

func TestRender(t *testing.T) {
	cases := []struct {
		name   string
		sets   Ipset
		rType  RenderType
		expect string
	}{
		{
			name: "Render set and member for test",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashNet, Members: []Member{{Elem: "foo"}}},
			}},
			rType:  RenderTest,
			expect: "test super foo",
		},
		{
			name: "Render set  for test",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashNet},
			}},
			rType:  RenderTest,
			expect: "test super",
		},
		{
			name: "Render set and members",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashNet, Members: []Member{{Elem: "foo"}, {Elem: "bar"}}},
			}},
			rType:  RenderSave,
			expect: "create super hash:net \nadd super foo\nadd super bar\n",
		},
		{
			name: "Render set and members with counters",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashIP, Header: Header{Counters: new(string)},
					Members: []Member{{Elem: "foo", Packets: 42, Bytes: 1024}}},
			}},
			rType:  RenderSave,
			expect: "create super hash:ip  counters\nadd super foo packets 42 bytes 1024\n",
		},
		{
			name: "Render set and members with timeout",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashIP, Header: Header{Timeout: 600},
					Members: []Member{{Elem: "foo", Timeout: 300}, {Elem: "bar"}}},
			}},
			rType:  RenderSave,
			expect: "create super hash:ip  timeout 600\nadd super foo timeout 300\nadd super bar\n",
		},
		{
			name: "Render set and members with nomatch",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashNet,
					Members: []Member{{Elem: "foo"}, {Elem: "bar", NoMatch: new(string)}}},
			}},
			rType:  RenderSave,
			expect: "create super hash:net \nadd super foo\nadd super bar nomatch\n",
		},
		{
			name: "Render set and members with comment",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashIP, Header: Header{Comment: new(string)},
					Members: []Member{{Elem: "foo", Comment: "allow access to SMB share on fileserv"}}},
			}},
			rType:  RenderSave,
			expect: "create super hash:ip  comment\nadd super foo comment allow access to SMB share on fileserv\n",
		},
		{
			name: "Render set and members with skb",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashIP, Header: Header{SKBInfo: new(string)},
					Members: []Member{{Elem: "foo", SKBMark: "0x1111/0xff00ffff", SKBPrio: "1:10", SKBQueue: "10"}}},
			}},
			rType:  RenderSave,
			expect: "create super hash:ip  skbinfo\nadd super foo skbmark 0x1111/0xff00ffff skbprio 1:10 skbqueue 10\n",
		},
		{
			name: "Render set and members with hashsize",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashIP, Header: Header{Hashsize: 1536}}}},
			rType:  RenderSave,
			expect: "create super hash:ip  hashsize 1536\n",
		},
		{
			name: "Render set and members with maxelem",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashIP, Header: Header{Maxelem: 2048}}}},
			rType:  RenderSave,
			expect: "create super hash:ip  maxelem 2048\n",
		},
		{
			name: "Render set and members with family",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashIP, Header: Header{Family: MemberFamilyInet6}}}},
			rType:  RenderSave,
			expect: "create super hash:ip  family inet6\n",
		},
		{
			name: "Render set and members with forceadd",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashIP, Header: Header{Forceadd: NoVal}}}},
			rType:  RenderSave,
			expect: "create super hash:ip  forceadd\n",
		},
		{
			name: "Render set with size",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetListSet, Header: Header{Size: 8}}}},
			rType:  RenderSave,
			expect: "create super list:set  size 8\n",
		},
		{
			name: "Render set and members with range",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashIP, Header: Header{Range: "192.168.0.0/16"}}}},
			rType:  RenderSave,
			expect: "create super hash:ip  range 192.168.0.0/16\n",
		},
		{
			name: "Render set and members with range and mac",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetBitmapIPMac, Header: Header{Range: "192.168.0.0/16"},
					Members: []Member{{Elem: "192.168.1/24"}}},
			}},
			rType:  RenderSave,
			expect: "create super bitmap:ip,mac  range 192.168.0.0/16\nadd super 192.168.1/24\n",
		},
		{
			name: "Render set and members with range and port",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetBitmapPort, Header: Header{Range: "0-1024"},
					Members: []Member{{Elem: "80"}}},
			}},
			rType:  RenderSave,
			expect: "create super bitmap:port  range 0-1024\nadd super 80\n",
		},
		{
			name: "Render set and members with netmask",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashIP, Header: Header{Netmask: 30},
					Members: []Member{{Elem: "192.168.1.0/24"}}},
			}},
			rType:  RenderSave,
			expect: "create super hash:ip  netmask 30\nadd super 192.168.1.0/24\n",
		},
		{
			name: "Render set with header",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashNet, Header: Header{Family: "inet", Hashsize: 4}},
			}},
			rType:  RenderSave,
			expect: "create super hash:net  family inet hashsize 4\n",
		},
		{
			name: "Render set members for creation",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashNet, Members: []Member{{Elem: "foo"}, {Elem: "bar"}}},
			}},
			rType:  RenderAdd,
			expect: "add super foo\nadd super bar\n",
		},
		{
			name: "Render set members for deleteion",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashNet, Members: []Member{{Elem: "foo"}, {Elem: "bar"}}},
			}},
			rType:  RenderDelete,
			expect: "del super foo\ndel super bar\n",
		},
		{
			name: "Render sets for flush",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashNet, Members: []Member{{Elem: "foo"}, {Elem: "bar"}}},
			}},
			rType:  RenderFlush,
			expect: "flush super\n",
		},
		{
			name: "Render sets for destroy",
			sets: Ipset{Sets: []*Set{
				{Name: "super", Type: SetHashNet, Members: []Member{{Elem: "foo"}, {Elem: "bar"}}},
			}},
			rType:  RenderDestroy,
			expect: "destroy super\n",
		},
		{
			name:   "Render flush all",
			sets:   Ipset{},
			rType:  RenderFlush,
			expect: "flush\n",
		},
		{
			name:   "Render destroy all",
			sets:   Ipset{},
			rType:  RenderDestroy,
			expect: "destroy\n",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			res := tc.sets.Render(tc.rType)
			if res != tc.expect {
				t.Fatalf("Expected:\n%s\ngot:\n%s\n", []byte(tc.expect), []byte(res))
			}
		})
	}
}

func TestNewSet(t *testing.T) {
	cases := []struct {
		name    string
		setName string
		setType SetType
		args    []SetOpt
		expect  func(*Set, error) bool
	}{
		{
			name:    "make simple set",
			setName: "super",
			setType: SetHashNet,
			args:    []SetOpt{SetWithFamily("inet"), SetWithRevision(1)},
			expect:  func(s *Set, e error) bool { return s.Header.Family == "inet" && e == nil },
		},
		{
			name:    "test set size",
			setName: "super",
			setType: SetListSet,
			args:    []SetOpt{SetWithSize(4)},
			expect:  func(s *Set, e error) bool { return s.Header.Size == 4 && e == nil },
		},
		{
			name:    "test set size with error",
			setName: "super",
			setType: SetHashNet,
			args:    []SetOpt{SetWithSize(4)},
			expect:  func(s *Set, e error) bool { return strings.Contains(e.Error(), "incompatible") },
		},
		{
			name:    "test set range",
			setName: "super",
			setType: SetBitmapIP,
			args:    []SetOpt{SetWithRange("192.168.0.0/16")},
			expect:  func(s *Set, e error) bool { return s.Header.Range == "192.168.0.0/16" && e == nil },
		},
		{
			name:    "test set range with error",
			setName: "super",
			setType: SetHashNet,
			args:    []SetOpt{SetWithRange("192.168.0.0/16")},
			expect:  func(s *Set, e error) bool { return strings.Contains(e.Error(), "incompatible") },
		},
		{
			name:    "test hashsize",
			setName: "super",
			setType: SetHashNet,
			args:    []SetOpt{SetWithHashsize(4)},
			expect:  func(s *Set, e error) bool { return s.Header.Hashsize == 4 && e == nil },
		},
		{
			name:    "test hashsize with error",
			setName: "super",
			setType: SetBitmapIP,
			args:    []SetOpt{SetWithHashsize(4)},
			expect:  func(s *Set, e error) bool { return strings.Contains(e.Error(), "incompatible") },
		},
		{
			name:    "test maxelem",
			setName: "super",
			setType: SetHashNet,
			args:    []SetOpt{SetWithMaxelem(4)},
			expect:  func(s *Set, e error) bool { return s.Header.Maxelem == 4 && e == nil },
		},
		{
			name:    "test netmask with error",
			setName: "super",
			setType: SetHashNet,
			args:    []SetOpt{SetWithNetmask(30)},
			expect:  func(s *Set, e error) bool { return strings.Contains(e.Error(), "incompatible") },
		},
		{
			name:    "test netmask",
			setName: "super",
			setType: SetBitmapIP,
			args:    []SetOpt{SetWithNetmask(30)},
			expect:  func(s *Set, e error) bool { return s.Header.Netmask == 30 && e == nil },
		},
		{
			name:    "test forceadd with error",
			setName: "super",
			setType: SetBitmapIP,
			args:    []SetOpt{SetWithForceadd()},
			expect:  func(s *Set, e error) bool { return strings.Contains(e.Error(), "incompatible") },
		},
		{
			name:    "test forceadd",
			setName: "super",
			setType: SetHashNet,
			args:    []SetOpt{SetWithForceadd()},
			expect:  func(s *Set, e error) bool { return s.Header.Forceadd == NoVal && e == nil },
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			s, err := NewSet(tc.setName, tc.setType, tc.args...)
			if !tc.expect(s, err) {
				if s != nil {
					t.Logf("Header: %+v", s.Header)
				}
				t.Fatalf("Unexpected NewSet() %+v, %s", s, err)
			}
		})
	}
}

func TestAddMember(t *testing.T) {
	cases := []struct {
		name   string
		set    Set
		elem   string
		args   []MemberOpt
		expect func(*Set, error) bool
	}{
		{
			name: "add member to set",
			set:  Set{Name: "super", Type: SetHashNet, Header: Header{}},
			elem: "foo",
			args: []MemberOpt{},
			expect: func(s *Set, e error) bool {
				return e == nil
			},
		},
		{
			name: "error when adding duplicate set",
			set:  Set{Name: "super", Type: SetHashNet, Header: Header{}, Members: []Member{Member{Elem: "foo"}}},
			elem: "foo",
			args: []MemberOpt{},
			expect: func(s *Set, e error) bool {
				return errors.Cause(e) == ErrorItemExist
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			m, _ := NewMember(tc.elem, nil, tc.args...)
			err := tc.set.AddMember(m)
			if !tc.expect(&tc.set, err) {
				t.Fatalf("Unexpected NewMember() %+v, %s", tc.set, err)
			}
		})
	}

}

func TestAddSet(t *testing.T) {
	cases := []struct {
		name   string
		sets   Ipset
		set    Set
		expect func(*Ipset, error) bool
	}{
		{
			name: "add set",
			sets: Ipset{},
			set:  Set{Name: "super", Type: SetHashNet, Header: Header{}},
			expect: func(s *Ipset, e error) bool {
				return e == nil
			},
		},
		{
			name: "error when adding duplicate set",
			set:  Set{Name: "super", Type: SetHashNet},
			sets: Ipset{Sets: []*Set{&Set{Name: "super"}}},
			expect: func(s *Ipset, e error) bool {
				return errors.Cause(e) == ErrorItemExist
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.sets.AddSet(&tc.set)
			if !tc.expect(&tc.sets, err) {
				t.Fatalf("Unexpected NewMember() %+v, %s", tc.sets, err)
			}
		})
	}

}
