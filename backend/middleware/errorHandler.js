
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error({
    requestId: req.requestId,
    error: err.message,
    stack:
      process.env.NODE_ENV === "development"
        ? err.stack
        : undefined,
  });

  const requestedStatus = Number(err.statusCode);
  const statusCode =
    Number.isInteger(requestedStatus) &&
    requestedStatus >= 400 &&
    requestedStatus <= 599
      ? requestedStatus
      : 500;

  return res.status(statusCode).json({
    success: false,
    code:
      statusCode === 500
        ? "INTERNAL_SERVER_ERROR"
        : err.code || "REQUEST_ERROR",
    message:
      statusCode === 500
        ? "Internal server error"
        : err.message || "Request failed",
    requestId: req.requestId,
  });
};

module.exports = errorHandler;
