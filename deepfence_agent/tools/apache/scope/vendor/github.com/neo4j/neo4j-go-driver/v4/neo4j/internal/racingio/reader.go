/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package racingio

import (
	"context"
	"errors"
	"fmt"
	"io"
)

type RacingReader interface {
	Read(ctx context.Context, bytes []byte) (int, error)
	ReadFull(ctx context.Context, bytes []byte) (int, error)
}

func NewRacingReader(reader io.Reader) RacingReader {
	return &racingReader{reader: reader}
}

type racingReader struct {
	reader io.Reader
}

func (rr *racingReader) Read(ctx context.Context, bytes []byte) (int, error) {
	return rr.race(ctx, bytes, read)
}

func (rr *racingReader) ReadFull(ctx context.Context, bytes []byte) (int, error) {
	return rr.race(ctx, bytes, readFull)
}

func (rr *racingReader) race(ctx context.Context, bytes []byte, readFn func(io.Reader, []byte) (int, error)) (int, error) {
	if err := ctx.Err(); err != nil {
		return 0, wrapRaceError(err)
	}
	resultChan := make(chan *ioResult, 1)
	go func() {
		defer close(resultChan)
		n, err := readFn(rr.reader, bytes)
		resultChan <- &ioResult{
			n:   n,
			err: err,
		}
	}()
	select {
	case <-ctx.Done():
		return 0, wrapRaceError(ctx.Err())
	case result := <-resultChan:
		return result.n, wrapRaceError(result.err)
	}
}

func wrapRaceError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		// temporary adjustment for 4.x
		return fmt.Errorf("i/o timeout: %w", err)
	}
	return err
}

type ioResult struct {
	n   int
	err error
}

func read(reader io.Reader, bytes []byte) (int, error) {
	return reader.Read(bytes)
}

func readFull(reader io.Reader, bytes []byte) (int, error) {
	return io.ReadFull(reader, bytes)
}
