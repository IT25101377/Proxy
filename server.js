const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const basicAuth = require('basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

const USERNAME = process.env.PROXY_USERNAME || 'sliit';
const PASSWORD = process.env.PROXY_PASSWORD || 'sliit';

// ====================== BASIC AUTH ======================
function authMiddleware(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Proxy Authentication Required"');
    return res.status(401).send('401 Proxy Authentication Required');
  }
  next();
}

app.use(authMiddleware);

// ====================== HEALTH CHECK (before proxy) ======================
app.get('/health', (req, res) => {
  res.send('✅ Heroku HTTP Proxy is running - Ready for use');
});

// ====================== FORWARD PROXY ======================
// Create proxy middleware once with a dynamic router for per-request target resolution
const forwardProxy = createProxyMiddleware({
  target: 'http://dynamic-target',   // overridden per-request by router
  router: (req) => `https://${req.headers.host}`,
  changeOrigin: true,
  secure: true,
  xfwd: true,
  followRedirects: true,
  timeout: 90000,
  proxyTimeout: 90000,

  on: {
    proxyReq: (proxyReq) => {
      proxyReq.removeHeader('proxy-connection');
      proxyReq.removeHeader('proxy-authorization');
      proxyReq.removeHeader('connection');
    },

    error: (err, req, res) => {
      console.error(`Proxy Error [${req.method} ${req.url}]:`, err.message);
      if (!res.headersSent) {
        res.status(502).send('502 Bad Gateway - Proxy failed to connect to target');
      }
    }
  }
});

app.use((req, res, next) => {
  // Skip proxy for our own health check and root
  if (req.path === '/health' || req.path === '/') {
    return next();
  }
  forwardProxy(req, res, next);
});

app.listen(PORT, () => {
  console.log(`✅ Proxy listening on internal port ${PORT}`);
});
