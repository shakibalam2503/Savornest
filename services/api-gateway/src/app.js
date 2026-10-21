const config = require("./config/env");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const pino = require("pino");
const pinoHttp = require("pino-http");
const rateLimiter = require("./middlewares/rate-limiter");

const authProxy = require("./routes/auth.routes");
const healthRoutes = require("./routes/health.routes");
const notFound = require("./middlewares/not-found");
const errorHandler = require("./middlewares/error-handler");
const requestId = require("./middlewares/request-id");

const app = express();

const logger = pino({
  level: config.nodeEnv === "production" ? "info" : "debug",
});

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(requestId);
app.use(pinoHttp({ logger }));

// Rate limiter

app.use("/api", rateLimiter);

// Health endpoint: GET /health
app.use("/health", healthRoutes);

// Auth Service proxy
app.use(authProxy);

// Handle unmatched requests
app.use(notFound);

// Handle errors passed to Express
app.use(errorHandler);

module.exports = app;