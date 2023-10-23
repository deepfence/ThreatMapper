import 'dotenv/config';
import url from 'node:url';

const consoleURL = process.env.CONSOLE_URL;
const agentOrchastratorURL = process.env.AGENT_ORCHASTRATOR_URL;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function startAgent() {
  // login with username pwd get token
  const loginResponse = await fetch(`${consoleURL}/deepfence/user/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: process.env.USERNAME,
      password: process.env.PASSWORD,
    }),
    headers: {
      'content-type': 'application/json',
    },
  });

  const { access_token: accessToken } = await loginResponse.json();
  // get api key using token
  const apiKeyResponse = await fetch(`${consoleURL}/deepfence/api-token`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const apiKeyResponseJSON = await apiKeyResponse.json();

  const apiKey = apiKeyResponseJSON[0].api_token;

  const consoleIp = url.parse(consoleURL).host;

  await fetch(`${agentOrchastratorURL}/start-agent`, {
    method: 'POST',
    body: JSON.stringify({
      tag: process.env.AGENT_TAG,
      consoleIp,
      apiKey,
    }),
    headers: {
      'content-type': 'application/json',
    },
  });
}

(async () => {
  console.log('starting agent....');
  await startAgent();
  console.log('agent start requested successfully.');
})();
