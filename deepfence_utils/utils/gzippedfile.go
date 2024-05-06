package utils

import (
	"bytes"
	"compress/gzip"
	"io"
	"os"
)

type UnzippedFile struct {
	file   *os.File
	buffer *bytes.Buffer
}

func NewUnzippedFile(file *os.File) UnzippedFile {
	return UnzippedFile{
		file:   file,
		buffer: &bytes.Buffer{},
	}
}

func (b UnzippedFile) Write(data []byte) (int, error) {
	return b.buffer.Write(data)
}

func (b UnzippedFile) Close() error {
	gzr, err := gzip.NewReader(b.buffer)
	if err != nil {
		return err
	}
	sbom, err := io.ReadAll(gzr)
	if err != nil {
		return err
	}
	err = gzr.Close()
	if err != nil {
		return err
	}
	_, err = b.file.Write(sbom)
	if err != nil {
		return err
	}
	return b.file.Close()
}
