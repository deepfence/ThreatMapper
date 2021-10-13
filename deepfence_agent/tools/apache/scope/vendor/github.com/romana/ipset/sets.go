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
	"strings"

	"github.com/pkg/errors"
	"github.com/romana/rlog"
)

// Set is a representation of ipset Set which is a named collection
// of ipset members of specific type.
//
// Ipset configuration consists of collection of Sets, every Set has
// a Type, a Header and a collection of Members.
type Set struct {
	Name     string   `xml:" name,attr"  json:",omitempty"`
	Header   Header   `xml:" header,omitempty" json:"header,omitempty"`
	Members  []Member `xml:" members>member,omitempty" json:"members,omitempty"`
	Revision int      `xml:" revision,omitempty" json:"revision,omitempty"`
	Type     SetType  `xml:" type,omitempty" json:"type,omitempty"`
}

// NewSet creates new Set of a given type.
func NewSet(name string, sType SetType, options ...SetOpt) (*Set, error) {
	s := Set{Name: name, Type: sType}

	for _, opt := range options {
		err := opt(&s)
		if err != nil {
			return nil, errors.Wrapf(err, "failed to create new set %s", name)
		}
	}

	return &s, nil
}

// Render Set for use with interactive functions of handler.
func (s *Set) Render(rType RenderType) string {
	var result string

	if s == nil {
		return result
	}

	switch rType {
	// only create set
	case RenderCreate:
		result += fmt.Sprintf("create %s %s %s\n", s.Name, s.Type, s.Header.render())
	// normal save, render everything as create/add
	case RenderSave:
		result += fmt.Sprintf("create %s %s %s\n", s.Name, s.Type, s.Header.render())
		for _, member := range s.Members {
			result += fmt.Sprintf("add %s %s\n", s.Name, member.render())
		}
	// only add members
	case RenderAdd:
		for _, member := range s.Members {
			result += fmt.Sprintf("add %s %s\n", s.Name, member.render())
		}
	// only delete members
	case RenderDelete:
		for _, member := range s.Members {
			result += fmt.Sprintf("del %s %s\n", s.Name, member.render())
		}
	// only set name for test
	case RenderTest:
		result += fmt.Sprintf("test %s", s.Name)
		if len(s.Members) == 1 {
			result += fmt.Sprintf(" %s", s.Members[0].Elem)
		}
	// only flush set
	case RenderFlush:
		result += fmt.Sprintf("flush %s\n", s.Name)
	// only destroy set
	case RenderDestroy:
		result += fmt.Sprintf("destroy %s\n", s.Name)
	}

	return result
}

// MemberByElement searches for member by element string.
func (s *Set) MemberByElement(elem string) *Member {
	for mdx, member := range s.Members {
		if member.Elem == elem {
			return &s.Members[mdx]
		}
	}
	return nil
}

// AddMember to the set.
func (s *Set) AddMember(m *Member) error {
	err := validateMemberForSet(s, m)
	if err != nil {
		return err
	}

	check := s.MemberByElement(m.Elem)
	if check != nil {
		return errors.Wrapf(ErrorItemExist, "failed to add member %s to set %s", m.Elem, s.Name)
	}
	s.Members = append(s.Members, *m)

	return nil
}

// SetType represents type of ipset set.
type SetType string

// see http://ipset.netfilter.org/ipset.man.html for types description.
const (
	SetBitmapIP       = "bitmap:ip"
	SetBitmapIPMac    = "bitmap:ip,mac"
	SetBitmapPort     = "bitmap:port"
	SetHashIP         = "hash:ip"
	SetHashMac        = "hash:mac"
	SetHashNet        = "hash:net"
	SetHashNetNet     = "hash:net,net"
	SetHashIPPort     = "hash:ip,port"
	SetHashNetPort    = "hash:net,port"
	SetHashIPPortIP   = "hash:ip,port,ip"
	SetHashIPPortNet  = "hash:ip,port,net"
	SetHashIPMark     = "hash:ip,mark"
	SetHashNetPortNet = "hash:net,port,net"
	SetHashNetIface   = "hash:net,iface"
	SetListSet        = "list:set"
)

// SetOpt is a signature of option function that can be used with NewSet()
// to produce a Set with desired config.
type SetOpt func(*Set) error

// SetWithRevision is an option to create Set with revision field initialized.
func SetWithRevision(revision int) SetOpt {
	return func(s *Set) error {
		s.Revision = revision
		return nil
	}
}

// SetWithSize is an option to create Set with size field initialized.
func SetWithSize(size int) SetOpt {
	return func(s *Set) error {
		if err := validateSetHeader(s.Type, Header{Size: size}); err != nil {
			return err
		}
		s.Header.Size = size
		return nil
	}
}

// Acceptable values for SetWithFamily.
const (
	MemberFamilyInet  = "inet"
	MemberFamilyInet6 = "inet6"
)

