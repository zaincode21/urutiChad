const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SQLiteDatabase {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    const dbPath = path.join(__dirname, '../../database/retail.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ SQLite connection error:', err);
      } else {
        console.log('✅ Connected to SQLite database');
        this.createTables().catch(err => {
          console.error('❌ Error during table creation:', err);
        });
      }
    });
  }

  async createTables() {
    try {
      // Create expenses table with all required columns
      await this.run(`
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          shop_id TEXT,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency TEXT DEFAULT 'USD',
          expense_date DATE NOT NULL,
          receipt_url TEXT,
          is_recurring BOOLEAN DEFAULT 0,
          recurring_frequency TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (shop_id) REFERENCES shops (id),
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `);

      // Create users table if it doesn't exist
      await this.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          first_name TEXT,
          last_name TEXT,
          role TEXT DEFAULT 'user',
          shop_id TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create shops table if it doesn't exist
      await this.run(`
        CREATE TABLE IF NOT EXISTS shops (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT,
          phone TEXT,
          email TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ All SQLite tables created successfully');
    } catch (error) {
      console.error('❌ Error creating tables:', error);
    }
  }

  // Database operation methods
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Query error:', err);
          reject(err);
        } else {
          resolve({ rows, rowCount: rows.length });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Get error:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('All error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Run error:', err);
          reject(err);
        } else {
          resolve({ 
            lastID: this.lastID, 
            changes: this.changes 
          });
        }
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Close error:', err);
        }
        resolve();
      });
    });
  }
}

// Create singleton instance
const database = new SQLiteDatabase();

module.exports = database;

