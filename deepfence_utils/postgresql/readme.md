# sqlc.dev

sqlc generates fully type-safe idiomatic Go code from SQL

## Install

- macOS
```shell
brew install sqlc
```
- go install
```shell
go install -v github.com/sqlc-dev/sqlc/cmd/sqlc@latest
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

## Migrate

- Migration is done using [goose](https://github.com/pressly/goose)
- File prefix should be in order - 0001, 0002, etc
- Example: https://github.com/pressly/goose/tree/master/examples/sql-migrations