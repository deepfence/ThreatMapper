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
	"github.com/romana/rlog"
)

// NewIpset creates new Ipset.
func NewIpset() *Ipset { return &Ipset{} }

// Ipset represents ipset configuration that consists of list of sets.
type Ipset struct {
	Sets []*Set `xml:" ipset,omitempty" json:"ipset,omitempty"`
}

// Render collection of sets for usage with interactive functions
// of handle.
func (s *Ipset) Render(rType RenderType) string {
	var result string

	switch rType {
	case RenderFlush:
		if len(s.Sets) == 0 {
			return "flush\n"
		}
	case RenderDestroy:
		if len(s.Sets) == 0 {
			return "destroy\n"
		}

	// RenderSwap will fail when Sets < 2,
	// it's a duty of a caller to ensure
	// correctness.
	case RenderSwap:
		return fmt.Sprintf("swap %s %s\n", s.Sets[0].Name, s.Sets[1].Name)

	// RenderRename will fail when Sets < 2,
	// it's a duty of a caller to ensure
	// correctness.
	case RenderRename:
		return fmt.Sprintf("rename %s %s\n", s.Sets[0].Name, s.Sets[1].Name)
	}

	for _, set := range s.Sets {
		result += set.Render(rType)
	}

	return result
}

// RenderType indicates how to render a Set.
type RenderType int

const (
	// RenderSave renders all sets with headers as create commands
	// and all members with headers as add commands.
	// Same as regular save.
	RenderSave RenderType = iota

	// RenderCreate renders all sets as create commands with headers.
	RenderCreate

	// RenderAdd renders all members as add commands with headers.
	RenderAdd

	// RenderDelete renders all members as del commands.
	RenderDelete

	// RenderFlush renders all sets as flush commands.
	RenderFlush

	// RenderDestroy renders all sets as destroy commands.
	RenderDestroy

	// RenderSwap renders 2 sets as swap command.
	RenderSwap

	// RenderTest renders set (and one member if present) as test command.
	RenderTest

	// RenderRename renders 2 sets as rename command.
	RenderRename
)

// SetByName searches set by names.
func (s *Ipset) SetByName(name string) *Set {
	rlog.Tracef(3, "looking for a set %s", name)

	for i, set := range s.Sets {
		if set.Name == name {
			rlog.Tracef(3, "set found %v", set)
			return s.Sets[i]
		}
	}

	return nil
}

// AddSet adds given set to Ipset.Set collection if possible.
func (s *Ipset) AddSet(set *Set) error {
	check := s.SetByName(set.Name)
	if check != nil {
		return errors.Wrapf(ErrorItemExist, "failed to add set %s", set.Name)
	}
	s.Sets = append(s.Sets, set)
	return nil
}
