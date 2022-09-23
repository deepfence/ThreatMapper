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
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package bolt

import (
	"errors"
	"fmt"
	"net"
	"time"

	"github.com/neo4j/neo4j-go-driver/v4/neo4j/db"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/internal/packstream"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/log"
)

const (
	bolt4_ready        = iota // Ready for use
	bolt4_streaming           // Receiving result from auto commit query
	bolt4_pendingtx           // Transaction has been requested but not applied
	bolt4_tx                  // Transaction pending
	bolt4_streamingtx         // Receiving result from a query within a transaction
	bolt4_failed              // Recoverable error, needs reset
	bolt4_dead                // Non recoverable protocol or connection error
	bolt4_unauthorized        // Initial state, not sent hello message with authentication
)

// Default fetch size
const bolt4_fetchsize = 1000

type internalTx4 struct {
	mode             db.AccessMode
	bookmarks        []string
	timeout          time.Duration
	txMeta           map[string]interface{}
	databaseName     string
	impersonatedUser string
}

func (i *internalTx4) toMeta() map[string]interface{} {
	meta := map[string]interface{}{}
	if i.mode == db.ReadMode {
		meta["mode"] = "r"
	}
	if len(i.bookmarks) > 0 {
		meta["bookmarks"] = i.bookmarks
	}
	ms := int(i.timeout.Nanoseconds() / 1e6)
	if ms > 0 {
		meta["tx_timeout"] = ms
	}
	if len(i.txMeta) > 0 {
		meta["tx_metadata"] = i.txMeta
	}
	if i.databaseName != db.DefaultDatabase {
		meta["db"] = i.databaseName
	}
	if i.impersonatedUser != "" {
		meta["imp_user"] = i.impersonatedUser
	}
	return meta
}

type bolt4 struct {
	state         int
	txId          db.TxHandle
	streams       openstreams
	conn          net.Conn
	serverName    string
	out           outgoing
	in            incoming
	connId        string
	logId         string
	serverVersion string
	tfirst        int64       // Time that server started streaming
	pendingTx     internalTx4 // Stashed away when tx started explicitly
	hasPendingTx  bool
	bookmark      string // Last bookmark
	birthDate     time.Time
	log           log.Logger
	databaseName  string
	err           error // Last fatal error
	minor         int
	lastQid       int64 // Last seen qid
}

func NewBolt4(serverName string, conn net.Conn, logger log.Logger, boltLog log.BoltLogger) *bolt4 {
	b := &bolt4{
		state:      bolt4_unauthorized,
		conn:       conn,
		serverName: serverName,
		birthDate:  time.Now(),
		log:        logger,
		streams:    openstreams{},
		in: incoming{
			buf: make([]byte, 4096),
			hyd: hydrator{
				boltLogger: boltLog,
			},
			connReadTimeout: -1,
			logger:          logger,
			logName:         log.Bolt4,
		},
	}
	b.out = outgoing{
		chunker:    newChunker(),
		packer:     packstream.Packer{},
		onErr:      func(err error) { b.setError(err, true) },
		boltLogger: boltLog,
	}

	return b
}

func (b *bolt4) checkStreams() {
	if b.streams.num <= 0 {
		// Perform state transition from streaming, if in that state otherwise keep the current
		// state as we are in some kind of bad shape
		switch b.state {
		case bolt4_streamingtx:
			b.state = bolt4_tx
		case bolt4_streaming:
			b.state = bolt4_ready
		}
	}
}

func (b *bolt4) ServerName() string {
	return b.serverName
}

func (b *bolt4) ServerVersion() string {
	return b.serverVersion
}

// Sets b.err and b.state to bolt4_failed or bolt4_dead when fatal is true.
func (b *bolt4) setError(err error, fatal bool) {
	// Has no effect, can reduce nested ifs
	if err == nil {
		return
	}

	// No previous error
	if b.err == nil {
		b.err = err
		b.state = bolt4_failed
	}

	// Increase severity even if it was a previous error
	if fatal {
		b.state = bolt4_dead
	}

	// Forward error to current stream if there is one
	if b.streams.curr != nil {
		b.streams.detach(nil, err)
		b.checkStreams()
	}

	// Do not log big cypher statements as errors
	neo4jErr, casted := err.(*db.Neo4jError)
	if casted && neo4jErr.Classification() == "ClientError" {
		b.log.Debugf(log.Bolt4, b.logId, "%s", err)
	} else {
		b.log.Error(log.Bolt4, b.logId, err)
	}
}

