const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const employeeRoutes = require('./routes/employees');
const competencyRoutes = require('./routes/competencies');
const competencyFamilyRoutes = require('./routes/competency-families');
const jobRoutes = require('./routes/jobs');
const jobCompetencyRoutes = require('./routes/job-competencies');
const jobCriticalityRoutes = require('./routes/job-criticality');
const jobEvaluationRoutes = require('./routes/job-evaluations');
const jobSuccessorRoutes = require('./routes/job-successors');
const assessorRoutes = require('./routes/assessors');
const assessmentRoutes = require('./routes/assessments');
const questionRoutes = require('./routes/questions');
const userAssessmentRoutes = require('./routes/userAssessments');
const assessmentTemplateRoutes = require('./routes/assessmentTemplates');
const newAssessmentRoutes = require('./routes/newAssessments');
const uploadRoutes = require('./routes/upload');
const photoRoutes = require('./routes/photos');
const assessorManagementRoutes = require('./routes/assessorManagement');
const performanceReviewRoutes = require('./routes/performanceReviews');
const developmentPathRoutes = require('./routes/developmentPaths');
const ldInterventionRoutes = require('./routes/ldInterventions');
const idpRoutes = require('./routes/idp');
const settingsRoutes = require('./routes/settings');
const competencyEditRequestRoutes = require('./routes/competency-edit-requests');
const jcpEditRequestRoutes = require('./routes/jcp-edit-requests');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 5000;

// Memory optimization for Render
if (process.env.NODE_ENV === 'production') {
  // Increase memory limit warnings
  process.on('warning', (warning) => {
    if (warning.name === 'MaxListenersExceededWarning') {
      console.warn('Memory warning:', warning.message);
    }
  });
  
  // Set memory limits
  if (process.memoryUsage().heapUsed > 400 * 1024 * 1024) { // 400MB
    console.warn('High memory usage detected, consider optimizing');
  }
}

// Middleware
app.use(helmet());
// Configure CORS via environment variable for deploy flexibility
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // In development, be more permissive with localhost and Docker containers
    if (process.env.NODE_ENV === 'development') {
      if (origin && (
        origin.includes('localhost') || 
        origin.includes('127.0.0.1') ||
        origin.includes('kafu-frontend-dev') ||
        origin.includes('kafu-backend-dev') ||
        origin.includes('backend')
      )) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.includes(origin)) return callback(null, true);
    
    // Allow all Vercel domains for easier deployment
    if (origin && origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/competencies', competencyRoutes);
app.use('/api/competency-edit-requests', competencyEditRequestRoutes);
app.use('/api/competency-families', competencyFamilyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/job-competencies', jobCompetencyRoutes);
app.use('/api/job-criticality', jobCriticalityRoutes);
app.use('/api/job-evaluations', jobEvaluationRoutes);
app.use('/api/job-successors', jobSuccessorRoutes);
app.use('/api/assessors', assessorRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/user-assessments', userAssessmentRoutes);
app.use('/api/assessment-templates', assessmentTemplateRoutes);
app.use('/api/new-assessments', newAssessmentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/assessor-management', assessorManagementRoutes);
app.use('/api/competency-reviews', performanceReviewRoutes);
app.use('/api/development-paths', developmentPathRoutes);
app.use('/api/ld-interventions', ldInterventionRoutes);
app.use('/api/idp', idpRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/export', exportRoutes);

// Health check - MUST be before 404 handler
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: 'v4.7.5',
    idpCompatibility: 'enabled'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} - v4.7.5`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