// SetWithFamily is an option to create Set with family field initialized.
func SetWithFamily(family string) SetOpt {
	return func(s *Set) error {
		if err := validateSetHeader(s.Type, Header{Family: family}); err != nil {
			return err
		}
		s.Header.Family = family
		return nil
	}
}

// SetWithRange is an option to create Set with range field initialized.
func SetWithRange(srange string) SetOpt {
	return func(s *Set) error {
		if err := validateSetHeader(s.Type, Header{Range: srange}); err != nil {
			return err
		}
		s.Header.Range = srange
		return nil
	}
}

// SetWithHashsize is an option to create Set with hashsize field initialized.
func SetWithHashsize(hashsize int) SetOpt {
	return func(s *Set) error {
		if err := validateSetHeader(s.Type, Header{Hashsize: hashsize}); err != nil {
			return err
		}
		s.Header.Hashsize = hashsize
		return nil
	}
}

// SetWithMaxelem is an option to create Set with maxelem field initialized.
func SetWithMaxelem(maxelem int) SetOpt {
	return func(s *Set) error {
		if err := validateSetHeader(s.Type, Header{Maxelem: maxelem}); err != nil {
			return err
		}
		s.Header.Maxelem = maxelem
		return nil
	}
}

// SetWithReferences is an option to create Set with maxelem reference initialized.
func SetWithReferences(references int) SetOpt {
	return func(s *Set) error {
		if err := validateSetHeader(s.Type, Header{References: references}); err != nil {
			return err
		}
		s.Header.References = references
		return nil
	}
}

// SetWithTimeout is an option to create Set with timeout reference initialized.
// -1 mean no timeout default
func SetWithTimeout(timeout int) SetOpt {
	return func(s *Set) error {
		if err := validateSetHeader(s.Type, Header{Timeout: timeout}); err != nil {
			return err
		}
		s.Header.Timeout = timeout
		return nil
	}
}

// SetWithNetmask is an option to create Set with netmask reference initialized.
func SetWithNetmask(netmask int) SetOpt {
	return func(s *Set) error {
		if err := validateSetHeader(s.Type, Header{Netmask: netmask}); err != nil {
			return err
		}
		s.Header.Netmask = netmask
		return nil
	}
}

// SetWithCounters is an option to create Set with counters.
func SetWithCounters(counters string) SetOpt {
	return func(s *Set) error {
		if err := validateSetHeader(s.Type, Header{Counters: &counters}); err != nil {
			return err
		}
		s.Header.Counters = &counters
		return nil
	}
}

// SetWithComment is an option to create Set with comments.
func SetWithComment(comment string) SetOpt {
	return func(s *Set) error {
		if err := validateSetHeader(s.Type, Header{Comment: &comment}); err != nil {
			return err
		}
		s.Header.Comment = &comment
		return nil
	}
}

// SetWithSKBInfo is an option to create Set with skbinfo.
func SetWithSKBInfo(skbinfo string) SetOpt {
	return func(s *Set) error {
		if err := validateSetHeader(s.Type, Header{SKBInfo: &skbinfo}); err != nil {
			return err
		}
		s.Header.SKBInfo = &skbinfo
		return nil
	}
}

// SetWithForceadd is an option to create Set with forceadd.
func SetWithForceadd() SetOpt {
	return func(s *Set) error {
		if err := validateSetHeader(s.Type, Header{Forceadd: NoVal}); err != nil {
			return err
		}
		s.Header.Forceadd = NoVal
		return nil
	}
}

// validateMemberForSet checks that given member and set have compatible configuration
// and can be used together.
// Some fields of the Member are only valid when corresponding fields of parent Set.Header
// are set.
func validateMemberForSet(s *Set, m *Member) error {
	if s == nil || m == nil {
		return nil
	}

	rlog.Tracef(3, "validating member %v against set type %s", *m, s.Type)

	if s.Header.Comment == nil && m.Comment != "" {
		return errors.New("comment options used with incompatible set")
	}

	if s.Header.Timeout == 0 && m.Timeout != 0 {
		return errors.New("timeout options used with incompatible set")
	}

	if s.Header.Counters == nil && m.Packets != 0 {
		return errors.New("packets options used with incompatible set")
	}

	if s.Header.Counters == nil && m.Bytes != 0 {
		return errors.New("bytes options used with incompatible set")
	}

	if s.Header.SKBInfo == nil && m.SKBMark != "" {
		return errors.New("skbmark options used with incompatible set")
	}

	if s.Header.SKBInfo == nil && m.SKBPrio != "" {
		return errors.New("skbprio options used with incompatible set")
	}

	if s.Header.SKBInfo == nil && m.SKBQueue != "" {
		return errors.New("skbqueue options used with incompatible set")
	}

	rlog.Tracef(3, "validating member %v successful")

	return nil
}

