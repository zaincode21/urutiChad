const { Pool } = require('pg');

class Database {
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
      const config = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'retail_db',
        user: process.env.DB_USER || 'postgres',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      };
      
      // Always add password, default to empty string if not set
      // PostgreSQL requires password to be a string (even if empty)
      config.password = process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '';
      
      this.pool = new Pool(config);
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
      // Use the PostgreSQL schema
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

  // Convert SQLite query syntax to PostgreSQL
  convertSQLiteToPostgreSQL(sql, params) {
    // Convert ? placeholders to $1, $2, etc.
    let convertedSQL = sql;
    let paramIndex = 1;
    
    // Replace ? with $1, $2, etc.
    convertedSQL = convertedSQL.replace(/\?/g, () => `$${paramIndex++}`);
    
    // Convert SQLite-specific functions to PostgreSQL equivalents
    convertedSQL = convertedSQL.replace(/datetime\('now'\)/gi, 'NOW()');
    convertedSQL = convertedSQL.replace(/datetime\(([^)]+)\)/gi, '$1');
    convertedSQL = convertedSQL.replace(/date\('now'\)/gi, 'CURRENT_DATE');
    convertedSQL = convertedSQL.replace(/date\(([^)]+)\)/gi, '$1::DATE');
    convertedSQL = convertedSQL.replace(/strftime\('%Y-%m-%d', ([^)]+)\)/gi, '$1::DATE');
    
    // Convert boolean values
    convertedSQL = convertedSQL.replace(/is_active = 1/gi, 'is_active = true');
    convertedSQL = convertedSQL.replace(/is_active = 0/gi, 'is_active = false');
    
    // Fix deleted_at comparisons (PostgreSQL doesn't allow comparing timestamp with empty string)
    convertedSQL = convertedSQL.replace(/deleted_at = ''/gi, 'deleted_at IS NULL');
    convertedSQL = convertedSQL.replace(/\(deleted_at IS NULL OR deleted_at = ''\)/gi, 'deleted_at IS NULL');
    
    // Fix common SQL syntax issues
    convertedSQL = convertedSQL.replace(/,\s*\)/g, ')'); // Remove trailing commas
    convertedSQL = convertedSQL.replace(/,\s*,/g, ','); // Remove double commas
    
    // Handle empty string parameters that should be NULL
    const convertedParams = params.map(param => {
      if (param === '' || param === null || param === undefined) {
        return null;
      }
      return param;
    });
    
    return { sql: convertedSQL, params: convertedParams };
  }

  // Backward compatibility methods for SQLite syntax
  async get(sql, params = []) {
    const { sql: convertedSQL, params: convertedParams } = this.convertSQLiteToPostgreSQL(sql, params);
    const result = await this.query(convertedSQL, convertedParams);
    return result.rows[0] || null;
  }

  async all(sql, params = []) {
    const { sql: convertedSQL, params: convertedParams } = this.convertSQLiteToPostgreSQL(sql, params);
    const result = await this.query(convertedSQL, convertedParams);
    return result.rows;
  }

  async run(sql, params = []) {
    const { sql: convertedSQL, params: convertedParams } = this.convertSQLiteToPostgreSQL(sql, params);
    const result = await this.query(convertedSQL, convertedParams);
    return { 
      lastID: result.rows[0]?.id || null, 
      changes: result.rowCount || 0 
    };
  }
}

// Create singleton instance
const database = new Database();

module.exports = database; 