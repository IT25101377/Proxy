const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const basicAuth = require('basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

const USERNAME = process.env.PROXY_USERNAME || 'sliit';
const PASSWORD = process.env.PROXY_PASSWORD || 'sliit';

console.log(`🚀 Proxy starting with username: ${USERNAME}`);

// Basic Auth
function authMiddleware(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Proxy Authentication Required"');
    return res.status(401).send('401 Proxy Authentication Required');
  }
  next();
}

app.use(authMiddleware);

// Better Proxy Configuration
app.use('/', createProxyMiddleware({
  // This is the most reliable way for a generic HTTP proxy
  target: 'http://www.google.com',   // dummy target - will be overridden
  changeOrigin: true,
  secure: true,
  xfwd: true,
  followRedirects: true,             // important for many sites
  timeout: 60000,
  proxyTimeout: 60000,

  // Dynamic target based on the original Host header
  router: (req) => {
    let protocol = 'https:';   // default to HTTPS (safer for most modern sites)
    const host = req.headers.host || req.hostname;

    // Try to detect protocol from X-Forwarded-Proto (Heroku sends this)
    if (req.headers['x-forwarded-proto'] === 'http') {
      protocol = 'http:';
    }

    return `${protocol}//${host}`;
  },

  onProxyReq: (proxyReq, req, res) => {
    // Clean problematic headers
    proxyReq.removeHeader('proxy-connection');
    proxyReq.removeHeader('proxy-authorization');
    proxyReq.removeHeader('connection');   // sometimes helps
  },

  onError: (err, req, res) => {
    console.error('Proxy Error for', req.method, req.url, ':', err.message);
    res.status(502).send(`502 Bad Gateway - ${err.message}`);
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.send('✅ Heroku HTTP Proxy is running (Fixed version)');
});

app.listen(PORT, () => {
  console.log(`✅ Proxy listening on internal port ${PORT}`);
});
