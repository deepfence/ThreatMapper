package main

import (
	"bufio"
	"io"
	"log"
	"os"
	"sync"
	"sync/atomic"

	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func main() {
	ip := os.Getenv("OUT_IP")
	if ip == "" {
		log.Fatal("Missing OUT_IP")
	}
	tc, err := neo4j.NewDriver("bolt://"+ip+":7687", neo4j.BasicAuth("neo4j", "e16908ffa5b9f8e9d4ed", ""))
	if err != nil {
		log.Fatal(err)
	}

	session, err := tc.Session(neo4j.AccessModeWrite)
	if err != nil {
		log.Fatal(err)
	}
	defer session.Close()

	batch := make(chan string, 2000)

	wg := sync.WaitGroup{}
	count := atomic.Int64{}
	worker_count := 1
	wg.Add(worker_count)
	batch_size := 256
	for i := 0; i < worker_count; i += 1 {
		go func() {
			internal_count := 0
			tx, err := session.BeginTransaction()
			if err != nil {
				log.Fatal(err)
			}
			for query := range batch {

				_, err = tx.Run(query, map[string]interface{}{})

				internal_count += 1

				if internal_count%batch_size == 0 {
					tx.Commit()
					tx.Close()
					tx, err = session.BeginTransaction()
					if err != nil {
						log.Fatal(err)
					}
					count.Add(int64(batch_size))
					log.Printf("Committed: %v queries\n", count.Load())
				}
			}
			tx.Commit()
			tx.Close()
			count.Add(int64(internal_count) % int64(batch_size))
			log.Printf("Committed: %v queries\n", count.Load())

			wg.Done()
		}()
	}

	f, err := os.Open("/tmp/graphdb")
	if err != nil {
		log.Fatal(err)
	}

	r := bufio.NewReader(f)
	query := ""

	for {

		statement, err := r.ReadString('\n')

		if err == io.EOF {
			break
		} else if err != nil {
			log.Fatal(err)
		}

		if statement[0] == ':' {
			continue
		}

		query += statement

		if len(statement) > 2 && statement[len(statement)-2] == ';' {
			batch <- query
			query = ""
		}
	}

	close(batch)

	wg.Done()
}