func (b *bolt4) receiveMsg() interface{} {
	// Potentially dangerous to receive when an error has occurred, could hang.
	// Important, a lot of code has been simplified relying on this check.
	if b.err != nil {
		return nil
	}

	msg, err := b.in.next(b.conn)
	b.setError(err, true)
	return msg
}

// Receives a message that is assumed to be a success response or a failure in response to a
// sent command. Sets b.err and b.state on failure
func (b *bolt4) receiveSuccess() *success {
	msg := b.receiveMsg()
	if b.err != nil {
		return nil
	}

	switch v := msg.(type) {
	case *success:
		if v.qid > -1 {
			b.lastQid = v.qid
		}
		return v
	case *db.Neo4jError:
		b.setError(v, isFatalError(v))
		return nil
	default:
		// Unexpected message received
		b.setError(errors.New("Expected success or database error"), true)
		return nil
	}
}

func (b *bolt4) connect(minor int, auth map[string]interface{}, userAgent string, routingContext map[string]string) error {
	if err := b.assertState(bolt4_unauthorized); err != nil {
		return err
	}

	// Prepare hello message
	hello := map[string]interface{}{
		"user_agent": userAgent,
	}
	// On bolt >= 4.1 add routing to enable/disable routing
	if minor >= 1 {
		if routingContext != nil {
			hello["routing"] = routingContext
		}
	}
	checkUtcPatch := minor >= 3
	if checkUtcPatch {
		hello["patch_bolt"] = []string{"utc"}
	}
	// Merge authentication keys into hello, avoid overwriting existing keys
	for k, v := range auth {
		_, exists := hello[k]
		if !exists {
			hello[k] = v
		}
	}

	// Send hello message and wait for confirmation
	b.out.appendHello(hello)
	b.out.send(b.conn)
	succ := b.receiveSuccess()
	if b.err != nil {
		return b.err
	}

	b.connId = succ.connectionId
	b.serverVersion = succ.server
	if checkUtcPatch {
		useUtc := false
		for _, patch := range succ.patches {
			if patch == "utc" {
				useUtc = true
				break
			}
		}
		b.in.hyd.useUtc = useUtc
		b.out.useUtc = useUtc
	}

	// Construct log identity
	connectionLogId := fmt.Sprintf("%s@%s", b.connId, b.serverName)
	b.logId = connectionLogId
	b.in.hyd.logId = connectionLogId
	b.in.logId = connectionLogId
	b.out.logId = connectionLogId

	b.initializeReadTimeoutHint(succ.configurationHints)
	// Transition into ready state
	b.state = bolt4_ready
	b.minor = minor
	b.streams.reset()
	b.log.Infof(log.Bolt4, b.logId, "Connected")
	return nil
}

func (b *bolt4) checkImpersonationAndVersion(impersonatedUser string) error {
	if impersonatedUser != "" && b.minor < 4 {
		return &db.FeatureNotSupportedError{Server: b.serverName, Feature: "user impersonation", Reason: "requires at least server v4.4"}
	}
	return nil
}

func (b *bolt4) TxBegin(txConfig db.TxConfig) (db.TxHandle, error) {
	// Ok, to begin transaction while streaming auto-commit, just empty the stream and continue.
	if b.state == bolt4_streaming {
		if b.bufferStream(); b.err != nil {
			return 0, b.err
		}
	}
	// Makes all outstanding streams invalid
	b.streams.reset()

	if err := b.assertState(bolt4_ready); err != nil {
		return 0, err
	}

	if err := b.checkImpersonationAndVersion(txConfig.ImpersonatedUser); err != nil {
		return 0, err
	}

	tx := internalTx4{
		mode:             txConfig.Mode,
		bookmarks:        txConfig.Bookmarks,
		timeout:          txConfig.Timeout,
		txMeta:           txConfig.Meta,
		databaseName:     b.databaseName,
		impersonatedUser: txConfig.ImpersonatedUser,
	}

	// If there are bookmarks, begin the transaction immediately for backwards compatible
	// reasons, otherwise delay it to save a round-trip
	if len(tx.bookmarks) > 0 {
		b.out.appendBegin(tx.toMeta())
		b.out.send(b.conn)
		b.receiveSuccess()
		if b.err != nil {
			return 0, b.err
		}
		b.state = bolt4_tx
		b.hasPendingTx = false
	} else {
		// Stash this into pending internal tx
		b.pendingTx = tx
		b.hasPendingTx = true
		b.state = bolt4_pendingtx
	}
	b.txId = db.TxHandle(time.Now().Unix())
	return b.txId, nil
}

