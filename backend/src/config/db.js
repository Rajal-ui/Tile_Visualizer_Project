const mongoose = require('mongoose');
const { mongoUri } = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

let isConnected = false;

async function connectDB() {
  if (isConnected) return mongoose.connection;

  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(mongoUri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10000,
    autoIndex: process.env.NODE_ENV !== 'production',
  });

  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