func validateSetHeader(sType SetType, header Header) error {
	/* ignore this
	{ "Family","family", `!= ""` },
	{ "Range","range", `!= ""` },
	{ "Hashsize","hashsize", "!= 0" },
	{ "Maxelem","maxelem", "!= 0" },
	{ "Memsize","memsize", "!= 0" },
	{ "References","references", "!= 0" },
	{ "Timeout","timeout", "!= 0" },
	{ "Netmask","netmask", "!= 0" },
	{ "Size","size", "!= 0" },
	{ "Counters","counters", "!= nil" },
	{ "Comment","comment", "!= nil" },
	{ "SKBInfo","skbinfo", "!= nil" },
	{ "Forceadd","forceadd", "!= nil" },
	*/

	compatList, ok := headerValidationMap[sType]
	if !ok {
		return errors.Errorf("Unknown set type %s", sType)
	}

	if header.Family != "" {
		if !strings.Contains(compatList, "-family-") {
			return errors.Errorf("Set of Type %s incompatible with header %s", sType, "family")
		}

	}

	if header.Range != "" {
		if !strings.Contains(compatList, "-range-") {
			return errors.Errorf("Set of Type %s incompatible with header %s", sType, "range")
		}

	}

	if header.Hashsize != 0 {
		if !strings.Contains(compatList, "-hashsize-") {
			return errors.Errorf("Set of Type %s incompatible with header %s", sType, "hashsize")
		}

	}

	if header.Maxelem != 0 {
		if !strings.Contains(compatList, "-maxelem-") {
			return errors.Errorf("Set of Type %s incompatible with header %s", sType, "maxelem")
		}

	}

	if header.References != 0 {
		if !strings.Contains(compatList, "-references-") {
			return errors.Errorf("Set of Type %s incompatible with header %s", sType, "references")
		}

	}

	if header.Timeout != 0 {
		if !strings.Contains(compatList, "-timeout-") {
			return errors.Errorf("Set of Type %s incompatible with header %s", sType, "timeout")
		}

	}

	if header.Netmask != 0 {
		if !strings.Contains(compatList, "-netmask-") {
			return errors.Errorf("Set of Type %s incompatible with header %s", sType, "netmask")
		}

	}

	if header.Size != 0 {
		if !strings.Contains(compatList, "-size-") {
			return errors.Errorf("Set of Type %s incompatible with header %s", sType, "size")
		}

	}

	if header.Counters != nil {
		if !strings.Contains(compatList, "-counters-") {
			return errors.Errorf("Set of Type %s incompatible with header %s", sType, "counters")
		}

	}

	if header.Comment != nil {
		if !strings.Contains(compatList, "-comment-") {
			return errors.Errorf("Set of Type %s incompatible with header %s", sType, "comment")
		}

	}

	if header.SKBInfo != nil {
		if !strings.Contains(compatList, "-skbinfo-") {
			return errors.Errorf("Set of Type %s incompatible with header %s", sType, "skbinfo")
		}

	}

	if header.Forceadd != nil {
		if !strings.Contains(compatList, "-forceadd-") {
			return errors.Errorf("Set of Type %s incompatible with header %s", sType, "forceadd")
		}

	}

	return nil
}

var (
	headerValidationMap = map[SetType]string{
		SetBitmapIP:       "-range-netmask-timeout-counters-comment-skbinfo-",
		SetBitmapIPMac:    "-range-timeout-counters-comment-skbinfo-",
		SetBitmapPort:     "-range-timeout-counters-comment-skbinfo-",
		SetHashIP:         "-family-hashsize-maxelem-netmask-timeout-counters-comment-skbinfo-forceadd-",
		SetHashMac:        "-hashsize-maxelem-timeout-counters-comment-skbinfo-forceadd-",
		SetHashNet:        "-family-hashsize-maxelem-timeout-counters-comment-skbinfo-forceadd-",
		SetHashNetNet:     "-family-hashsize-maxelem-timeout-counters-comment-skbinfo-forceadd-",
		SetHashIPPort:     "-family-hashsize-maxelem-timeout-counters-comment-skbinfo-forceadd-",
		SetHashNetPort:    "-family-hashsize-maxelem-timeout-counters-comment-skbinfo-forceadd-",
		SetHashIPPortIP:   "-family-hashsize-maxelem-timeout-counters-comment-skbinfo-forceadd-",
		SetHashIPPortNet:  "-family-hashsize-maxelem-timeout-counters-comment-skbinfo-forceadd-",
		SetHashIPMark:     "-family-markmask-hashsize-maxelem-timeout-counters-comment-skbinfo-forceadd-",
		SetHashNetPortNet: "-family-hashsize-maxelem-timeout-counters-comment-skbinfo-forceadd-",
		SetHashNetIface:   "-family-hashsize-maxelem-timeout-counters-comment-skbinfo-forceadd-",
		SetListSet:        "-size-timeout-counters-comment-skbinfo-",
	}
)

var (
	// NoVal used in Header and Member structs as a value for fields
	// which don't have value. Like Header.Comment or Member.NoMatch.
	// This is the artifact of xml parsing.
	NoVal = new(string)
)
