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
    return res.status(401).send('401 Proxy Authentication Required');
  }
  next();
}

app.use(authMiddleware);

// ====================== HEALTH CHECK ======================
app.get('/health', (req, res) => {
  res.send('✅ Heroku HTTP Proxy is running - Ready for use');
});

// ====================== MAIN PROXY ======================
// This must come AFTER the health check
app.use(createProxyMiddleware({
  target: 'https://www.google.com',   // Dummy target (required)
  changeOrigin: true,
  secure: true,
  xfwd: true,
  followRedirects: true,
  timeout: 90000,
  proxyTimeout: 90000,

  // Key fix: Only proxy if it's NOT a request to our own domain
  router: (req) => {
    const host = req.headers.host || '';

    // Prevent self-loop: skip proxying requests to our Heroku app
    if (host.includes('herokuapp.com') || host.includes('kaveeshainduwara.lk')) {
      return null;                    // Let Express handle it (health check etc.)
    }

    // Forward to the original requested host (HTTPS by default)
    return `https://${host}`;
  },

  onProxyReq: (proxyReq, req) => {
    proxyReq.removeHeader('proxy-connection');
    proxyReq.removeHeader('proxy-authorization');
    proxyReq.removeHeader('connection');
  },

  onError: (err, req, res) => {
    console.error(`Proxy Error [${req.method} ${req.url}]:`, err.message);
    if (!res.headersSent) {
      res.status(502).send('502 Bad Gateway');
    }
  }
}));

app.listen(PORT, () => {
  console.log(`✅ Proxy listening on internal port ${PORT}`);
});