// Should NOT set b.err or change b.state as this is used to guard from
// misuse from clients that stick to their connections when they shouldn't.
func (b *bolt4) assertTxHandle(h1, h2 db.TxHandle) error {
	if h1 != h2 {
		err := errors.New("Invalid transaction handle")
		b.log.Error(log.Bolt4, b.logId, err)
		return err
	}
	return nil
}

// Should NOT set b.err or b.state since the connection is still valid
func (b *bolt4) assertState(allowed ...int) error {
	// Forward prior error instead, this former error is probably the
	// root cause of any state error. Like a call to Run with malformed
	// cypher causes an error and another call to Commit would cause the
	// state to be wrong. Do not log this.
	if b.err != nil {
		return b.err
	}
	for _, a := range allowed {
		if b.state == a {
			return nil
		}
	}
	err := errors.New(fmt.Sprintf("Invalid state %d, expected: %+v", b.state, allowed))
	b.log.Error(log.Bolt4, b.logId, err)
	return err
}

func (b *bolt4) TxCommit(txh db.TxHandle) error {
	if err := b.assertTxHandle(b.txId, txh); err != nil {
		return err
	}

	// Nothing to do, a transaction started but no commands were issued on it, server is unaware
	if b.state == bolt4_pendingtx {
		b.state = bolt4_ready
		return nil
	}

	// Consume pending stream if any to turn state from streamingtx to tx
	// Access to streams outside of tx boundary is not allowed, therefore we should discard
	// the stream (not buffer).
	if b.discardAllStreams(); b.err != nil {
		return b.err
	}

	// Should be in vanilla tx state now
	if err := b.assertState(bolt4_tx); err != nil {
		return err
	}

	// Send request to server to commit
	b.out.appendCommit()
	b.out.send(b.conn)
	succ := b.receiveSuccess()
	if b.err != nil {
		return b.err
	}
	// Keep track of bookmark
	if len(succ.bookmark) > 0 {
		b.bookmark = succ.bookmark
	}

	// Transition into ready state
	b.state = bolt4_ready
	return nil
}

func (b *bolt4) TxRollback(txh db.TxHandle) error {
	if err := b.assertTxHandle(b.txId, txh); err != nil {
		return err
	}

	// Nothing to do, a transaction started but no commands were issued on it
	if b.state == bolt4_pendingtx {
		b.state = bolt4_ready
		return nil
	}

	// Can not send rollback while still streaming, consume to turn state into tx
	// Access to streams outside of tx boundary is not allowed, therefore we should discard
	// the stream (not buffer).
	if b.discardAllStreams(); b.err != nil {
		return b.err
	}

	// Should be in vanilla tx state now
	if err := b.assertState(bolt4_tx); err != nil {
		return err
	}

	// Send rollback request to server
	b.out.appendRollback()
	b.out.send(b.conn)
	if b.receiveSuccess(); b.err != nil {
		return b.err
	}

	b.state = bolt4_ready
	return nil
}

// Discards all records in current stream if in streaming state and there is a current stream.
func (b *bolt4) discardStream() {
	if b.state != bolt4_streaming && b.state != bolt4_streamingtx {
		return
	}

	stream := b.streams.curr
	if stream == nil {
		return
	}

	discarded := false
	for {
		_, batch, sum := b.receiveNext()
		if batch {
			if discarded {
				// Response to discard, see below
				b.streams.remove(stream)
				b.checkStreams()
				return
			}
			// Discard all! After this the next receive will get another batch
			// as a response to the discard, we need to keep track of that we
			// already sent a discard.
			discarded = true
			stream.fetchSize = -1
			if b.state == bolt4_streamingtx && stream.qid != b.lastQid {
				b.out.appendDiscardNQid(stream.fetchSize, stream.qid)
			} else {
				b.out.appendDiscardN(stream.fetchSize)
			}
			b.out.send(b.conn)
		} else if sum != nil || b.err != nil {
			// Stream is detached in receiveNext
			return
		}
	}
}

