const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const basicAuth = require('basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Credentials from Heroku Config Vars (or defaults)
const USERNAME = process.env.PROXY_USERNAME || 'sliit';
const PASSWORD = process.env.PROXY_PASSWORD || 'sliit';

console.log(`🚀 Proxy starting with username: ${USERNAME}`);

// Basic Authentication Middleware
function authMiddleware(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Proxy Authentication Required"');
    return res.status(401).send('401 Proxy Authentication Required');
  }
  next();
}

// Apply authentication to all routes
app.use(authMiddleware);

// Dynamic HTTP Proxy (this is the fix)
app.use('/', createProxyMiddleware({
  // No static target needed — we use router instead
  router: (req) => {
    // Forward to the original host the client requested
    const target = req.headers.host || req.hostname;
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' 
                     ? 'https:' 
                     : 'http:';
    return `${protocol}//${target}`;
  },
  changeOrigin: true,
  secure: true,           // verify SSL for HTTPS targets
  xfwd: true,             // forward original client IP
  timeout: 60000,
  proxyTimeout: 60000,

  onProxyReq: (proxyReq, req) => {
    // Clean up headers that can cause issues
    proxyReq.removeHeader('proxy-connection');
    proxyReq.removeHeader('proxy-authorization');
  },

  onError: (err, req, res) => {
    console.error('Proxy Error:', err.message);
    res.status(502).send('502 Bad Gateway - Proxy Error');
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.send('✅ Heroku HTTP Proxy is running successfully');
});

app.listen(PORT, () => {
  console.log(`✅ Authenticated HTTP Proxy listening on port ${PORT}`);
});
