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
	"fmt"

	"github.com/pkg/errors"
)

// Member is a representation of ipset member which is a minimal
// item of ipset configuration that describes rule for matching packets.
//
// Ipset configuration consists of collection of Sets, every Set has
// a Type, a Header and a collection of Members.
type Member struct {
	Elem      string  `xml:" elem" json:"elem"`
	Comment   string  `xml:" comment,omitempty" json:"comment,omitempty"`
	NoMatch   *string `xml:" nomatch,omitempty" json:"nomatch,omitempty"`
	Timeout   int     `xml:" timeout,omitempty" json:"timeout,omitempty"`
	Packets   int     `xml:" packets,omitempty" json:"packets,omitempty"`
	Bytes     int     `xml:" bytes,omitempty" json:"bytes,omitempty"`
	SKBMark   string  `xml:" skbmark,omitempty" json:"skbmark,omitempty"`
	SKBPrio   string  `xml:" skbprio,omitempty" json:"skbprio,omitempty"`
	SKBQueue  string  `xml:" skbqueue,omitempty" json:"skbqueue,omitempty"`
	parentSet *Set
}

// NewMember creates a new  member.
// Some member options can't be used with certain Set type, to assert that
// requested member can be used with a desired set you can provide a pointer to the
// desired Set.
// Pointer to the Set is allowed to be nil in which case no type assertion performed.
func NewMember(elem string, set *Set, opts ...MemberOpt) (*Member, error) {
	m := Member{parentSet: set, Elem: elem}

	for _, opt := range opts {
		err := opt(&m)
		if err != nil {
			return nil, errors.Wrapf(err, "failed to create set member %s", elem)
		}
	}

	return &m, nil
}

// MemberOpt is a signature of for option function that
// can be used with NewMember() to produce a member with desired config.
type MemberOpt func(*Member) error

// MemberWithComment is an option to create member with comment.
func MemberWithComment(comment string) MemberOpt {
	return func(m *Member) error {
		tm := &Member{Comment: comment}
		if err := validateMemberForSet(m.parentSet, tm); err != nil {
			return errors.New("comment options used with incompatible set")
		}
		m.Comment = comment
		return nil
	}
}

// MemberWithTimeout is an option to create member with timeout.
func MemberWithTimeout(timeout int) MemberOpt {
	return func(m *Member) error {
		tm := &Member{Timeout: timeout}
		if err := validateMemberForSet(m.parentSet, tm); err != nil {
			return errors.New("timeout options used with incompatible set")
		}
		m.Timeout = timeout
		return nil
	}
}

// MemberWithNomatch is an option to create member with nomatch.
func MemberWithNomatch(m *Member) error {
	m.NoMatch = new(string)
	return nil
}

// MemberWithPackets is an option to create member with packets field initialized.
func MemberWithPackets(packets int) MemberOpt {
	return func(m *Member) error {
		tm := &Member{Packets: packets}
		if err := validateMemberForSet(m.parentSet, tm); err != nil {
			return errors.New("packets options used with incompatible set")
		}
		m.Packets = packets
		return nil
	}
}

// MemberWithBytes is an option to create member with bytes field initialized.
func MemberWithBytes(bytes int) MemberOpt {
	return func(m *Member) error {
		tm := &Member{Bytes: bytes}
		if err := validateMemberForSet(m.parentSet, tm); err != nil {
			return errors.New("bytes options used with incompatible set")
		}
		m.Bytes = bytes
		return nil
	}
}

// MemberWithSKBMark is an option to create member with skbmark field initialized.
func MemberWithSKBMark(skbmark string) MemberOpt {
	return func(m *Member) error {
		tm := &Member{SKBMark: skbmark}
		if err := validateMemberForSet(m.parentSet, tm); err != nil {
			return errors.New("skbmark options used with incompatible set")
		}
		m.SKBMark = skbmark
		return nil
	}
}

// MemberWithSKBPrio is an option to create member with skbprio field initialized.
func MemberWithSKBPrio(skbprio string) MemberOpt {
	return func(m *Member) error {
		tm := &Member{SKBPrio: skbprio}
		if err := validateMemberForSet(m.parentSet, tm); err != nil {
			return errors.New("skbprio options used with incompatible set")
		}
		m.SKBPrio = skbprio
		return nil
	}
}

// render produces string representation of member with all it's headers.
func (m Member) render() string {
	var result string

	result += m.Elem

	if m.Comment != "" {
		result += fmt.Sprintf(" comment %s", m.Comment)
	}
	if m.NoMatch != nil {
		result += fmt.Sprintf(" nomatch")
	}
	if m.Timeout != 0 {
		result += fmt.Sprintf(" timeout %d", m.Timeout)
	}
	if m.Packets != 0 {
		result += fmt.Sprintf(" packets %d", m.Packets)
	}
	if m.Bytes != 0 {
		result += fmt.Sprintf(" bytes %d", m.Bytes)
	}
	if m.SKBMark != "" {
		result += fmt.Sprintf(" skbmark %s", m.SKBMark)
	}
	if m.SKBPrio != "" {
		result += fmt.Sprintf(" skbprio %s", m.SKBPrio)
	}
	if m.SKBQueue != "" {
		result += fmt.Sprintf(" skbqueue %s", m.SKBQueue)
	}

	return result
}
