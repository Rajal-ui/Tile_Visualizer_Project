const winston = require('winston');
require('winston-daily-rotate-file');
const { env, isProd } = require('../config/env');

const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/%DATE%-app.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
  level: 'info',
});

const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tile-showroom-backend', env },
  transports: [
    fileRotateTransport,
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  ],
});

if (!isProd) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length && meta.service
            ? ''
            : JSON.stringify(meta);
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    })
  );
}

module.exports = logger;
