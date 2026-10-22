const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const pinoHttp = require("pino-http");

const logger = require("./config/logger");
const healthRoutes = require("./routes/health.routes");
const notFound = require("./middlewares/not-found");
const errorHandler = require("./middlewares/error-handler");
const requestId = require("./middlewares/request-id");

const app = express();

app.disable("x-powered-by");

app.use(helmet());
app.use(cors());
app.use(requestId);
app.use(pinoHttp({ logger }));
app.use(express.json());

app.use("/", healthRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;