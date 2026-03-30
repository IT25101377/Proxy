const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const basicAuth = require('basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Hardcoded credentials (change if you want, but keep simple)
const USERNAME = 'sliit';
const PASSWORD = 'sliit';

// Basic Auth Middleware
function authMiddleware(req, res, next) {
  const user = basicAuth(req);

  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Proxy Authentication Required"');
    return res.status(401).send('Proxy Authentication Required');
  }

  next();
}

// Apply authentication to all requests
app.use(authMiddleware);

// Proxy all requests to their original target
app.use('/', createProxyMiddleware({
  target: 'http://example.com',           // dummy target (overridden by changeOrigin + path)
  changeOrigin: true,
  secure: true,                           // for HTTPS targets
  xfwd: true,                             // forward client IP
  timeout: 30000,
  proxyTimeout: 30000,
  onProxyReq: (proxyReq, req, res) => {
    // Remove proxy-related headers that might cause issues
    proxyReq.removeHeader('proxy-connection');
    proxyReq.removeHeader('proxy-authorization');
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(502).send('Bad Gateway - Proxy Error');
  }
}));

// Health check endpoint (optional)
app.get('/health', (req, res) => {
  res.send('Proxy is running ✅');
});

app.listen(PORT, () => {
  console.log(`HTTP Proxy running on port ${PORT}`);
});
