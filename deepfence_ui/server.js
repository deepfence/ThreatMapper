const express = require('express');
const http = require('http');
const httpProxy = require('http-proxy');
const HttpProxyRules = require('http-proxy-rules');
const compression = require('compression');

const app = express();

const BACKEND_HOST = process.env.BACKEND_HOST || 'deepfence-topology';
const BACKEND_PORT = process.env.BACKEND_PORT || '8004';

/**
 * inject runtime env variables.
 * sensitive variables should not go here.
 */
 app.get('/env-config.js', (_, res) => {
  res.set("content-type", "application/javascript").send(`
    window._env = {
      env: ${process.env.NODE_ENV ? `'${process.env.NODE_ENV}'` : `'development'`},
    };
  `);
});

/**
 *
 * Proxy requests to:
 *   - /api -> :4040/api
 *
 *********************************************************** */
const backendProxy = httpProxy.createProxy({
  ws: true,
  target: `http://${BACKEND_HOST}:${BACKEND_PORT}`,
});
backendProxy.on('error', err => console.error('Proxy error', err));
app.all('/api*', backendProxy.web.bind(backendProxy));
app.all('/ws*', backendProxy.web.bind(backendProxy));

// Set health check url
app.get('/health', (req, res) => {
  res.writeHead(200, {'Content-Type': 'application/json'});
  return res.end('{"status":"Healthy"}');
})
/**
 *
 * Production env serves precompiled content from build/
 *
 *********************************************************** */

if (process.env.NODE_ENV === 'production') {
  app.use(compression());
  app.use(express.static('build'));
}

/**
 *
 * Webpack Dev Middleware with Hot Reload
 *
 * See: https://github.com/webpack/webpack-dev-middleware;
 *      https://github.com/glenjamin/webpack-hot-middleware
 *
 ************************************************************ */

if (process.env.NODE_ENV !== 'production') {
  const webpack = require('webpack');
  const webpackMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const config = require('./webpack.local.config');
  const compiler = webpack(config);

  app.use(webpackMiddleware(compiler, {
    publicPath: config.output.publicPath,
    stats: 'errors-only',
  }));

  app.use(webpackHotMiddleware(compiler));
}


/**
 *
 * Express server
 *
 **************** */

const port = process.env.PORT || 4042;
const server = app.listen(port, '0.0.0.0', () => {
  const host = server.address().address;

  console.log('Deepfence UI listening at http://%s:%s', host, port);
});

server.on('upgrade', backendProxy.ws.bind(backendProxy));


/**
 *
 * Path proxy server
 *
 ************************************************************ */

const proxyRules = new HttpProxyRules({
  rules: {
    '/scoped/': `http://localhost:${port}`,
  }
});

const pathProxy = httpProxy.createProxy({ws: true});
pathProxy.on('error', err => console.error('path proxy error', err));
const pathProxyPort = port + 1;
const proxyPathServer = http.createServer((req, res) => {
  const target = proxyRules.match(req);
  if (!target) {
    res.writeHead(500, {'Content-Type': 'text/plain'});
    return res.end('No rules matched! Check out /scoped/');
  }
  return pathProxy.web(req, res, {target});
}).listen(pathProxyPort, '0.0.0.0', () => {
  const pathProxyHost = proxyPathServer.address().address;
  console.log('Deepfence Proxy Path UI listening at http://%s:%s/scoped/',
    pathProxyHost, pathProxyPort);
});

proxyPathServer.on('upgrade', (req, socket, head) => {
  const target = proxyRules.match(req);
  if (target) {
    pathProxy.ws(req, socket, head, {target});
  }
});
