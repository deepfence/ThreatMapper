package main

import (
	"log"
	"os"

	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
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

	defer session.Close()

	r, err := session.Run(`
		CALL apoc.export.cypher.all(null,{useTypes:true, stream:true})
		`,
		map[string]interface{}{})
	if err != nil {
		log.Fatal(err)
	}

	res, err := r.Collect()
	if err != nil {
		log.Fatal(err)
	}

	f, err := os.Create("/tmp/graphdb")
	if err != nil {
		log.Fatal(err)
	}

	for i := range res {
		d, _ := res[i].Get("cypherStatements")
		f.Write([]byte(d.(string)))
	}
	f.Close()
}
