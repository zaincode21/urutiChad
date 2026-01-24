// Load environment variables
require('dotenv').config();

// Create a minimal database connection for migration
const { Pool } = require('pg');

// Create a separate pool for migration to avoid triggering table creation
function createMigrationPool() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    return new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  } else {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'retail_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
    return new Pool(config);
  }
}

const migrationPool = createMigrationPool();

// Simple database wrapper for migration
const database = {
  async query(text, params = []) {
    const client = await migrationPool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  },
  async run(text, params = []) {
    const result = await this.query(text, params);
    return { lastID: null, changes: result.rowCount || 0 };
  },
  async close() {
    await migrationPool.end();
  }
};

async function addDiscountProductCategoryFields() {
  try {
    console.log('🔄 Adding product_types and category_ids columns to discounts table...');
    
    // Check if columns already exist
    const checkColumns = await database.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'discounts' 
      AND column_name IN ('product_types', 'category_ids')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    
    // Add product_types column (JSON array)
    if (!existingColumns.includes('product_types')) {
      try {
        await database.run(`
          ALTER TABLE discounts 
          ADD COLUMN product_types TEXT
        `);
        console.log('✅ Added product_types column');
      } catch (error) {
        if (error.message.includes('duplicate column name') || error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log('ℹ️ product_types column already exists, skipping...');
        } else {
          throw error;
        }
      }
    } else {
      console.log('ℹ️ product_types column already exists, skipping...');
    }
    
    // Add category_ids column (JSON array)
    if (!existingColumns.includes('category_ids')) {
      try {
        await database.run(`
          ALTER TABLE discounts 
          ADD COLUMN category_ids TEXT
        `);
        console.log('✅ Added category_ids column');
      } catch (error) {
        if (error.message.includes('duplicate column name') || error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log('ℹ️ category_ids column already exists, skipping...');
        } else {
          throw error;
        }
      }
    } else {
      console.log('ℹ️ category_ids column already exists, skipping...');
    }
    
    // Update applicable_to to support new values
    // Note: This is handled in the application logic, not database constraint
    console.log('✅ Discount product/category fields migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding discount product/category fields:', error);
    throw error;
  } finally {
    // Don't close database connection as it might be shared
  }
}

// Run the migration
if (require.main === module) {
  addDiscountProductCategoryFields()
    .then(() => {
      console.log('🎉 Migration completed!');
      return database.close();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      database.close().finally(() => {
        process.exit(1);
      });
    });
}

module.exports = addDiscountProductCategoryFields;

