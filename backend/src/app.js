require('express-async-errors');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const { clientUrl, apiVersion, cookieSecret } = require('./config/env');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const logger = require('./utils/logger');

const app = express();

app.set('trust proxy', 1); // needed for correct req.ip behind load balancers (Render/Vercel/NGINX)

// ---- Security & parsing middleware ----
app.use(helmet());
app.use(
  cors({
    origin: clientUrl.split(',').map((o) => o.trim()),
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser(cookieSecret));
app.use(mongoSanitize()); // strips $ and . from req keys to prevent NoSQL injection
app.use(hpp()); // protects against HTTP parameter pollution

app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
    skip: () => process.env.NODE_ENV === 'test',
  })
);

// ---- Rate limiting (Redis-backed, applied globally) ----
app.use(`/api/${apiVersion}`, apiLimiter);

// ---- Routes ----
app.use(`/api/${apiVersion}`, routes);

app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Tile Showroom Visualization System API',
    status: 'running',
    docs: `/api/${apiVersion}/health`,
  });
});

// ---- 404 + centralized error handling ----
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