func (b *bolt4) discardAllStreams() {
	if b.state != bolt4_streaming && b.state != bolt4_streamingtx {
		return
	}

	// Discard current
	b.discardStream()
	b.streams.reset()
	b.checkStreams()
}

// Sends a PULL n request to server. State should be streaming and there should be a current stream.
func (b *bolt4) sendPullN() {
	b.assertState(bolt4_streaming, bolt4_streamingtx)
	if b.state == bolt4_streaming {
		b.out.appendPullN(b.streams.curr.fetchSize)
		b.out.send(b.conn)
	} else if b.state == bolt4_streamingtx {
		fetchSize := b.streams.curr.fetchSize
		if b.streams.curr.qid == b.lastQid {
			b.out.appendPullN(fetchSize)
		} else {
			b.out.appendPullNQid(fetchSize, b.streams.curr.qid)
		}
		b.out.send(b.conn)
	}
}

// Collects all records in current stream if in streaming state and there is a current stream.
func (b *bolt4) bufferStream() {
	stream := b.streams.curr
	if stream == nil {
		return
	}

	// Buffer current batch and start infinite batch and/or buffer the infinite batch
	for {
		rec, batch, _ := b.receiveNext()
		if rec != nil {
			stream.push(rec)
		} else if batch {
			stream.fetchSize = -1
			b.sendPullN()
		} else {
			// Either summary or an error
			return
		}
	}
}

// Prepares the current stream for being switched out by collecting all records in the current
// stream up until the next batch. Assumes that we are in a streaming state.
func (b *bolt4) pauseStream() {
	stream := b.streams.curr
	if stream == nil {
		return
	}

	for {
		rec, batch, _ := b.receiveNext()
		if rec != nil {
			stream.push(rec)
		} else if batch {
			b.streams.pause()
			return
		} else {
			// Either summary or an error
			return
		}
	}
}

func (b *bolt4) resumeStream(s *stream) {
	b.streams.resume(s)
	b.sendPullN()
	if b.err != nil {
		return
	}
}

func (b *bolt4) run(cypher string, params map[string]interface{}, fetchSize int, tx *internalTx4) (*stream, error) {
	// If already streaming, consume the whole thing first
	if b.state == bolt4_streaming {
		if b.bufferStream(); b.err != nil {
			return nil, b.err
		}
	} else if b.state == bolt4_streamingtx {
		if b.pauseStream(); b.err != nil {
			return nil, b.err
		}
	}

	if err := b.assertState(bolt4_tx, bolt4_ready, bolt4_pendingtx, bolt4_streamingtx); err != nil {
		return nil, err
	}

	// Transaction meta data, used either in lazily started transaction or to run message.
	var meta map[string]interface{}
	if tx != nil {
		meta = tx.toMeta()
	}
	if b.state == bolt4_pendingtx {
		// Append lazy begin transaction message
		b.out.appendBegin(meta)
		meta = nil // Don't add this to run message again
	}

	// Append run message
	b.out.appendRun(cypher, params, meta)

	// Ensure that fetchSize is in a valid range
	switch {
	case fetchSize < 0:
		fetchSize = -1
	case fetchSize == 0:
		fetchSize = bolt4_fetchsize
	}
	// Append pull message and send it along with other pending messages
	b.out.appendPullN(fetchSize)
	b.out.send(b.conn)

	// Process server responses
	// Receive confirmation of transaction begin if it was started above
	if b.state == bolt4_pendingtx {
		if b.receiveSuccess(); b.err != nil {
			return nil, b.err
		}
		b.state = bolt4_tx
	}

	// Receive confirmation of run message
	succ := b.receiveSuccess()
	if b.err != nil {
		// If failed with a database error, there will be an ignored response for the
		// pull message as well, this will be cleaned up by Reset
		return nil, b.err
	}
	// Extract the RUN response from success response
	b.tfirst = succ.tfirst
	// Change state to streaming
	if b.state == bolt4_ready {
		b.state = bolt4_streaming
	} else {
		b.state = bolt4_streamingtx
	}

	// Create a stream representation, set it to current and track it
	stream := &stream{keys: succ.fields, qid: succ.qid, fetchSize: fetchSize}
	b.streams.attach(stream)
	// No need to check streams state, we know we are streaming

	return stream, nil
}

