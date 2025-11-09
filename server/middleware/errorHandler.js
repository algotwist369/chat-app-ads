/* eslint-disable no-unused-vars */
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const payload = {
    message: err.message || "Internal server error",
  };

  if (process.env.NODE_ENV !== "production" && err.stack) {
    payload.stack = err.stack;
  }

  if (err.details) {
    payload.details = err.details;
  }

  res.status(status).json(payload);
};

module.exports = errorHandler;


