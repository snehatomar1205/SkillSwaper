const dotenv = require("dotenv");

dotenv.config();

const requiredEnv = [
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "CLOUD_NAME",
  "CLOUD_API_KEY",
  "CLOUD_API_SECRET",
];

for (const key of requiredEnv) {
  if (
    typeof process.env[key] !== "string" ||
    process.env[key].trim() === ""
  ) {
    throw new Error(
      `Missing required environment variable: ${key}`
    );
  }
}

if (process.env.JWT_ACCESS_SECRET.length < 32) {
  throw new Error(
    "JWT_ACCESS_SECRET must be at least 32 characters long"
  );
}

if (process.env.JWT_REFRESH_SECRET.length < 32) {
  throw new Error(
    "JWT_REFRESH_SECRET must be at least 32 characters long"
  );
}

const sameSite = (
  process.env.COOKIE_SAME_SITE || "lax"
).toLowerCase();

if (!["strict", "lax", "none"].includes(sameSite)) {
  throw new Error(
    "COOKIE_SAME_SITE must be strict, lax, or none"
  );
}

if (
  process.env.NODE_ENV === "production" &&
  sameSite === "none" &&
  process.env.COOKIE_SECURE === "false"
) {
  throw new Error(
    "SameSite=None cookies require Secure in production"
  );
}
const env = {
  nodeEnv: process.env.NODE_ENV || "development",

  port: Number(process.env.PORT) || 5000,

  mongoUri: process.env.MONGO_URI,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,

    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite,
  },

  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",

  cloudinary: {
    cloudName: process.env.CLOUD_NAME,
    apiKey: process.env.CLOUD_API_KEY,
    apiSecret: process.env.CLOUD_API_SECRET,
  },

  redisUrl: process.env.REDIS_URL,

  elasticsearchUrl: process.env.ELASTICSEARCH_URL,
};

module.exports = env;