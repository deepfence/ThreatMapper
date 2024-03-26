package main

import (
	"encoding/json"
	"os"

	"gopkg.in/yaml.v3"
)

type FileEntry struct {
	LocalPath  string `yaml:"local_path"`
	RemotePath string `yaml:"remote_path"`
}

type Config struct {
	Entries []FileEntry `yaml:"entries"`
}

func LoadConfig(path string) (Config, error) {
	res := Config{}
	b, err := os.ReadFile(path)
	if err != nil {
		return res, err
	}
	err = yaml.Unmarshal(b, &res)
	return res, err
}

func GetEnvOrDefault(envVar string, defaultValue string) string {
	envValue := os.Getenv(envVar)
	if len(envValue) == 0 {
		return defaultValue
	}
	return envValue
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
