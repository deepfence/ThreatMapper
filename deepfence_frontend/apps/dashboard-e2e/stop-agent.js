import 'dotenv/config';
const agentOrchastratorURL = process.env.AGENT_ORCHASTRATOR_URL;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function stopAgent() {
  await fetch(`${agentOrchastratorURL}/stop-agent`, {
    method: 'POST',
    body: JSON.stringify({}),
    headers: {
      'content-type': 'application/json',
    },
  });
}

(async () => {
  console.log('stopping agent....');
  await stopAgent();
  console.log('agent stopped.');
})();
