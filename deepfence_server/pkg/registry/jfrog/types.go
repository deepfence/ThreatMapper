package jfrog

import (
	"time"
)

type RegistryJfrog struct {
	Name         string    `json:"name" validate:"required,min=2,max=64"`
	NonSecret    NonSecret `json:"non_secret"`
	Secret       Secret    `json:"secret"`
	RegistryType string    `json:"registry_type" validate:"required"`
}

type NonSecret struct {
	JfrogRegistryURL string `json:"jfrog_registry_url" validate:"required,url"`
	JfrogRepository  string `json:"jfrog_repository" validate:"required,min=2"`
	JfrogUsername    string `json:"jfrog_username" validate:"omitempty,min=2"`
}

type Secret struct {
	JfrogPassword string `json:"jfrog_password" validate:"omitempty,min=2"`
}

type ReposResp struct {
	Repositories []string `json:"repositories"`
}

type RepoTagsResp struct {
	Name string   `json:"name"`
	Tags []string `json:"tags"`
}

type Manifest struct {
	SchemaVersion int          `json:"schemaVersion"`
	Name          string       `json:"name"`
	Tag           string       `json:"tag"`
	Architecture  string       `json:"architecture"`
	FsLayers      []FsLayers   `json:"fsLayers"`
	History       []History    `json:"history"`
	Signatures    []Signatures `json:"signatures"`
}

type TagInfo struct {
	Created      string `json:"created"`
	LastModified string `json:"lastModified"`
	LastUpdated  string `json:"lastUpdated"`
}

type FsLayers struct {
	BlobSum string `json:"blobSum"`
}
type History struct {
	V1Compatibility string `json:"v1Compatibility"`
}
type Jwk struct {
	Crv string `json:"crv"`
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	X   string `json:"x"`
	Y   string `json:"y"`
}
type Header struct {
	Jwk Jwk    `json:"jwk"`
	Alg string `json:"alg"`
}
type Signatures struct {
	Header    Header `json:"header"`
	Signature string `json:"signature"`
	Protected string `json:"protected"`
}

type HistoryV1Compatibility struct {
	Architecture    string          `json:"architecture"`
	Config          ContainerConfig `json:"config"`
	Container       string          `json:"container"`
	ContainerConfig ContainerConfig `json:"container_config"`
	Created         time.Time       `json:"created"`
	DockerVersion   string          `json:"docker_version"`
	ID              string          `json:"id"`
	Os              string          `json:"os"`
	Parent          string          `json:"parent"`
	Throwaway       bool            `json:"throwaway"`
}

type Labels struct {
	Maintainer string `json:"maintainer"`
}

type ContainerConfig struct {
	Hostname     string                 `json:"Hostname"`
	Domainname   string                 `json:"Domainname"`
	User         string                 `json:"User"`
	AttachStdin  bool                   `json:"AttachStdin"`
	AttachStdout bool                   `json:"AttachStdout"`
	AttachStderr bool                   `json:"AttachStderr"`
	ExposedPorts map[string]interface{} `json:"ExposedPorts"`
	Tty          bool                   `json:"Tty"`
	OpenStdin    bool                   `json:"OpenStdin"`
	StdinOnce    bool                   `json:"StdinOnce"`
	Env          []string               `json:"Env"`
	Cmd          []string               `json:"Cmd"`
	Image        string                 `json:"Image"`
	Volumes      interface{}            `json:"Volumes"`
	WorkingDir   string                 `json:"WorkingDir"`
	Entrypoint   []string               `json:"Entrypoint"`
	OnBuild      interface{}            `json:"OnBuild"`
	Labels       Labels                 `json:"Labels"`
	StopSignal   string                 `json:"StopSignal"`
}
