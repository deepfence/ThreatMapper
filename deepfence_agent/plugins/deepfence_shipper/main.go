package main

import (
	"context"
	"encoding/json"
	"flag"
	"io"
	stdlog "log"
	"os"
	"os/signal"
	"path"
	"sync"
	"syscall"
	"time"

	"github.com/kelseyhightower/envconfig"
	"github.com/nxadm/tail"
)

var log *stdlog.Logger

// build info
var (
	Version   string
	Commit    string
	BuildTime string
)

func main() {

	log = stdlog.New(os.Stderr, "", stdlog.LstdFlags|stdlog.Lshortfile)

	configPath := flag.String("routes", "routes.yaml", "routes.yaml file path")
	basePath := flag.String("base-path", "/", "base path of log files")
	truncateAtSize := flag.Int64("truncate-size", 0, "truncate the log files at the given size (file size in MB)")
	retryMax := flag.Int("retry-max", 10, "maximum number of time to retry batch while publishing")
	batchSize := flag.Int("batch-size", 100, "maximum number of documents to send in an api call")
	usePoll := flag.Bool("poll", false, "poll for file changes instead fo inotify")

	flag.Parse()

	// print build info on startup
	log.Print("Build Info:")
	log.Printf(" Version: %s", Version)
	log.Printf(" Commit: %s", Commit)
	log.Printf(" BuildTime: %s", BuildTime)

	route, err := LoadRoutes(*configPath)
	if err != nil {
		log.Fatal(err.Error())
	}

	var pubCfg PublisherConfig
	if err := envconfig.Process("", &pubCfg); err != nil {
		log.Fatal(err.Error())
	}

	ctx, cancel := signal.NotifyContext(
		context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	// check and create missing paths
	createMissingPaths(route.Routes, *basePath)

	// publisher
	pub := NewPublisher(pubCfg, *retryMax, *batchSize)

	// load last read position for files
	posFile := path.Join(*basePath, varLogFenced, posFile)
	log.Printf("load file positions from path %s", posFile)
	posMap, err := LoadFilePos(posFile)
	if err != nil {
		log.Printf("error loading file positions %v", err)
	} else {
		log.Printf("File Read Location: %v", posMap)
	}

	log.Printf("using poll instead of inotify: %t", *usePoll)

	tails := map[FileEntry]*tail.Tail{}

	var wg sync.WaitGroup

	// tail files
	for _, e := range route.Routes {
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
			pub.Publish(ctx, *basePath, e, t)
		}(ctx, entry, tf, pub)
	}

	// track positions
	wg.Add(1)
	go func() {
		defer wg.Done()
		recordFilePos(ctx, posFile, tails)
	}()

	// truncate files if enabled
	if *truncateAtSize > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			truncateFiles(ctx, route.Routes, *basePath, *truncateAtSize)
		}()
	}

	wg.Wait()

	// cleanup
	for _, t := range tails {
		t.Cleanup()
	}

}

func recordFilePos(ctx context.Context, posFile string, tails map[FileEntry]*tail.Tail) {

	ticker := time.NewTicker(3 * time.Second)
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

			f, err := os.OpenFile(posFile, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0644)
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

}

func createMissingPaths(routes []FileEntry, basePath string) {
	for _, entry := range routes {
		required := path.Join(basePath, entry.LocalPath)
		_, err := os.Stat(required)
		if err == nil {
			continue
		} else if os.IsNotExist(err) {
			os.MkdirAll(path.Dir(required), 0755)
			file, _ := os.Create(required)
			file.Close()
		}
	}
}