func (b *bolt4) Run(cmd db.Command, txConfig db.TxConfig) (db.StreamHandle, error) {
	if err := b.assertState(bolt4_streaming, bolt4_ready); err != nil {
		return nil, err
	}

	if err := b.checkImpersonationAndVersion(txConfig.ImpersonatedUser); err != nil {
		return 0, err
	}

	tx := internalTx4{
		mode:             txConfig.Mode,
		bookmarks:        txConfig.Bookmarks,
		timeout:          txConfig.Timeout,
		txMeta:           txConfig.Meta,
		databaseName:     b.databaseName,
		impersonatedUser: txConfig.ImpersonatedUser,
	}
	stream, err := b.run(cmd.Cypher, cmd.Params, cmd.FetchSize, &tx)
	if err != nil {
		return nil, err
	}
	return stream, nil
}

func (b *bolt4) RunTx(txh db.TxHandle, cmd db.Command) (db.StreamHandle, error) {
	if err := b.assertTxHandle(b.txId, txh); err != nil {
		return nil, err
	}

	tx := &b.pendingTx
	if !b.hasPendingTx {
		tx = nil
	}
	stream, err := b.run(cmd.Cypher, cmd.Params, cmd.FetchSize, tx)
	b.hasPendingTx = false
	if err != nil {
		return nil, err
	}
	return stream, nil
}

func (b *bolt4) Keys(streamHandle db.StreamHandle) ([]string, error) {
	// Don't care about if the stream is the current or even if it belongs to this connection.
	// Do NOT set b.err for this error
	stream, err := b.streams.getUnsafe(streamHandle)
	if err != nil {
		return nil, err
	}
	return stream.keys, nil
}

// Reads one record from the stream.
func (b *bolt4) Next(streamHandle db.StreamHandle) (*db.Record, *db.Summary, error) {
	// Do NOT set b.err for this error
	stream, err := b.streams.getUnsafe(streamHandle)
	if err != nil {
		return nil, nil, err
	}

	// Buffered stream or someone else's stream, doesn't matter...
	// Summary and error are considered buffered as well.
	buf, rec, sum, err := stream.bufferedNext()
	if buf {
		return rec, sum, err
	}

	// Make sure that the stream belongs to this bolt instance otherwise we might mess
	// up the internal state machine really bad. If clients stick to streams out of
	// transaction scope or after the connection been sent back to the pool we might end
	// up here.
	if err = b.streams.isSafe(stream); err != nil {
		return nil, nil, err
	}

	// If the stream isn't the current we must finish what we're doing with the current stream
	// and make it the current one.
	if stream != b.streams.curr {
		b.pauseStream()
		if b.err != nil {
			return nil, nil, b.err
		}
		b.resumeStream(stream)
	}

	rec, batchCompleted, sum := b.receiveNext()
	if batchCompleted {
		b.sendPullN()
		if b.err != nil {
			return nil, nil, b.err
		}
		rec, _, sum = b.receiveNext()
	}
	return rec, sum, b.err
}

func (b *bolt4) Consume(streamHandle db.StreamHandle) (*db.Summary, error) {
	// Do NOT set b.err for this error
	stream, err := b.streams.getUnsafe(streamHandle)
	if err != nil {
		return nil, err
	}

	// If the stream already is complete we don't care about who it belongs to
	if stream.sum != nil || stream.err != nil {
		return stream.sum, stream.err
	}

	// Make sure the stream is safe (tied to this bolt instance and scope)
	if err = b.streams.isSafe(stream); err != nil {
		return nil, err
	}

	// We should be streaming otherwise it is a an internal error, shouldn't be
	// a safe stream while not streaming.
	if err = b.assertState(bolt4_streaming, bolt4_streamingtx); err != nil {
		return nil, err
	}

	// If the stream isn't current, we need to pause the current one.
	if stream != b.streams.curr {
		b.pauseStream()
		if b.err != nil {
			return nil, b.err
		}
		b.resumeStream(stream)
	}

	// If the stream is current, discard everything up to next batch and discard the
	// stream on the server.
	b.discardStream()
	return stream.sum, stream.err
}

