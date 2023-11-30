HEALTH_ENDPOINT=https://${MGMT_CONSOLE_URL}:${MGMT_CONSOLE_PORT}/deepfence/ping
echo "Wait for a pong on ${HEALTH_ENDPOINT}"

until $(curl -k --output /dev/null --silent --fail ${HEALTH_ENDPOINT}); do
    echo '.'
    sleep 5
done
echo 'Got a pong, executing fluentbit bin'

exec $DF_INSTALL_DIR/opt/td-agent-bit/bin/fluent-bit -c $DF_INSTALL_DIR/etc/td-agent-bit/fluentbit-agent.conf
