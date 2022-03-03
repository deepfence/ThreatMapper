![Tunny](tunny_logo.png "Tunny")

[![godoc for Jeffail/tunny][1]][2]
[![goreportcard for Jeffail/tunny][3]][4]

Tunny is a Golang library for spawning and managing a goroutine pool, allowing
you to limit work coming from any number of goroutines with a synchronous API.

A fixed goroutine pool is helpful when you have work coming from an arbitrary
number of asynchronous sources, but a limited capacity for parallel processing.
For example, when processing jobs from HTTP requests that are CPU heavy you can
create a pool with a size that matches your CPU count.

## Install

``` sh
go get github.com/Jeffail/tunny
```

Or, using dep:

``` sh
dep ensure -add github.com/Jeffail/tunny
```

## Use

For most cases your heavy work can be expressed in a simple `func()`, where you
can use `NewFunc`. Let's see how this looks using our HTTP requests to CPU count
example:

``` go
package main

import (
	"io/ioutil"
	"net/http"
	"runtime"

	"github.com/Jeffail/tunny"
)

func main() {
	numCPUs := runtime.NumCPU()

	pool := tunny.NewFunc(numCPUs, func(payload interface{}) interface{} {
		var result []byte

		// TODO: Something CPU heavy with payload

		return result
	})
	defer pool.Close()

	http.HandleFunc("/work", func(w http.ResponseWriter, r *http.Request) {
		input, err := ioutil.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Internal error", http.StatusInternalServerError)
		}
		defer r.Body.Close()

		// Funnel this work into our pool. This call is synchronous and will
		// block until the job is completed.
		result := pool.Process(input)

		w.Write(result.([]byte))
	})

	http.ListenAndServe(":8080", nil)
}
```

Tunny also supports timeouts. You can replace the `Process` call above to the
following:

``` go
result, err := pool.ProcessTimed(input, time.Second*5)
if err == tunny.ErrJobTimedOut {
	http.Error(w, "Request timed out", http.StatusRequestTimeout)
}
```

You can also use the context from the request (or any other context) to handle timeouts and deadlines. Simply replace the `Process` call to the following:

``` go
result, err := pool.ProcessCtx(r.Context(), input)
if err == context.DeadlineExceeded {
	http.Error(w, "Request timed out", http.StatusRequestTimeout)
}
```

## Changing Pool Size

The size of a Tunny pool can be changed at any time with `SetSize(int)`:

``` go
pool.SetSize(10) // 10 goroutines
pool.SetSize(100) // 100 goroutines
```

This is safe to perform from any goroutine even if others are still processing.

## Goroutines With State

Sometimes each goroutine within a Tunny pool will require its own managed state.
In this case you should implement [`tunny.Worker`][tunny-worker], which includes
calls for terminating, interrupting (in case a job times out and is no longer
needed) and blocking the next job allocation until a condition is met.

When creating a pool using `Worker` types you will need to provide a constructor
function for spawning your custom implementation:

``` go
pool := tunny.New(poolSize, func() Worker {
	// TODO: Any per-goroutine state allocation here.
	return newCustomWorker()
})
```

This allows Tunny to create and destroy `Worker` types cleanly when the pool
size is changed.

## Ordering

Backlogged jobs are not guaranteed to be processed in order. Due to the current
implementation of channels and select blocks a stack of backlogged jobs will be
processed as a FIFO queue. However, this behaviour is not part of the spec and
should not be relied upon.

[1]: https://godoc.org/github.com/Jeffail/tunny?status.svg
[2]: http://godoc.org/github.com/Jeffail/tunny
[3]: https://goreportcard.com/badge/github.com/Jeffail/tunny
[4]: https://goreportcard.com/report/Jeffail/tunny
[tunny-worker]: https://godoc.org/github.com/Jeffail/tunny#Worker
