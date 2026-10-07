const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");

const logger = require("../src/config/logger")
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");


const healthRoutes = require("./routes/health.route");
const authRoutes = require("./routes/auth.routes");
const googleOAuthRoutes = require("./routes/google-oauth.routes");

const app = express();


app.use(helmet()); // Used for security
app.use(cors());// CORS



app.use(express.json()); // Request parsing
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser()); // Cookies


// HTTP request logging
app.use(pinoHttp({logger,}));


app.use(healthRoutes)
app.use("/api/auth", authRoutes);
app.use("/api/auth/google", googleOAuthRoutes);

app.use(notFound); // 404 handler
app.use(errorHandler); // Global error handler
module.exports = app;