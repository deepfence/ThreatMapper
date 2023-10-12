import 'dotenv/config';
import url from 'node:url';

const orchastratorURL = process.env.ORCHASTRATOR_URL;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

if (!orchastratorURL.length) {
  throw new Error('Orchastrator URL not set');
}

async function startServer() {
  const startServerResponse = await fetch(`${orchastratorURL}/start-console`, {
    method: 'POST',
    body: JSON.stringify({
      tag: '2.0.0',
    }),
    headers: {
      'content-type': 'application/json',
    },
  });
}

async function checkIfConsoleIsRunning(remainingMs) {
  if (remainingMs < 0) {
    throw new Error('Server did not start within timeout.');
  }
  const orchastratorParsedURL = new url.URL(orchastratorURL);

  const consoleURL = `https://${orchastratorParsedURL.hostname}`;

  try {
    await fetch(consoleURL);
  } catch (e) {
    console.error(e);
    console.error('retrying...');
    await sleepMs(10000);
    await checkIfConsoleIsRunning(remainingMs - 10000);
  }
}

async function sleepMs(timeoutInMs) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, timeoutInMs);
  });
}

(async () => {
  await startServer();
  console.log('console start requested successfully, waiting for it to come up....');
  await checkIfConsoleIsRunning(300 * 60 * 1000);
  console.log('console is running. starting the test suite...');
})();
