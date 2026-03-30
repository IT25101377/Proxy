const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const basicAuth = require('basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

const USERNAME = process.env.PROXY_USERNAME || 'sliit';
const PASSWORD = process.env.PROXY_PASSWORD || 'sliit';

console.log(`🚀 Proxy starting with username: ${USERNAME}`);

// ====================== BASIC AUTH ======================
function authMiddleware(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Proxy Authentication Required"');
    return res.status(401).send('401 Proxy Authentication Required\n\nUse username: sliit | password: sliit');
  }
  next();
}

app.use(authMiddleware);

// ====================== HEALTH CHECK (before proxy) ======================
app.get('/health', (req, res) => {
  res.send('✅ Heroku HTTP Proxy is running - Ready for use');
});

// ====================== FORWARD PROXY ======================
app.use((req, res, next) => {
  // Skip proxy for our own health check and root
  if (req.path === '/health' || req.path === '/') {
    return next();
  }

  // Create proxy options dynamically
  const proxyOptions = {
    target: `https://${req.headers.host}`,   // Start with the requested host
    changeOrigin: true,
    secure: true,
    xfwd: true,
    followRedirects: true,
    timeout: 90000,
    proxyTimeout: 90000,

    onProxyReq: (proxyReq, req) => {
      proxyReq.removeHeader('proxy-connection');
      proxyReq.removeHeader('proxy-authorization');
      proxyReq.removeHeader('connection');
    },

    onError: (err, req, res) => {
      console.error(`Proxy Error [${req.method} ${req.url}]:`, err.message);
      if (!res.headersSent) {
        res.status(502).send('502 Bad Gateway - Proxy failed to connect to target');
      }
    }
  };

  const proxy = createProxyMiddleware(proxyOptions);
  proxy(req, res, next);
});

app.listen(PORT, () => {
  console.log(`✅ Proxy listening on internal port ${PORT}`);
});
