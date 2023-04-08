# Neo4j Load setup

This tool populates neo4j with sensible data that mimicks production environment.
Ingesting huge amount of data to neo4j may result into JavaHeap issue.
To solve that, the script limits insertion up to 100k.
If you need to ingest 500k, set a NUM to 5 and 5 ingestion at 100k will be performed.

## Usage:

```
DF_CONSOLE=ip DF_NEO4J_PASS=pass go run ./main.go -image_num=1000 -host_num=1000 -container_num=1000 -vuln_num=1000 -aws_lambda_num=1000
```
