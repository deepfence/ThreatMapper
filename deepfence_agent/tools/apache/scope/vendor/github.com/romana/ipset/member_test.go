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
	"testing"

	"github.com/pkg/errors"
)

func TestNewMember(t *testing.T) {
	cases := []struct {
		name   string
		set    Set
		elem   string
		args   []MemberOpt
		expect func(*Member, error) bool
	}{
		{
			name: "error when set doesn't allow comments",
			set:  Set{Name: "super", Type: SetHashNet, Header: Header{}},
			elem: "foo",
			args: []MemberOpt{MemberWithComment("test")},
			expect: func(m *Member, e error) bool {
				return errors.Cause(e).Error() == "comment options used with incompatible set"
			},
		},
		{
			name:   "set allows comments",
			set:    Set{Name: "super", Type: SetHashNet, Header: Header{Comment: new(string)}},
			elem:   "foo",
			args:   []MemberOpt{MemberWithComment("test")},
			expect: func(m *Member, e error) bool { return m.Comment == "test" && e == nil },
		},
		{
			name: "error when set doesn't allow timeouts",
			set:  Set{Name: "super", Type: SetHashNet, Header: Header{}},
			elem: "foo",
			args: []MemberOpt{MemberWithTimeout(10)},
			expect: func(m *Member, e error) bool {
				return errors.Cause(e).Error() == "timeout options used with incompatible set"
			},
		},
		{
			name:   "set allows timeouts",
			set:    Set{Name: "super", Type: SetHashNet, Header: Header{Timeout: 1}},
			elem:   "foo",
			args:   []MemberOpt{MemberWithTimeout(10)},
			expect: func(m *Member, e error) bool { return m.Timeout == 10 && e == nil },
		},
		{
			name: "error when set doesn't allow counters",
			set:  Set{Name: "super", Type: SetHashNet, Header: Header{}},
			elem: "foo",
			args: []MemberOpt{MemberWithBytes(10), MemberWithPackets(2)},
			expect: func(m *Member, e error) bool {
				return errors.Cause(e).Error() == "bytes options used with incompatible set"
			},
		},
		{
			name:   "set allows counters",
			set:    Set{Name: "super", Type: SetHashNet, Header: Header{Counters: new(string)}},
			elem:   "foo",
			args:   []MemberOpt{MemberWithBytes(10), MemberWithPackets(2)},
			expect: func(m *Member, e error) bool { return m.Bytes == 10 && e == nil },
		},
		{
			name: "error when set doesn't allow skbinfo",
			set:  Set{Name: "super", Type: SetHashNet, Header: Header{}},
			elem: "foo",
			args: []MemberOpt{MemberWithSKBPrio("10")},
			expect: func(m *Member, e error) bool {
				return errors.Cause(e).Error() == "skbprio options used with incompatible set"
			},
		},
		{
			name:   "set allows skbinfo",
			set:    Set{Name: "super", Type: SetHashNet, Header: Header{SKBInfo: new(string)}},
			elem:   "foo",
			args:   []MemberOpt{MemberWithSKBPrio("10")},
			expect: func(m *Member, e error) bool { return m.SKBPrio == "10" && e == nil },
		},
		{
			name:   "test nomatch",
			set:    Set{Name: "super", Type: SetHashNet},
			elem:   "foo",
			args:   []MemberOpt{MemberWithNomatch},
			expect: func(m *Member, e error) bool { return *m.NoMatch == "" && e == nil },
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			m, err := NewMember(tc.elem, &tc.set, tc.args...)
			if !tc.expect(m, err) {
				t.Fatalf("Unexpected NewMember() %+v, %s", m, err)
			}
		})
	}
}
