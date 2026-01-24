// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'sqlite:./tests/test.db';

// Global test utilities
global.testUtils = {
  // Generate test JWT token
  generateTestToken: (user = { id: 'test-user-id', role: 'admin' }) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
  },

  // Create test database connection
  createTestDb: async () => {
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const dbPath = path.join(__dirname, 'test.db');
    
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) reject(err);
        else resolve(db);
      });
    });
  },

  // Clean up test database
  cleanupTestDb: async (db) => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
