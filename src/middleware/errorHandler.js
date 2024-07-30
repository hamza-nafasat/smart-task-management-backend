const customErrorHandler = (err, req, res, next) => {
    res.status(err.statusCode || 500);
    res.json({
        success: false,
        message: err.message || "Internal Server Error",
    });
};

export default customErrorHandler;
