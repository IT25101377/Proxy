const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const basicAuth = require('basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Get credentials from environment variables (set by app.json or manually)
const USERNAME = process.env.PROXY_USERNAME || 'sliit';
const PASSWORD = process.env.PROXY_PASSWORD || 'sliit';

console.log(`Proxy starting with username: ${USERNAME}`);

// Basic Auth Middleware
function authMiddleware(req, res, next) {
  const user = basicAuth(req);

  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Proxy Authentication Required"');
    return res.status(401).send('401 Proxy Authentication Required');
  }

  next();
}

app.use(authMiddleware);

// Main proxy middleware
app.use('/', createProxyMiddleware({
  changeOrigin: true,
  secure: true,
  xfwd: true,
  timeout: 60000,
  proxyTimeout: 60000,
  onProxyReq: (proxyReq, req) => {
    proxyReq.removeHeader('proxy-connection');
    proxyReq.removeHeader('proxy-authorization');
  },
  onError: (err, req, res) => {
    console.error('Proxy Error:', err.message);
    res.status(502).send('502 Bad Gateway - Proxy Error');
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.send('✅ HTTP Proxy is running on Heroku');
});

app.listen(PORT, () => {
  console.log(`🚀 Authenticated HTTP Proxy running on port ${PORT}`);
});
