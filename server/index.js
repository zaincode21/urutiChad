const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger');

// Load environment variables FIRST
// Load environment variables FIRST
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import database AFTER environment variables are loaded
const database = require('./database/database');

// Import cron scheduler for birthday and anniversary emails
const cronScheduler = require('./services/cronScheduler');

// Import routes
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const categoriesRoutes = require('./routes/categories');
const customersRoutes = require('./routes/customers');
const ordersRoutes = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const currencyRoutes = require('./routes/currency');
const dashboardRoutes = require('./routes/dashboard');
const shopsRoutes = require('./routes/shops');
const perfumeRoutes = require('./routes/perfume');
// SMART BOTTLING - COMMENTED OUT (Advanced recipe-based bottling system)
// Features: Recipe management, raw materials inventory, forecasting, analytics
// Uncomment if you need: Production-scale operations, detailed cost tracking, material forecasting
// const smartBottlingRoutes = require('./routes/smartBottling');
const procurementRoutes = require('./routes/procurement');
const notificationRoutes = require('./routes/notifications');
const integrationRoutes = require('./routes/integrations');
const loyaltyRoutes = require('./routes/loyalty');
const expensesRoutes = require('./routes/expenses');
const glAccountsRoutes = require('./routes/glAccounts');
const financialReportsRoutes = require('./routes/financialReports');
const layawayRoutes = require('./routes/layaway');
const brandsRoutes = require('./routes/brands');
const uploadRoutes = require('./routes/upload');
const discountRoutes = require('./routes/discounts');
const invoiceRoutes = require('./routes/invoices');
const salesAnalyticsRoutes = require('./routes/salesAnalytics');
const usersRoutes = require('./routes/users');
const pricingRoutes = require('./routes/pricing');
const settingsRoutes = require('./routes/settings');
const translationsRoutes = require('./routes/translations');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
// CORS configuration
// const corsOptions = {
//   origin: [
//     'http://localhost:3000', 
//     'http://127.0.0.1:3000',
//     'http://localhost:3001', 
//     'http://127.0.0.1:3001',
//     'http://localhost:5173', 
//     'http://127.0.0.1:5173',
//     'http://77.237.234.176',
//     'http://77.237.234.176:3000',
//     'http://77.237.234.176:3001',
//     'http://77.237.234.176:5173'
//   ],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// };

// app.use(cors(corsOptions));
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://84.247.131.178',
    'http://84.247.131.178:3000',
    'http://84.247.131.178:3001',
    'http://84.247.131.178:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Manual CORS headers as backup
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://84.247.131.178:3000',
    'http://84.247.131.178:3001',
    'http://84.247.131.178:5173'
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
});
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Likaperfumes API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/shops', shopsRoutes);
app.use('/api/perfume', perfumeRoutes);
// SMART BOTTLING ROUTES - COMMENTED OUT
// Uncomment the line below to enable Smart Bottling system
// app.use('/api/smart-bottling', smartBottlingRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/gl-accounts', glAccountsRoutes);
app.use('/api/financial-reports', financialReportsRoutes);
app.use('/api/layaway', layawayRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/sales-analytics', salesAnalyticsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/raw-materials', require('./routes/raw_materials'));
app.use('/api/v1/translations', translationsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  database.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  database.close();
  process.exit(0);
}); 