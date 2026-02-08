import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import database connection
import { testConnection } from './config/db.js';

// Import routes
import opdServicesRoutes from './routes/opdServicesRoutes.js';
import shiftsRoutes from './routes/shiftsRoutes.js';
import expensesRoutes from './routes/expensesRoutes.js';
import consultantPaymentsRoutes from './routes/consultantPaymentsRoutes.js';
import opdPatientDataRoutes from './routes/opdPatientDataRoutes.js';
import opdShiftCashRoutes from './routes/opdShiftCashRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import doctorsRoutes from './routes/doctorsRoutes.js';
import mrDataRoutes from './routes/mrDataRoutes.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // React dev servers
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (development only)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'HIMS OPD Backend is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/opd-services', opdServicesRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/consultant-payments', consultantPaymentsRoutes);
app.use('/api/opd-patient-data', opdPatientDataRoutes);
app.use('/api/opd-shift-cash', opdShiftCashRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/mr-data', mrDataRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
    try {
        // Test database connection first
        const dbConnected = await testConnection();

        if (!dbConnected) {
            console.error('❌ Failed to connect to database. Server not started.');
            console.error('Please ensure MySQL/XAMPP is running and credentials in .env are correct.');
            process.exit(1);
        }

        app.listen(PORT, () => {
            console.log(`\n🏥 HIMS OPD Backend Server`);
            console.log(`📍 Running on: http://localhost:${PORT}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
            console.log(`\n📋 Available API Endpoints:`);
            console.log(`   • GET  /api/opd-services`);
            console.log(`   • GET  /api/shifts`);
            console.log(`   • GET  /api/expenses`);
            console.log(`   • GET  /api/consultant-payments`);
            console.log(`   • GET  /api/opd-patient-data`);
            console.log(`   • GET  /api/opd-shift-cash`);
            console.log(`   • GET  /api/reports/daily?date=YYYY-MM-DD`);
            console.log(`   • GET  /api/doctors`);
            console.log(`   • GET  /api/mr-data`);
            console.log(`\n✅ Server is ready to accept connections\n`);
        });
    } catch (error) {
        console.error('❌ Server startup failed:', error.message);
        process.exit(1);
    }
};

startServer();
