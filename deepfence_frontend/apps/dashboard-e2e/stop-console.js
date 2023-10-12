import 'dotenv/config';

const orchastratorURL = process.env.ORCHASTRATOR_URL;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

if (!orchastratorURL.length) {
  throw new Error('Orchastrator URL not set');
}

async function stopServer() {
  const startServerResponse = await fetch(`${orchastratorURL}/stop-console`, {
    method: 'POST',
    body: JSON.stringify({}),
    headers: {
      'content-type': 'application/json',
    },
  });
}

(async () => {
  await stopServer();
  console.log('console stopped');
})();
