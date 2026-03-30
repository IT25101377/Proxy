const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const basicAuth = require('basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

const USERNAME = process.env.PROXY_USERNAME || 'sliit';
const PASSWORD = process.env.PROXY_PASSWORD || 'sliit';

console.log(`🚀 Proxy starting with username: ${USERNAME}`);

// Basic Authentication
function authMiddleware(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Proxy Authentication Required"');
    return res.status(401).send('401 Proxy Authentication Required');
  }
  next();
}

app.use(authMiddleware);

// === FIXED PROXY CONFIGURATION ===
app.use(createProxyMiddleware({
  target: 'http://example.com',     // Dummy target - required by the library
  changeOrigin: true,
  secure: true,
  xfwd: true,
  followRedirects: true,
  timeout: 60000,
  proxyTimeout: 60000,

  // This router function is the key fix
  router: (req) => {
    const host = req.headers.host;
    
    // IMPORTANT: Skip proxying requests to our own Heroku domain to prevent loops
    if (host && (host.includes('herokuapp.com') || host.includes('kaveeshainduwara.lk'))) {
      return null;   // Let Express handle it (for /health etc.)
    }

    // Determine protocol (prefer HTTPS)
    const protocol = (req.headers['x-forwarded-proto'] === 'http') ? 'http:' : 'https:';
    
    return `${protocol}//${host}`;
  },

  onProxyReq: (proxyReq, req) => {
    proxyReq.removeHeader('proxy-connection');
    proxyReq.removeHeader('proxy-authorization');
    proxyReq.removeHeader('connection');
  },

  onError: (err, req, res) => {
    console.error(`Proxy Error [${req.method} ${req.url}]:`, err.message);
    if (!res.headersSent) {
      res.status(502).send('502 Bad Gateway - Proxy Error');
    }
  }
}));

// Health check (must come AFTER the proxy middleware)
app.get('/health', (req, res) => {
  res.send('✅ Heroku HTTP Proxy is running (Loop-fixed version)');
});

app.listen(PORT, () => {
  console.log(`✅ Proxy listening on internal port ${PORT}`);
});
