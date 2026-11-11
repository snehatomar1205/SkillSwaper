const crypto = require("crypto");

const requestId = (req, res, next) => {
  const incomingId = req.headers["x-request-id"];

  const id =
    typeof incomingId === "string" && incomingId.length <= 100
      ? incomingId
      : crypto.randomUUID();

  req.requestId = id;

  res.setHeader("X-Request-ID", id);

  next();
};

module.exports = requestId;