
const { createProxyMiddleware } = require("http-proxy-middleware");
const config = require("../config/env");

const userProxy = createProxyMiddleware({
  pathFilter: "/api/users",
  target: config.userServiceUrl,
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
        "User Service proxy error"
      );

      if (res.headersSent) {
        return;
      }

      res.status(502).json({
        success: false,
        error: {
          code: "USER_SERVICE_UNAVAILABLE",
          message: "User service is temporarily unavailable",
        },
      });
    },
  },
});

module.exports = userProxy;
