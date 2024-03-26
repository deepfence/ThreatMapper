package main

import (
	"encoding/json"
	"os"

	"gopkg.in/yaml.v3"
)

const (
	varLogFenced = "var/log/fenced"
	posFile      = "deepfence_shipper.pos"
)

type PublisherConfig struct {
	URLSchema string `envconfig:"MGMT_CONSOLE_URL_SCHEMA" default:"https"`
	Host      string `envconfig:"MGMT_CONSOLE_URL" required:"true"`
	Port      string `envconfig:"MGMT_CONSOLE_PORT" default:"443"`
	Key       string `envconfig:"DEEPFENCE_KEY" required:"true"`
}

type FileEntry struct {
	LocalPath  string `yaml:"local_path"`
	RemotePath string `yaml:"remote_path"`
}

type RouteConfig struct {
	Routes []FileEntry `yaml:"routes"`
}

func LoadRoutes(path string) (RouteConfig, error) {
	res := RouteConfig{}
	b, err := os.ReadFile(path)
	if err != nil {
		return res, err
	}
	err = yaml.Unmarshal(b, &res)
	return res, err
}

func LoadFilePos(path string) (map[string]int64, error) {
	res := map[string]int64{}
	b, err := os.ReadFile(path)
	if err != nil {
		return res, err
	}
	err = json.Unmarshal(b, &res)
	return res, err
}
