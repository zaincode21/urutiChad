const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

class SQLiteToPostgreSQLMigrator {
  constructor() {
    this.sqliteDb = null;
    this.postgresPool = null;
  }

  async init() {
    // Initialize SQLite connection
    const sqlitePath = path.join(__dirname, '..', '..', 'database', 'retail.db');
    if (!fs.existsSync(sqlitePath)) {
      throw new Error(`SQLite database not found at ${sqlitePath}`);
    }

    this.sqliteDb = new sqlite3.Database(sqlitePath);

    // Initialize PostgreSQL connection
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      this.postgresPool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
    } else {
      this.postgresPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'retail_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres123',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
    }

    console.log('✅ Database connections initialized');
  }

  async migrate() {
    try {
      await this.init();
      
      console.log('🔄 Starting migration from SQLite to PostgreSQL...');
      
      // Test PostgreSQL connection
      await this.testPostgreSQLConnection();
      
      // Create PostgreSQL tables
      await this.createPostgreSQLTables();
      
      // Migrate data table by table
      await this.migrateTableData('users');
      await this.migrateTableData('shops');
      await this.migrateTableData('categories');
      await this.migrateTableData('brands');
      await this.migrateTableData('products');
      await this.migrateTableData('customers');
      await this.migrateTableData('orders');
      await this.migrateTableData('order_items');
      await this.migrateTableData('gl_account_categories');
      await this.migrateTableData('gl_accounts');
      await this.migrateTableData('settings');
      
      console.log('✅ Migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async testPostgreSQLConnection() {
    try {
      const result = await this.postgresPool.query('SELECT NOW()');
      console.log('✅ PostgreSQL connection successful:', result.rows[0].now);
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error);
      throw error;
    }
  }

  async createPostgreSQLTables() {
    console.log('🔄 Creating PostgreSQL tables...');
    
    // Temporarily disable foreign key constraints
    await this.postgresPool.query('SET session_replication_role = replica;');
    
    const schema = require('./schema');
    const db = {
      query: (text, params) => this.postgresPool.query(text, params)
    };
    
    await schema.createTables(db);
    console.log('✅ PostgreSQL tables created');
    
    // Re-enable foreign key constraints
    await this.postgresPool.query('SET session_replication_role = DEFAULT;');
  }

  async migrateTableData(tableName) {
    console.log(`🔄 Migrating ${tableName} table...`);
    
    try {
      // Get data from SQLite
      const sqliteData = await this.getSQLiteData(tableName);
      
      if (sqliteData.length === 0) {
        console.log(`⚠️  No data found in ${tableName} table`);
        return;
      }

      // Insert data into PostgreSQL
      await this.insertPostgreSQLData(tableName, sqliteData);
      
      console.log(`✅ Migrated ${sqliteData.length} records from ${tableName}`);
      
    } catch (error) {
      console.error(`❌ Error migrating ${tableName}:`, error);
      throw error;
    }
  }

  async getSQLiteData(tableName) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(`SELECT * FROM ${tableName}`, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async insertPostgreSQLData(tableName, data) {
    if (data.length === 0) return;

    // Temporarily disable foreign key constraints for data insertion
    await this.postgresPool.query('SET session_replication_role = replica;');

    try {
      // Get column names from first row
      const columns = Object.keys(data[0]);
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      
      const insertQuery = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;

      for (const row of data) {
        const values = columns.map(col => {
          // Handle UUID columns - convert empty strings to null
          if (col.endsWith('_id') || col === 'id') {
            const value = row[col];
            if (value === '' || value === null || value === undefined) {
              return null;
            }
            // Generate new UUID for non-UUID IDs
            if (typeof value === 'string' && !value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              return require('uuid').v4();
            }
            return value;
          }
          return row[col];
        });

        await this.postgresPool.query(insertQuery, values);
      }
    } finally {
      // Re-enable foreign key constraints
      await this.postgresPool.query('SET session_replication_role = DEFAULT;');
    }
  }

  async cleanup() {
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
    if (this.postgresPool) {
      await this.postgresPool.end();
    }
    console.log('✅ Database connections closed');
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrator = new SQLiteToPostgreSQLMigrator();
  migrator.migrate()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = SQLiteToPostgreSQLMigrator;
