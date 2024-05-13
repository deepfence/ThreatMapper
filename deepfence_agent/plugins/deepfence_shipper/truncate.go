package main

import (
	"context"
	"os"
	"path"
	"time"
)

func truncateFiles(ctx context.Context, entries []FileEntry, basePath string, truncateSize int64) {

	log.Printf("start monitoring file sizes to truncate at %dMB", truncateSize)

	truncateAtSize := truncateSize * 1000 * 1000

	ticker := time.NewTicker(300 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case t := <-ticker.C:
			log.Printf("check size for file truncate at %s", t)

			for _, e := range entries {
				fpath := path.Join(basePath, e.LocalPath)
				fi, err := os.Stat(fpath)
				if err != nil {
					log.Printf("error on file stat %v", err)
					continue
				}
				// get the size
				if fi.Size() > truncateAtSize {
					log.Printf("truncate file %s size=%.2fMb", e.LocalPath, float64(fi.Size())/(1000.0*1000.0))
					// truncate to 1/4th the original size since this operation is async
					if err := os.Truncate(fpath, truncateAtSize/4); err != nil {
						log.Printf("error truncation file %v", err)
						continue
					}
				}
			}

		}
	}

}
