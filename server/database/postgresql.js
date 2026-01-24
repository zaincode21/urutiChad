const { Pool } = require('pg');
const path = require('path');

class PostgreSQLDatabase {
  constructor() {
    this.pool = null;
    this.init();
  }

  init() {
    // Parse DATABASE_URL or use individual connection parameters
    const databaseUrl = process.env.DATABASE_URL;
    
    if (databaseUrl) {
      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
    } else {
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'retail_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'Serge!@#123',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
    }

    // Test connection
    this.pool.on('connect', () => {
      console.log('✅ Connected to PostgreSQL database');
    });

    this.pool.on('error', (err) => {
      console.error('❌ PostgreSQL connection error:', err);
    });

    // Initialize tables
    this.createTables().catch(err => {
      console.error('❌ Error during table creation:', err);
    });
  }

  async createTables() {
    try {
      // Create tables using the PostgreSQL schema
      const schema = require('./schema');
      await schema.createTables(this);
      console.log('✅ All PostgreSQL tables created successfully');
      
      // Initialize default GL accounts
      await this.initializeDefaultGLAccounts();
    } catch (error) {
      console.error('❌ Error creating tables:', error);
    }
  }

  async initializeDefaultGLAccounts() {
    try {
      // Check if GL accounts already exist
      const result = await this.query('SELECT COUNT(*) as count FROM gl_accounts');
      if (result.rows[0].count > 0) {
        console.log('✅ GL accounts already initialized');
        return;
      }

      console.log('🔄 Initializing default GL accounts...');
      
      // Insert default GL account categories and accounts
      const defaultData = require('./gl-accounts-data');
      await defaultData.initializeGLAccounts(this);
      
      console.log('✅ Default GL accounts initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing GL accounts:', error);
    }
  }

  // Database operation methods
  async query(text, params = []) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async close() {
    await this.pool.end();
  }
}

// Create singleton instance
const database = new PostgreSQLDatabase();

module.exports = database;

