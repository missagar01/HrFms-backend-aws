const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const employeeRoutes = require('./routes/employeeRoutes');
const requestRoutes = require('./routes/requestRoutes');
const ticketBookRoutes = require('./routes/ticketBookRoutes');
const leaveRequestRoutes = require('./routes/leaveRequestRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const planeVisitorRoutes = require('./routes/planeVisitorRoutes');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();

// Honor proxy headers so req.protocol/req.get('host') reflect the client-facing address
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));
app.use(express.urlencoded({ extended: true }));

// Log all POST requests to /api/requests
app.use('/api/requests', (req, res, next) => {
  if (req.method === 'POST') {
    console.log('🟢 APP: POST request to /api/requests');
    console.log('🟢 Raw body type:', typeof req.body);
    console.log('🟢 Raw body:', req.body);
  }
  next();
});

app.use((req, res, next) => {
  if (typeof req.body === 'string') {
    const trimmedBody = req.body.trim();
    if (trimmedBody.startsWith('{') || trimmedBody.startsWith('[')) {
      try {
        req.body = JSON.parse(req.body);
        console.log('🟡 Parsed JSON body:', req.body);
      } catch (error) {
        return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
      }
    }
  }
  return next();
});

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve static files (uploaded images)
const uploadsPath = path.resolve(__dirname, '../uploads');
console.log('📂 Serving static files from:', uploadsPath);
app.use('/uploads', express.static(uploadsPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/employees', employeeRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/tickets', ticketBookRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/planet-visitors', planeVisitorRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
