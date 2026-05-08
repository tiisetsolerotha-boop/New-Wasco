
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const { testConnection: testPG }    = require('./db/postgres');
const { testConnection: testMySQL } = require('./db/mysql');

const authRoutes      = require('./routes/auth');
const customerRoutes  = require('./routes/customers');
const billRoutes      = require('./routes/bills');
const usageRoutes     = require('./routes/usage');
const paymentRoutes   = require('./routes/payments');
const reportRoutes    = require('./routes/reports');
const leakageRoutes   = require('./routes/leakages');
const rateRoutes      = require('./routes/rates');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://wasco-app.vercel.app',
  ],
  credentials: true,
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
}));

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'WASCO API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/services', (req, res) => {
  res.json({
    services: [
      {
        name: 'Water Supply',
        description: 'Potable water supply to residential, commercial, and industrial premises across Lesotho.',
        icon: 'water'
      },
      {
        name: 'Sewerage Services',
        description: 'Wastewater collection, treatment, and safe disposal services in urban areas.',
        icon: 'pipe'
      },
      {
        name: 'Meter Reading',
        description: 'Regular monthly meter readings for accurate billing across all districts.',
        icon: 'meter'
      },
      {
        name: 'Leakage Reporting',
        description: 'Report water pipe leakages for prompt repair. Emergency response available 24/7.',
        icon: 'alert'
      }
    ],
    districts: [
      'Maseru','Berea','Leribe','Butha-Buthe','Mafeteng',
      'Mohale\'s Hoek','Quthing','Qacha\'s Nek','Mokhotlong','Thaba-Tseka'
    ]
  });
});

app.use('/api/auth',      authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bills',     billRoutes);
app.use('/api/usage',     usageRoutes);
app.use('/api/payments',  paymentRoutes);
app.use('/api/reports',   reportRoutes);
app.use('/api/leakages',      leakageRoutes);
app.use('/api/billing-rates', rateRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, async () => {
  console.log(`\n🚀 WASCO API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);

  await testPG();
  await testMySQL();
});

module.exports = app;
