class CustomError extends Error {
  constructor(statusCode, message) {
    super(message || "Interval Server Error");
    this.statusCode = statusCode || 500;
  }
}

export default CustomError;
