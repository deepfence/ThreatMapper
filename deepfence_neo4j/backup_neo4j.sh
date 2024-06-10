#!/bin/bash
kill -USR1 1
sleep 10
while ! neo4j status 1>&2 2>/dev/null; do
  echo "Waiting for neo4j to be up..."
  sleep 5
done
