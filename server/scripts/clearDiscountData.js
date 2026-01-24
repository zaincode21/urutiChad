const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '../database/retail.db');
const db = new sqlite3.Database(dbPath);

console.log('🧹 Clearing Discount Management System data...');

// Helper function to run queries
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        console.error('Error executing query:', err);
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
};

const clearDiscountData = async () => {
  try {
    // Clear data in the correct order to respect foreign key constraints
    console.log('🗑️  Clearing discount applications...');
    await runQuery('DELETE FROM discount_applications');
    
    console.log('🗑️  Clearing customer discount usage...');
    await runQuery('DELETE FROM customer_discount_usage');
    
    console.log('🗑️  Clearing discount campaigns...');
    await runQuery('DELETE FROM discount_campaigns');
    
    console.log('🗑️  Clearing discount business rules...');
    await runQuery('DELETE FROM discount_business_rules');
    
    console.log('🗑️  Clearing discounts...');
    await runQuery('DELETE FROM discounts');
    
    console.log('✅ All discount data cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing discount data:', error);
  } finally {
    db.close();
  }
};

clearDiscountData(); 