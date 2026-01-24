const database = require('../database/database');

async function updateBottlingBatchSchema() {
  try {
    console.log('🔄 Starting bottling batch schema update...');

    // Add new columns to bottling_batches table
    const alterQueries = [
      'ALTER TABLE bottling_batches ADD COLUMN quantity_planned INTEGER',
      'ALTER TABLE bottling_batches ADD COLUMN quantity_defective INTEGER DEFAULT 0',
      'ALTER TABLE bottling_batches ADD COLUMN production_date DATE',
      'ALTER TABLE bottling_batches ADD COLUMN start_time DATETIME',
      'ALTER TABLE bottling_batches ADD COLUMN end_time DATETIME',
      'ALTER TABLE bottling_batches ADD COLUMN production_duration_minutes INTEGER',
      'ALTER TABLE bottling_batches ADD COLUMN quality_score DECIMAL(3,2)',
      'ALTER TABLE bottling_batches ADD COLUMN quality_notes TEXT',
      'ALTER TABLE bottling_batches ADD COLUMN efficiency_percentage DECIMAL(5,2)',
      'ALTER TABLE bottling_batches ADD COLUMN waste_percentage DECIMAL(5,2)',
      'ALTER TABLE bottling_batches ADD COLUMN operator_id TEXT',
      'ALTER TABLE bottling_batches ADD COLUMN supervisor_id TEXT',
      'ALTER TABLE bottling_batches ADD COLUMN quality_inspector_id TEXT',
      'ALTER TABLE bottling_batches ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'
    ];

    for (const query of alterQueries) {
      try {
        await database.run(query);
        console.log(`✅ Executed: ${query}`);
      } catch (error) {
        console.log(`⚠️  Skipped (column may already exist): ${query}`);
      }
    }

    // Update existing batches to have quantity_planned = quantity_produced
    await database.run(`
      UPDATE bottling_batches 
      SET quantity_planned = quantity_produced 
      WHERE quantity_planned IS NULL
    `);
    console.log('✅ Updated existing batches with quantity_planned');

    // Update existing batches to have status = 'completed' if not set
    await database.run(`
      UPDATE bottling_batches 
      SET status = 'completed' 
      WHERE status IS NULL OR status = ''
    `);
    console.log('✅ Updated existing batches with status');

    // Create new tables
    const createTableQueries = [
      // Batch Production Steps tracking
      `CREATE TABLE IF NOT EXISTS batch_production_steps (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        step_name TEXT NOT NULL,
        step_order INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
        start_time DATETIME,
        end_time DATETIME,
        duration_minutes INTEGER,
        operator_id TEXT,
        notes TEXT,
        quality_check_passed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES bottling_batches (id) ON DELETE CASCADE,
        FOREIGN KEY (operator_id) REFERENCES users (id)
      )`,

      // Quality Control Records
      `CREATE TABLE IF NOT EXISTS batch_quality_checks (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        check_type TEXT NOT NULL CHECK(check_type IN ('visual', 'functional', 'chemical', 'packaging', 'final')),
        inspector_id TEXT NOT NULL,
        check_date DATETIME NOT NULL,
        passed BOOLEAN DEFAULT 0,
        score DECIMAL(3,2),
        defects_found TEXT,
        corrective_actions TEXT,
        rework_required BOOLEAN DEFAULT 0,
        rework_quantity INTEGER DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES bottling_batches (id) ON DELETE CASCADE,
        FOREIGN KEY (inspector_id) REFERENCES users (id)
      )`,

      // Batch Equipment Usage
      `CREATE TABLE IF NOT EXISTS batch_equipment_usage (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        equipment_name TEXT NOT NULL,
        start_time DATETIME,
        end_time DATETIME,
        usage_hours DECIMAL(5,2),
        maintenance_required BOOLEAN DEFAULT 0,
        issues_encountered TEXT,
        operator_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES bottling_batches (id) ON DELETE CASCADE,
        FOREIGN KEY (operator_id) REFERENCES users (id)
      )`,

      // Batch Environmental Conditions
      `CREATE TABLE IF NOT EXISTS batch_environmental_conditions (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        temperature_celsius DECIMAL(4,1),
        humidity_percentage DECIMAL(4,1),
        pressure_hpa DECIMAL(6,1),
        recorded_at DATETIME NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES bottling_batches (id) ON DELETE CASCADE
      )`
    ];

    for (const query of createTableQueries) {
      try {
        await database.run(query);
        console.log(`✅ Created table: ${query.split('(')[0].split('EXISTS ')[1]}`);
      } catch (error) {
        console.log(`⚠️  Table may already exist: ${error.message}`);
      }
    }

    // Create indexes for better performance
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_bottling_batches_status ON bottling_batches(status)',
      'CREATE INDEX IF NOT EXISTS idx_bottling_batches_production_date ON bottling_batches(production_date)',
      'CREATE INDEX IF NOT EXISTS idx_bottling_batches_operator_id ON bottling_batches(operator_id)',
      'CREATE INDEX IF NOT EXISTS idx_batch_production_steps_batch_id ON batch_production_steps(batch_id)',
      'CREATE INDEX IF NOT EXISTS idx_batch_production_steps_status ON batch_production_steps(status)',
      'CREATE INDEX IF NOT EXISTS idx_batch_quality_checks_batch_id ON batch_quality_checks(batch_id)',
      'CREATE INDEX IF NOT EXISTS idx_batch_quality_checks_check_type ON batch_quality_checks(check_type)',
      'CREATE INDEX IF NOT EXISTS idx_batch_equipment_usage_batch_id ON batch_equipment_usage(batch_id)',
      'CREATE INDEX IF NOT EXISTS idx_batch_environmental_conditions_batch_id ON batch_environmental_conditions(batch_id)'
    ];

    for (const query of indexQueries) {
      try {
        await database.run(query);
        console.log(`✅ Created index: ${query.split('INDEX ')[1].split(' ON')[0]}`);
      } catch (error) {
        console.log(`⚠️  Index may already exist: ${error.message}`);
      }
    }

    console.log('✅ Bottling batch schema update completed successfully!');
    
    // Verify the updated structure
    console.log('\n📊 Verifying updated table structure...');
    const tableInfo = await database.all("PRAGMA table_info(bottling_batches)");
    console.log('Updated bottling_batches table columns:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });

  } catch (error) {
    console.error('❌ Error updating bottling batch schema:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  updateBottlingBatchSchema()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = updateBottlingBatchSchema;