func (b *bolt4) Buffer(streamHandle db.StreamHandle) error {
	// Do NOT set b.err for this error
	stream, err := b.streams.getUnsafe(streamHandle)
	if err != nil {
		return err
	}

	// If the stream already is complete we don't care about who it belongs to
	if stream.sum != nil || stream.err != nil {
		return stream.Err()
	}

	// Make sure the stream is safe
	// Do NOT set b.err for this error
	if err = b.streams.isSafe(stream); err != nil {
		return err
	}

	// We should be streaming otherwise it is a an internal error, shouldn't be
	// a safe stream while not streaming.
	if err = b.assertState(bolt4_streaming, bolt4_streamingtx); err != nil {
		return err
	}

	// If the stream isn't current, we need to pause the current one.
	if stream != b.streams.curr {
		b.pauseStream()
		if b.err != nil {
			return b.err
		}
		b.resumeStream(stream)
	}

	b.bufferStream()
	return stream.Err()
}

// Reads one record from the network and returns either a record, a flag that indicates that
// a PULL N batch completed, a summary indicating end of stream or an error.
// Assumes that there is a current stream and that streaming is active.
func (b *bolt4) receiveNext() (*db.Record, bool, *db.Summary) {
	res := b.receiveMsg()
	if b.err != nil {
		return nil, false, nil
	}

	switch x := res.(type) {
	case *db.Record:
		// A new record
		x.Keys = b.streams.curr.keys
		return x, false, nil
	case *success:
		// End of batch or end of stream?
		if x.hasMore {
			// End of batch
			return nil, true, nil
		}
		// End of stream, parse summary. Current implementation never fails.
		sum := x.summary()
		// Add some extras to the summary
		sum.Agent = b.serverVersion
		sum.Major = 4
		sum.Minor = b.minor
		sum.ServerName = b.serverName
		sum.TFirst = b.tfirst
		if len(sum.Bookmark) > 0 {
			b.bookmark = sum.Bookmark
		}
		// Done with this stream
		b.streams.detach(sum, nil)
		b.checkStreams()
		return nil, false, sum
	case *db.Neo4jError:
		b.setError(x, isFatalError(x)) // Will detach the stream
		return nil, false, nil
	default:
		// Unknown territory
		b.setError(errors.New("Unknown response"), true)
		return nil, false, nil
	}
}

func (b *bolt4) Bookmark() string {
	return b.bookmark
}

func (b *bolt4) IsAlive() bool {
	return b.state != bolt4_dead
}

func (b *bolt4) Birthdate() time.Time {
	return b.birthDate
}

func (b *bolt4) Reset() {
	defer func() {
		// Reset internal state
		b.txId = 0
		b.bookmark = ""
		b.hasPendingTx = false
		b.databaseName = db.DefaultDatabase
		b.err = nil
		b.streams.reset()
	}()

	if b.state == bolt4_ready || b.state == bolt4_dead {
		// No need for reset
		return
	}

	// Reset any pending error, should be matching bolt4_failed so
	// it should be recoverable.
	b.err = nil

	// Send the reset message to the server
	b.out.appendReset()
	b.out.send(b.conn)
	if b.err != nil {
		return
	}

	for {
		msg := b.receiveMsg()
		if b.err != nil {
			return
		}
		switch x := msg.(type) {
		case *ignored, *db.Record:
			// Command ignored
		case *success:
			if x.isResetResponse() {
				// Reset confirmed
				b.state = bolt4_ready
				return
			}
		default:
			b.state = bolt4_dead
			return
		}
	}
}

