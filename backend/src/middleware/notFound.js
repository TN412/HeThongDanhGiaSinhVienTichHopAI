/**
 * 404 Not Found handler
 * This middleware runs when no route matches the request
 */
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      status: 404,
      path: req.originalUrl,
      method: req.method,
    },
  });
};

module.exports = notFound;
