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

import "fmt"

// Header is a representation of ipset Set header. Header of a set indicates
// which what additional fields could be used in members of the set and
// how much resources the set is using.
//
// Ipset configuration consists of collection of Sets, every Set has
// a Type, a Header and a collection of Members.
type Header struct {
	Family     string  `xml:" family,omitempty" json:"family,omitempty"`
	Range      string  `xml:" range,omitempty" json:"range,omitempty"`
	Hashsize   int     `xml:" hashsize,omitempty" json:"hashsize,omitempty"`
	Maxelem    int     `xml:" maxelem,omitempty" json:"maxelem,omitempty"`
	Memsize    int     `xml:" memsize,omitempty" json:"memsize,omitempty"`
	References int     `xml:" references,omitempty" json:"references,omitempty"`
	Timeout    int     `xml:" timeout,omitempty" json:"timeout,omitempty"`
	Netmask    int     `xml:" netmask,omitempty" json:"netmask,omitempty"`
	Size       int     `xml:" size,omitempty" json:"size,omitempty"`
	Counters   *string `xml:" counters,omitempty" json:"counters,omitempty"`
	Comment    *string `xml:" comment,omitempty" json:"comment,omitempty"`
	SKBInfo    *string `xml:" skbinfo,omitempty" json:"skbinfo,omitempty"`
	Forceadd   *string `xml:" forceadd,omitempty" json:"forceadd,omitempty"`
}

// render is a helper for Set.Render() that produces string representation
// of a header. Since Header isn't affected by rendering format this function
// doesn't take any arguments.
func (h *Header) render() string {
	var result string
	if h == nil {
		return result
	}

	if h.Family != "" {
		result += fmt.Sprintf(" family %s", h.Family)
	}

	if h.Range != "" {
		result += fmt.Sprintf(" range %s", h.Range)
	}

	if h.Hashsize != 0 {
		result += fmt.Sprintf(" hashsize %d", h.Hashsize)
	}

	if h.Maxelem != 0 {
		result += fmt.Sprintf(" maxelem %d", h.Maxelem)
	}

	if h.References != 0 {
		result += fmt.Sprintf(" references %d", h.References)
	}

	if h.Timeout != 0 {
		if h.Timeout < 0 {
			h.Timeout = 0
		}
		result += fmt.Sprintf(" timeout %d", h.Timeout)
	}

	if h.Netmask != 0 {
		result += fmt.Sprintf(" netmask %d", h.Netmask)
	}

	if h.Size != 0 {
		result += fmt.Sprintf(" size %d", h.Size)
	}

	if h.Counters != nil {
		result += fmt.Sprintf(" counters")
	}

	if h.Comment != nil {
		result += fmt.Sprintf(" comment")
	}

	if h.SKBInfo != nil {
		result += fmt.Sprintf(" skbinfo")
	}

	if h.Forceadd != nil {
		result += fmt.Sprintf(" forceadd")
	}

	return result

}
