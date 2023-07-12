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

## Migrate

- Migration is done using [golang-migrate/migrate](https://github.com/golang-migrate/migrate)
- Changes should have `*.up.sql` and `*.down.sql` files
- File prefix should be in order - 0001, 0002, etc
- Example: https://github.com/golang-migrate/migrate/tree/master/database/postgres/examples/migrations