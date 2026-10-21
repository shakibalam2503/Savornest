const { createProxyMiddleware } = require("http-proxy-middleware");
const config = require("../config/env");

const authProxy = createProxyMiddleware({
  pathFilter: "/api/auth",
  target: config.authServiceUrl,
  changeOrigin: true,

  on: {
    proxyReq(proxyReq, req) {
      proxyReq.setHeader("X-Request-ID", req.id);
    },

    error(err, req, res) {
      req.log?.error(
        {
          err,
          requestId: req.id,
        },
        "Auth Service proxy error"
      );

      if (res.headersSent) {
        return;
      }

      res.status(502).json({
        success: false,
        error: {
          code: "AUTH_SERVICE_UNAVAILABLE",
          message: "Authentication service is temporarily unavailable",
        },
      });
    },
  },
});

module.exports = authProxy;
