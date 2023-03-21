package main

import (
	"bufio"
	"io"
	"log"
	"os"

	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func main() {
	tc, err := neo4j.NewDriver("bolt://143.110.232.114:7687", neo4j.BasicAuth("neo4j", "e16908ffa5b9f8e9d4ed", ""))
	if err != nil {
		log.Fatal(err)
	}

	session, err := tc.Session(neo4j.AccessModeWrite)
	if err != nil {
		log.Fatal(err)
	}

	defer session.Close()

	f, err := os.Open("/tmp/graphdb")
	if err != nil {
		log.Fatal(err)
	}

	r := bufio.NewReader(f)
	query := ""

	batch := make(chan string, 100)
	done := make(chan struct{})

	go func() {
		queries := []string{}
		for query := range batch {

			queries = append(queries, query)

			if len(queries) == 100 {
				batch_query := ""
				for i := range queries {
					batch_query += queries[i]
				}
				_, err = session.Run(batch_query, map[string]interface{}{})
				if err != nil {
					log.Println(err)
					log.Println(query)
				}
				queries = []string{}
			}
		}

		if len(queries) > 0 {
			batch_query := ""
			for i := range queries {
				batch_query += queries[i]
			}
			_, err = session.Run(batch_query, map[string]interface{}{})
			if err != nil {
				log.Println(err)
				log.Println(query)
			}
			queries = []string{}
		}
		done <- struct{}{}
	}()

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

	<-done
}