func (b *bolt4) GetRoutingTable(context map[string]string, bookmarks []string, database, impersonatedUser string) (*db.RoutingTable, error) {
	if err := b.assertState(bolt4_ready); err != nil {
		return nil, err
	}

	b.log.Infof(log.Bolt4, b.logId, "Retrieving routing table")
	if b.minor > 3 {
		extras := map[string]interface{}{}
		if database != db.DefaultDatabase {
			extras["db"] = database
		}
		if impersonatedUser != "" {
			extras["imp_user"] = impersonatedUser
		}
		b.out.appendRoute(context, bookmarks, extras)
		b.out.send(b.conn)
		succ := b.receiveSuccess()
		if b.err != nil {
			return nil, b.err
		}
		return succ.routingTable, nil
	}

	if err := b.checkImpersonationAndVersion(impersonatedUser); err != nil {
		return nil, err
	}

	if b.minor > 2 {
		b.out.appendRouteToV43(context, bookmarks, database)
		b.out.send(b.conn)
		succ := b.receiveSuccess()
		if b.err != nil {
			return nil, b.err
		}
		// On this version we will not receive the database name
		succ.routingTable.DatabaseName = database
		return succ.routingTable, nil
	}
	return b.callGetRoutingTable(context, bookmarks, database)
}

func (b *bolt4) callGetRoutingTable(context map[string]string, bookmarks []string, database string) (*db.RoutingTable, error) {
	// The query should run in system database, preserve current setting and restore it when
	// done.
	originalDatabaseName := b.databaseName
	b.databaseName = "system"
	defer func() { b.databaseName = originalDatabaseName }()

	// Query for the users default database or a specific database
	runCommand := db.Command{
		Cypher:    "CALL dbms.routing.getRoutingTable($context)",
		Params:    map[string]interface{}{"context": context},
		FetchSize: -1,
	}
	if database != db.DefaultDatabase {
		runCommand.Cypher = "CALL dbms.routing.getRoutingTable($context, $database)"
		runCommand.Params["database"] = database
	}
	txConfig := db.TxConfig{Mode: db.ReadMode, Bookmarks: bookmarks}
	streamHandle, err := b.Run(runCommand, txConfig)
	if err != nil {
		return nil, err
	}
	rec, _, err := b.Next(streamHandle)
	if err != nil {
		return nil, err
	}
	if rec == nil {
		return nil, errors.New("No routing table record")
	}
	// Just empty the stream, ignore the summary should leave the connection in ready state
	b.Next(streamHandle)

	table := parseRoutingTableRecord(rec)
	if table == nil {
		return nil, errors.New("Unable to parse routing table")
	}
	// On this version we will not recive the database name
	table.DatabaseName = database
	return table, nil
}

// Beware, could be called on another thread when driver is closed.
func (b *bolt4) Close() {
	b.log.Infof(log.Bolt4, b.logId, "Close")
	if b.state != bolt4_dead {
		b.out.appendGoodbye()
		b.out.send(b.conn)
	}
	b.conn.Close()
	b.state = bolt4_dead
}

func (b *bolt4) SelectDatabase(database string) {
	b.databaseName = database
}

func (b *bolt4) ForceReset() error {
	if b.state == bolt4_ready {
		b.out.appendReset()
		b.out.send(b.conn)
		if b.err != nil {
			return b.err
		}
		b.receiveMsg()
		return b.err
	}
	b.Reset()
	return b.err
}

func (b *bolt4) SetBoltLogger(boltLogger log.BoltLogger) {
	b.in.hyd.boltLogger = boltLogger
	b.out.boltLogger = boltLogger
}

const readTimeoutHintName = "connection.recv_timeout_seconds"

func (b *bolt4) initializeReadTimeoutHint(hints map[string]interface{}) {
	readTimeoutHint, ok := hints[readTimeoutHintName]
	if !ok {
		return
	}
	readTimeout, ok := readTimeoutHint.(int64)
	if !ok {
		b.log.Warnf(log.Bolt4, b.logId, `invalid %q value: %v, ignoring hint. Only strictly positive integer values are accepted`, readTimeoutHintName, readTimeoutHint)
		return
	}
	if readTimeout <= 0 {
		b.log.Warnf(log.Bolt4, b.logId, `invalid %q integer value: %d. Only strictly positive values are accepted"`, readTimeoutHintName, readTimeout)
		return
	}
	b.log.Infof(log.Bolt4, b.logId, `received "connection.recv_timeout_seconds" hint value of %d second(s)`, readTimeout)
	b.in.connReadTimeout = time.Duration(readTimeout) * time.Second
}

func isFatalError(err *db.Neo4jError) bool {
	// Treat expired auth as fatal so that pool is cleaned up of old connections
	return err != nil && err.Code == "Status.Security.AuthorizationExpired"
}
