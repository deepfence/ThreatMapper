package utils

import (
	"context"
	"fmt"
	"net"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

func tcpConnect(host string, port string, timeout time.Duration) error {
	conn, err := net.DialTimeout("tcp", net.JoinHostPort(host, port), timeout)
	if err != nil {
		return err
	}
	if conn != nil {
		defer conn.Close()
	}
	return nil
}

func WaitServiceTCPConn(host string, port string, timeout time.Duration) error {

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	op := func() error {
		return tcpConnect(host, port, 5*time.Second)
	}

	notify := func(err error, d time.Duration) {
		log.Warn().Msgf("waited %s connecting %s:%s error: %s", d, host, port, err)
	}

	bf := backoff.NewConstantBackOff(10 * time.Second)

	err := backoff.RetryNotify(op, backoff.WithContext(bf, ctx), notify)
	if err != nil {
		return fmt.Errorf("failed to connect %s:%s error: %w", host, port, err)
	}

	return nil
}
