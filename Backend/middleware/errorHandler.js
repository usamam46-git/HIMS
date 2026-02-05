// Global error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // MySQL specific errors
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
            success: false,
            message: 'Duplicate entry. This record already exists.',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
            success: false,
            message: 'Referenced record not found.',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({
            success: false,
            message: 'Database connection failed. Please check if MySQL is running.',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    // Default error
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

// 404 handler
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
};

export { errorHandler, notFoundHandler };
