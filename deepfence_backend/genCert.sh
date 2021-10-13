#!/bin/bash
go build minica.go
value=$RANDOM
echo $value
domainVal="*.localhost-"${value}".com"
echo $domainVal
/go/minica --domains "${domainVal}"
