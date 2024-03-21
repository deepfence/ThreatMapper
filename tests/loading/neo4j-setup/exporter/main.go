package main

import (
	"bufio"
	"io"
	"log"
	"os"
	"sync"
	"sync/atomic"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
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

	batch := make(chan string, 1000)

	wg := sync.WaitGroup{}
	total_count := atomic.Int64{}
	wg.Add(1)
	go func() {
		session, err := tc.Session(neo4j.AccessModeWrite)
		if err != nil {
			log.Fatal(err)
		}
		defer session.Close(ctx)
		internal_count := 0
		for query := range batch {

			_, err = session.Run(ctx, query, map[string]interface{}{})
			if err != nil {
				log.Println(err)
			}

			internal_count += 1
			log.Printf("count: %v/%v queries\n", internal_count, total_count.Load())
		}
		wg.Done()
	}()

	f, err := os.Open("/tmp/graphdb.cr")
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

		query += statement

		if len(statement) > 2 && statement[len(statement)-2] == ';' {
			batch <- query
			query = ""
			total_count.Add(1)
		}
	}
	close(batch)
	wg.Wait()
}
