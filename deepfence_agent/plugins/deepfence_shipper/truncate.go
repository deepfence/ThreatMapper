package main

import (
	"context"
	"fmt"
	"os"
	"path"
	"time"
)

func truncateFiles(ctx context.Context, entries []FileEntry, basePath string, truncateSize int64) {

	log.Printf("start monitoring file sizes to truncate at %dMB", truncateSize)

	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			for _, e := range entries {
				fpath := path.Join(basePath, e.LocalPath)
				fi, err := os.Stat(fpath)
				if err != nil {
					log.Printf("error on file stat %v", err)
					continue
				}
				// get the size
				if fi.Size() > truncateSize*1000*1000 {
					log.Printf("truncate file %s size=%.2fMb",
						e.LocalPath, float64(fi.Size())/(1000.0*1000.0))
					err := truncate(fpath, fi.Mode().Perm())
					if err != nil {
						log.Printf("error truncation file %v", err)
						continue
					}
				}
			}
		}
	}

}

func truncate(filename string, perm os.FileMode) error {
	f, err := os.OpenFile(filename, os.O_TRUNC, perm)
	if err != nil {
		return fmt.Errorf("could not open file %q for truncation: %v", filename, err)
	}
	if err = f.Close(); err != nil {
		return fmt.Errorf("could not close file handler for %q after truncation: %v", filename, err)
	}
	return nil
}
