# sqlc.dev

sqlc generates fully type-safe idiomatic Go code from SQL

## Install

- macOS
```shell
brew install sqlc
```
- go install
```shell
go install github.com/kyleconroy/sqlc/cmd/sqlc@latest
```

## Generate Go code

- local executable
```shell
sqlc generate
```

- docker run
```shell
docker run --rm -v $(pwd):/src -w /src kjconroy/sqlc generate
```