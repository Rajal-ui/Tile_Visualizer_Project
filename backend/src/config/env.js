require('dotenv').config();

const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.error(`[CONFIG] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  mongoUri: process.env.MONGO_URI,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  cookieSecret: process.env.COOKIE_SECRET || 'dev_cookie_secret',

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttlShort: parseInt(process.env.REDIS_TTL_SHORT, 10) || 300,
    ttlMedium: parseInt(process.env.REDIS_TTL_MEDIUM, 10) || 1800,
    ttlLong: parseInt(process.env.REDIS_TTL_LONG, 10) || 86400,
  },

  elastic: {
    node: process.env.ELASTIC_NODE || 'http://localhost:9200',
    username: process.env.ELASTIC_USERNAME,
    password: process.env.ELASTIC_PASSWORD,
    tilesIndex: process.env.ELASTIC_TILES_INDEX || 'tiles',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  initialAdmin: {
    name: process.env.INITIAL_ADMIN_NAME || 'Super Admin',
    email: process.env.INITIAL_ADMIN_EMAIL,
    password: process.env.INITIAL_ADMIN_PASSWORD,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300,
    loginMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 5,
  },
};
