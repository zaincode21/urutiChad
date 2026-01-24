const database = require('./database');

async function updatePricingSchema() {
  try {
    console.log('Starting pricing schema updates...');

    // Add pricing-related columns to products table
    console.log('Adding pricing columns to products table...');
    
    try {
      await database.run(`
        ALTER TABLE products 
        ADD COLUMN pricing_strategy TEXT DEFAULT 'costPlus'
      `);
      console.log('✓ Added pricing_strategy column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ pricing_strategy column already exists');
      } else {
        console.log('⚠ Error adding pricing_strategy:', error.message);
      }
    }

    try {
      await database.run(`
        ALTER TABLE products 
        ADD COLUMN default_markup DECIMAL(5,2) DEFAULT 100.00
      `);
      console.log('✓ Added default_markup column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ default_markup column already exists');
      } else {
        console.log('⚠ Error adding default_markup:', error.message);
      }
    }

    try {
      await database.run(`
        ALTER TABLE products 
        ADD COLUMN packaging_cost DECIMAL(10,2) DEFAULT 0.00
      `);
      console.log('✓ Added packaging_cost column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ packaging_cost column already exists');
      } else {
        console.log('⚠ Error adding packaging_cost:', error.message);
      }
    }

    try {
      await database.run(`
        ALTER TABLE products 
        ADD COLUMN brand_premium BOOLEAN DEFAULT 0
      `);
      console.log('✓ Added brand_premium column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ brand_premium column already exists');
      } else {
        console.log('⚠ Error adding brand_premium:', error.message);
      }
    }

    try {
      await database.run(`
        ALTER TABLE products 
        ADD COLUMN quality_rating DECIMAL(3,1) DEFAULT 4.0
      `);
      console.log('✓ Added quality_rating column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ quality_rating column already exists');
      } else {
        console.log('⚠ Error adding quality_rating:', error.message);
      }
    }

    try {
      await database.run(`
        ALTER TABLE products 
        ADD COLUMN unique_features BOOLEAN DEFAULT 0
      `);
      console.log('✓ Added unique_features column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ unique_features column already exists');
      } else {
        console.log('⚠ Error adding unique_features:', error.message);
      }
    }

    // Create price_change_log table
    console.log('Creating price_change_log table...');
    
    try {
      await database.run(`
        CREATE TABLE price_change_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id TEXT NOT NULL,
          old_price DECIMAL(10,2) NOT NULL,
          new_price DECIMAL(10,2) NOT NULL,
          change_reason TEXT,
          pricing_strategy TEXT,
          calculated_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products (id)
        )
      `);
      console.log('✓ Created price_change_log table');
    } catch (error) {
      if (error.message.includes('table price_change_log already exists')) {
        console.log('✓ price_change_log table already exists');
      } else {
        console.log('⚠ Error creating price_change_log table:', error.message);
      }
    }

    // Create pricing_rules table
    console.log('Creating pricing_rules table...');
    
    try {
      await database.run(`
        CREATE TABLE pricing_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rule_name TEXT NOT NULL UNIQUE,
          rule_type TEXT NOT NULL,
          rule_conditions TEXT NOT NULL,
          rule_actions TEXT NOT NULL,
          priority INTEGER DEFAULT 1,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✓ Created pricing_rules table');
    } catch (error) {
      if (error.message.includes('table pricing_rules already exists')) {
        console.log('✓ pricing_rules table already exists');
      } else {
        console.log('⚠ Error creating pricing_rules table:', error.message);
      }
    }

    // Create market_data table
    console.log('Creating market_data table...');
    
    try {
      await database.run(`
        CREATE TABLE market_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id TEXT,
          data_type TEXT NOT NULL,
          data_value TEXT NOT NULL,
          source TEXT,
          confidence_score DECIMAL(3,2) DEFAULT 0.8,
          valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
          valid_until DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories (id)
        )
      `);
      console.log('✓ Created market_data table');
    } catch (error) {
      if (error.message.includes('table market_data already exists')) {
        console.log('✓ market_data table already exists');
      } else {
        console.log('⚠ Error creating market_data table:', error.message);
      }
    }

    // Create competitor_prices table
    console.log('Creating competitor_prices table...');
    
    try {
      await database.run(`
        CREATE TABLE competitor_prices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id TEXT NOT NULL,
          competitor_name TEXT NOT NULL,
          competitor_price DECIMAL(10,2) NOT NULL,
          currency TEXT DEFAULT 'RWF',
          source_url TEXT,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products (id)
        )
      `);
      console.log('✓ Created competitor_prices table');
    } catch (error) {
      if (error.message.includes('table competitor_prices already exists')) {
        console.log('✓ competitor_prices table already exists');
      } else {
        console.log('⚠ Error creating competitor_prices table:', error.message);
      }
    }

    // Create pricing_schedules table
    console.log('Creating pricing_schedules table...');
    
    try {
      await database.run(`
        CREATE TABLE pricing_schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          schedule_name TEXT NOT NULL,
          product_ids TEXT NOT NULL,
          pricing_strategy TEXT NOT NULL,
          schedule_type TEXT NOT NULL,
          schedule_data TEXT NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✓ Created pricing_schedules table');
    } catch (error) {
      if (error.message.includes('table pricing_schedules already exists')) {
        console.log('✓ pricing_schedules table already exists');
      } else {
        console.log('⚠ Error creating pricing_schedules table:', error.message);
      }
    }

    // Create indexes for performance
    console.log('Creating indexes...');
    
    try {
      await database.run(`
        CREATE INDEX idx_price_change_log_product 
        ON price_change_log (product_id, created_at)
      `);
      console.log('✓ Created price_change_log index');
    } catch (error) {
      if (error.message.includes('index idx_price_change_log_product already exists')) {
        console.log('✓ price_change_log index already exists');
      } else {
        console.log('⚠ Error creating price_change_log index:', error.message);
      }
    }

    try {
      await database.run(`
        CREATE INDEX idx_pricing_rules_type 
        ON pricing_rules (rule_type, priority, is_active)
      `);
      console.log('✓ Created pricing_rules index');
    } catch (error) {
      if (error.message.includes('index idx_pricing_rules_type already exists')) {
        console.log('✓ pricing_rules index already exists');
      } else {
        console.log('⚠ Error creating pricing_rules index:', error.message);
      }
    }

    try {
      await database.run(`
        CREATE INDEX idx_market_data_category 
        ON market_data (category_id, data_type, valid_from)
      `);
      console.log('✓ Created market_data index');
    } catch (error) {
      if (error.message.includes('index idx_market_data_category already exists')) {
        console.log('✓ market_data index already exists');
      } else {
        console.log('⚠ Error creating market_data index:', error.message);
      }
    }

    try {
      await database.run(`
        CREATE INDEX idx_competitor_prices_product 
        ON competitor_prices (product_id, competitor_name, last_updated)
      `);
      console.log('✓ Created competitor_prices index');
    } catch (error) {
      if (error.message.includes('index idx_competitor_prices_product already exists')) {
        console.log('✓ competitor_prices index already exists');
      } else {
        console.log('⚠ Error creating competitor_prices index:', error.message);
      }
    }

    // Insert default pricing rules
    console.log('Inserting default pricing rules...');
    
    try {
      await database.run(`
        INSERT INTO pricing_rules (rule_name, rule_type, rule_conditions, rule_actions, priority)
        VALUES 
        ('Low Inventory Premium', 'inventory', '{"inventory_level": {"operator": "<", "value": 10}}', '{"action": "multiply_price", "factor": 1.2}', 1),
        ('High Inventory Discount', 'inventory', '{"inventory_level": {"operator": ">", "value": 100}}', '{"action": "multiply_price", "factor": 0.95}', 2),
        ('Holiday Season Markup', 'seasonal', '{"month": {"operator": "in", "value": [11, 0]}}', '{"action": "multiply_price", "factor": 1.25}', 3),
        ('Weekend Pricing', 'temporal', '{"day_of_week": {"operator": "in", "value": [0, 6]}}', '{"action": "multiply_price", "factor": 1.15}', 4),
        ('Peak Hours Pricing', 'temporal', '{"hour": {"operator": "between", "value": [9, 17]}}', '{"action": "multiply_price", "factor": 1.1}', 5)
      `);
      console.log('✓ Inserted default pricing rules');
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        console.log('✓ Default pricing rules already exist');
      } else {
        console.log('⚠ Error inserting default pricing rules:', error.message);
      }
    }

    // Insert sample market data
    console.log('Inserting sample market data...');
    
    try {
      await database.run(`
        INSERT INTO market_data (category_id, data_type, data_value, source, confidence_score)
        VALUES 
        (NULL, 'inflation_rate', '0.02', 'economic_indicator', 0.9),
        (NULL, 'market_sentiment', 'positive', 'market_analysis', 0.8),
        (NULL, 'seasonal_factor', '1.1', 'seasonal_analysis', 0.85)
      `);
      console.log('✓ Inserted sample market data');
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        console.log('✓ Sample market data already exists');
      } else {
        console.log('⚠ Error inserting sample market data:', error.message);
      }
    }

    console.log('\n🎉 Pricing schema updates completed successfully!');
    console.log('\nNew features available:');
    console.log('• Intelligent pricing engine with 5 strategies');
    console.log('• Dynamic pricing based on inventory, time, and demand');
    console.log('• Market-based pricing with competitor analysis');
    console.log('• Value-based pricing with perceived value calculation');
    console.log('• Automated price optimization and recommendations');
    console.log('• Comprehensive pricing audit trail');
    console.log('• Configurable pricing rules and schedules');

  } catch (error) {
    console.error('❌ Error updating pricing schema:', error);
    throw error;
  }
}

// Run the schema update if this file is executed directly
if (require.main === module) {
  updatePricingSchema()
    .then(() => {
      console.log('Schema update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Schema update failed:', error);
      process.exit(1);
    });
}

module.exports = { updatePricingSchema };
