package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	stdlog "log"
	"os"
	"os/signal"
	"path"
	"sync"
	"time"

	"github.com/kelseyhightower/envconfig"
	"github.com/nxadm/tail"
)

var (
	log *stdlog.Logger
)

type Console struct {
	URLSchema string `envconfig:"MGMT_CONSOLE_URL_SCHEMA" default:"https"`
	Host      string `envconfig:"MGMT_CONSOLE_URL" required:"true"`
	Port      string `envconfig:"MGMT_CONSOLE_PORT" default:"443"`
	Key       string `envconfig:"DEEPFENCE_KEY" required:"true"`
}

func main() {

	log = stdlog.New(os.Stderr, "", stdlog.LstdFlags|stdlog.Lshortfile)

	configPath := flag.String("config", "config.yaml", "config path")
	basePath := flag.String("logs-base-path", "/", "base path of log files")
	truncateAtSize := flag.Int64("truncate-at-size", 0, "truncate the log files when it reaches the given size (file size in MB)")
	usePoll := flag.Bool("poll", false, "poll for file changes instead fo inotify")

	flag.Parse()

	cfg, err := LoadConfig(*configPath)
	if err != nil {
		panic(err.Error())
	}

	// check and create missing paths
	for _, entry := range cfg.Entries {
		required := path.Join(*basePath, entry.LocalPath)
		_, err := os.Stat(required)
		if err == nil {
			continue
		} else if os.IsNotExist(err) {
			os.MkdirAll(path.Dir(required), 0755)
			file, _ := os.Create(required)
			file.Close()
		}
	}

	var consoleCfg Console
	if err := envconfig.Process("", &consoleCfg); err != nil {
		log.Fatal(err.Error())
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	pub := NewPublisher(consoleCfg)

	posfile := path.Join(*basePath, "var/log/fenced", "deepfence_shipper.pos")

	posMap, err := LoadFilePos(posfile)
	if err != nil {
		log.Printf("error loading file positios %v", err)
	}

	tails := map[FileEntry]*tail.Tail{}

	var wg sync.WaitGroup

	// tail files
	for _, e := range cfg.Entries {
		entry := e

		// seek to current offset
		loc := tail.SeekInfo{Offset: 0, Whence: io.SeekStart}
		pos, found := posMap[entry.LocalPath]
		if found {
			loc = tail.SeekInfo{Offset: pos, Whence: io.SeekStart}
		}

		tf, err := tail.TailFile(
			path.Join(*basePath, entry.LocalPath),
			tail.Config{
				Poll:          *usePoll,
				Location:      &loc,
				Follow:        true,
				ReOpen:        true,
				MustExist:     false,
				CompleteLines: true,
			},
		)
		if err != nil {
			log.Fatal(err)
		}

		tails[entry] = tf

		wg.Add(1)
		go func(ctx context.Context, e FileEntry, t *tail.Tail, pub *Publisher) {
			defer wg.Done()
			// publish the lines
			pub.Publish(ctx, e, t)

		}(ctx, entry, tf, pub)
	}

	// track positions
	wg.Add(1)
	go func(ctx context.Context, tails map[FileEntry]*tail.Tail) {
		defer wg.Done()

		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				posMap := map[string]int64{}

				for e, t := range tails {
					pos, err := t.Tell()
					if err != nil {
						log.Printf("error fetching file position %v", err)
					} else {
						posMap[e.LocalPath] = pos
					}
				}

				f, err := os.OpenFile(posfile, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0644)
				if err != nil {
					log.Printf("error saving file position %v", err)
				}

				data, err := json.MarshalIndent(posMap, "", "  ")
				if err != nil {
					log.Printf("error saving file position %v", err)
					continue
				}

				if _, err := f.Write(data); err != nil {
					log.Printf("error saving file position %v", err)
				}

				if err := f.Close(); err != nil {
					log.Printf("error saving file position %v", err)
				}

			}
		}

	}(ctx, tails)

	// truncate files if enabled
	if *truncateAtSize > 0 {
		wg.Add(1)
		go func(ctx context.Context, entries []FileEntry) {
			defer wg.Done()

			ticker := time.NewTicker(60 * time.Second)
			defer ticker.Stop()

			for {
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					for _, e := range entries {
						fpath := path.Join(*basePath, e.LocalPath)
						fi, err := os.Stat(fpath)
						if err != nil {
							log.Printf("error on file stat %v", err)
							continue
						}
						// get the size
						if fi.Size() > *truncateAtSize*1000*1000 {
							log.Printf("truncate file %s size=%.2fMb",
								e.LocalPath, float64(fi.Size())/(1000.0*1000.0))
							err := truncate(fpath, fi.Mode().Perm())
							if err != nil {
								log.Printf("error truncation file %v", err)
								continue
							}
						} else {
							log.Printf("skip truncate file %s size=%.2fMb",
								e.LocalPath, float64(fi.Size())/(1000.0*1000.0))
						}
					}
				}
			}

		}(ctx, cfg.Entries)
	}

	wg.Wait()

	// cleanup
	for _, t := range tails {
		t.Cleanup()
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
