# ThreatMapper UI

## Getting Started (using local node)

- You need at least Node.js 14.0.0 
- Get Yarn: `npm install -g yarn`
- Setup: `yarn install`
- Develop: `BACKEND_HOST=<dockerhost-ip> yarn start` and then open `http://localhost:4042/`

This will start a webpack-dev-server that serves the UI and proxies API requests to the container.
