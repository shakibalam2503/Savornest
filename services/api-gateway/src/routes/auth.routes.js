const { createProxyMiddleware } = require("http-proxy-middleware");
const config = require("../config/env");

const authProxy = createProxyMiddleware({
  pathFilter: "/api/auth",
  target: config.authServiceUrl,
  changeOrigin: true,

  on: {
    error(req, res,err) {
      console.error("Auth Service proxy error:", err.message);
      /**
        // if data already sent then ERR_HTTP_HEADERS_SENT in the middle not possible to switch (200->502) , and on the hand if header not sent yet sends the 502 Bad Gateway status code and the clean JSON error message to the client.
       */
      if (!res.headersSent) { 
        res.writeHead(502, {
          "Content-Type": "application/json",
        });

        res.end(
          JSON.stringify({
            success: false,
            error: {
              code: "AUTH_SERVICE_UNAVAILABLE",
              message: "Authentication service is temporarily unavailable",
            },
          })
        );
      }
    },
  },
});

module.exports = authProxy;