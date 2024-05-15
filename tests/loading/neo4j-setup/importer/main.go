package main

import (
	"log"
	"os"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func main() {
	ip := os.Getenv("IN_IP")
	if ip == "" {
		log.Fatal("Missing IN_IP")
	}
	tc, err := neo4j.NewDriver("bolt://"+ip+":7687", neo4j.BasicAuth("neo4j", "e16908ffa5b9f8e9d4ed", ""))
	if err != nil {
		log.Fatal(err)
	}

	session, err := tc.Session(neo4j.AccessModeRead)
	if err != nil {
		log.Fatal(err)
	}

	defer session.Close(ctx)

	r, err := session.Run(ctx, `
		CALL apoc.export.cypher.query("match (n:CloudResource) optional match (n) -[r]- () return *",
		null,
			{
				writeNodeProperties:true,
				stream:true,
				format:'plain',
				ifNotExists:true,
				useOptimizations:{type: "UNWIND_BATCH", unwindBatchSize: 100},
				cypherFromat:'updateStructure'
			}
		)
		`,
		map[string]interface{}{})
	if err != nil {
		log.Fatal(err)
	}

	res, err := r.Collect(ctx)
	if err != nil {
		log.Fatal(err)
	}

	f, err := os.Create("/tmp/graphdb.cr")
	if err != nil {
		log.Fatal(err)
	}

	for i := range res {
		d, _ := res[i].Get("cypherStatements")
		f.Write([]byte(d.(string)))
	}
	f.Close()
}
