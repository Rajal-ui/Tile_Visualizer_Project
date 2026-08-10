const app = require('./app');
const { connectDB } = require('./config/db');
const redisClient = require('./config/redis');
const { checkElasticConnection } = require('./config/elasticsearch');
const { ensureTilesIndex } = require('./services/elasticsearch.service');
const { port, env } = require('./config/env');
const logger = require('./utils/logger');

let server;

async function bootstrap() {
  try {
    await connectDB();

    const elasticUp = await checkElasticConnection();
    if (elasticUp) {
      await ensureTilesIndex();
    } else {
      logger.warn('Starting without confirmed Elasticsearch connection - search will degrade to MongoDB fallback.');
    }

    server = app.listen(port, () => {
      logger.info(`🚀 Server running in ${env} mode on port ${port}`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
}

function gracefulShutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      try {
        await redisClient.quit();
      } catch (err) {
        logger.warn(`Error closing Redis: ${err.message}`);
      }
      logger.info('Server closed. Bye!');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force-exit if something hangs
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

bootstrap();
