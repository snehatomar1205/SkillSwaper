const env = require("../config/env");
const parseRefreshExpiry = (value) => {
  const match = /^(\d+)([smhd])$/.exec(value);

  if (!match) {
    throw new Error(
      "JWT_REFRESH_EXPIRES_IN must use a format such as 15m, 12h, or 7d"
    );
  }

  const unitMs = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return Number(match[1]) * unitMs[match[2]];
};

const REFRESH_COOKIE_NAME =
  env.nodeEnv === "production"
    ? "__Host-refreshToken"
    : "refreshToken";


const refreshCookieOptions = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  path: "/",
};

const setRefreshTokenCookie = (res, token) => {
  res.cookie(
    REFRESH_COOKIE_NAME,
    token,
    {
      ...refreshCookieOptions,
      maxAge: parseRefreshExpiry(env.jwt.refreshExpiresIn),
    }
  );
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(
    REFRESH_COOKIE_NAME,
    refreshCookieOptions
  );
};

module.exports = {
  REFRESH_COOKIE_NAME,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
};