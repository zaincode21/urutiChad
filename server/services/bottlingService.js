const { v4: uuidv4 } = require('uuid');
const database = require('../database/database');

class BottlingService {
  /**
   * Generate a unique batch number
   */
  generateBatchNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BATCH${year}${month}${day}-${random}`;
  }

  /**
   * Generate SKU for finished product
   */
  generateSKU(perfumeName, sizeMl) {
    const prefix = perfumeName.substring(0, 3).toUpperCase();
    return `PERF-${prefix}-${sizeMl}ML`;
  }

  /**
   * Generate short barcode for bottling batches (labeling-friendly)
   */
  generateShortBarcode(perfumeName, sizeMl, batchNumber = null) {
    // Generate 6-digit barcode
    const random6Digits = Math.floor(Math.random() * 900000) + 100000; // 100000-999999
    return random6Digits.toString();
  }

  /**
   * Generate alternative short barcode with batch reference
   */
  generateBatchBarcode(batchNumber, sizeMl) {
    // Extract batch number without prefix
    const batchCode = batchNumber.replace('BATCH', '').replace(/-/g, '');
    const sizeCode = sizeMl.toString().padStart(2, '0');
    
    // Format: [4-char batch][2-digit size]
    // Example: "20240115001" for batch BATCH20240115-001
    return `${batchCode}${sizeCode}`;
  }

  /**
   * Calculate total cost breakdown for bottling
   */
  async calculateBottlingCost(recipeId, quantity, bulkPerfumeId) {
    try {
      // Get recipe materials
      const materials = await database.all(`
        SELECT rm.*, rm2.name as material_name, rm2.cost_per_unit, rm2.current_stock
        FROM recipe_materials rm
        JOIN raw_materials rm2 ON rm.material_id = rm2.id
        WHERE rm.recipe_id = ?
      `, [recipeId]);

      // Get bulk perfume details
      const bulkPerfume = await database.get(`
        SELECT * FROM perfume_bulk WHERE id = ?
      `, [bulkPerfumeId]);

      if (!bulkPerfume) {
        throw new Error('Bulk perfume not found');
      }

      const costBreakdown = {
        perfume_cost: 0,
        bottle_cost: 0,
        cap_cost: 0,
        label_cost: 0,
        labor_cost: 0,
        overhead_cost: 0,
        total_cost: 0,
        unit_cost: 0,
        materials_used: []
      };

      // Calculate costs for each material
      for (const material of materials) {
        const totalQuantity = material.quantity_per_unit * quantity;
        const totalCost = totalQuantity * material.cost_per_unit;

        // Categorize costs
        if (material.material_name.toLowerCase().includes('bottle')) {
          costBreakdown.bottle_cost += totalCost;
        } else if (material.material_name.toLowerCase().includes('cap')) {
          costBreakdown.cap_cost += totalCost;
        } else if (material.material_name.toLowerCase().includes('label')) {
          costBreakdown.label_cost += totalCost;
        } else if (material.material_name.toLowerCase().includes('perfume')) {
          costBreakdown.perfume_cost += totalCost;
        }

        costBreakdown.materials_used.push({
          material_id: material.material_id,
          material_name: material.material_name,
          quantity: totalQuantity,
          unit_cost: material.cost_per_unit,
          total_cost: totalCost
        });
      }

      // Add labor cost (estimated 2 hours for setup + bottling)
      const laborRate = 15; // $15 per hour
      const laborHours = 2 + (quantity * 0.01); // 2 hours setup + 0.01 hours per bottle
      costBreakdown.labor_cost = laborHours * laborRate;

      // Add overhead (10% of direct costs)
      const directCosts = costBreakdown.perfume_cost + costBreakdown.bottle_cost + 
                         costBreakdown.cap_cost + costBreakdown.label_cost + costBreakdown.labor_cost;
      costBreakdown.overhead_cost = directCosts * 0.1;

      // Calculate totals
      costBreakdown.total_cost = directCosts + costBreakdown.overhead_cost;
      costBreakdown.unit_cost = costBreakdown.total_cost / quantity;

      return costBreakdown;
    } catch (error) {
      console.error('Calculate bottling cost error:', error);
      throw error;
    }
  }

  /**
   * Create a new bottling batch with comprehensive cost tracking
   */
  async createBottlingBatch(batchData) {
    const {
      recipeId,
      bulkPerfumeId,
      quantityPlanned,
      quantityProduced = quantityPlanned,
      quantityDefective = 0,
      productionDate,
      operatorId,
      supervisorId,
      notes = '',
      createdBy
    } = batchData;

    try {
      console.log('🔧 Starting batch creation transaction...');
      console.log('Batch data:', { recipeId, bulkPerfumeId, quantityPlanned, createdBy });
      
      // Start transaction
      await database.run('BEGIN');
      console.log('✅ Transaction started');

      // Generate batch number
      const batchNumber = this.generateBatchNumber();
      console.log('✅ Batch number generated:', batchNumber);

      // Calculate costs
      console.log('🔧 Calculating bottling costs...');
      const costBreakdown = await this.calculateBottlingCost(recipeId, quantityProduced, bulkPerfumeId);
      console.log('✅ Cost breakdown calculated:', costBreakdown);

      // Calculate selling price using profit margin (default 50%)
      const profitMargin = batchData.profit_margin || 50.00;
      const markupMultiplier = (profitMargin / 100) + 1;
      const sellingPrice = costBreakdown.unit_cost * markupMultiplier;

      // Calculate efficiency and waste percentages
      const efficiencyPercentage = quantityProduced > 0 ? 
        ((quantityProduced - quantityDefective) / quantityProduced) * 100 : 0;
      const wastePercentage = quantityProduced > 0 ? 
        (quantityDefective / quantityProduced) * 100 : 0;

      // Create bottling batch
      const batchId = uuidv4();
      console.log('🔧 Creating bottling batch record...');
      console.log('Batch ID:', batchId);
      
      await database.run(`
        INSERT INTO bottling_batches (
          id, batch_number, recipe_id, bulk_perfume_id, quantity_produced, quantity_planned,
          quantity_defective, total_cost, unit_cost, profit_margin, selling_price, status, production_date,
          efficiency_percentage, waste_percentage, operator_id, supervisor_id, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        batchId, batchNumber, recipeId, bulkPerfumeId, quantityProduced, quantityPlanned,
        quantityDefective, costBreakdown.total_cost, costBreakdown.unit_cost, profitMargin, sellingPrice,
        'planned', productionDate, efficiencyPercentage, wastePercentage, operatorId, 
        supervisorId, notes, createdBy
      ]);
      console.log('✅ Bottling batch record created');

      // Create production steps
      console.log('🔧 Creating production steps...');
      const productionSteps = [
        'Material Preparation',
        'Equipment Setup',
        'Bottling Process',
        'Quality Check',
        'Packaging',
        'Final Inspection'
      ];

      for (let i = 0; i < productionSteps.length; i++) {
        await database.run(`
          INSERT INTO batch_production_steps (
            id, batch_id, step_name, step_order, status, estimated_duration_minutes
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [uuidv4(), batchId, productionSteps[i], i + 1, 'pending', 30]);
      }
      console.log('✅ Production steps created');

      // Record cost components
      console.log('🔧 Recording cost components...');
      for (const material of costBreakdown.materials_used) {
        await database.run(`
          INSERT INTO cost_components (
            id, batch_id, component_type, component_name, quantity, unit_cost, total_cost
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(), batchId, 'material', material.material_name,
          material.quantity, material.unit_cost, material.total_cost
        ]);
      }
      console.log('✅ Cost components recorded');

      // Record labor cost
      await database.run(`
        INSERT INTO cost_components (
          id, batch_id, component_type, component_name, quantity, unit_cost, total_cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), batchId, 'labor', 'Labor Cost', 1, costBreakdown.labor_cost, costBreakdown.labor_cost
      ]);

      // Record overhead cost
      await database.run(`
        INSERT INTO cost_components (
          id, batch_id, component_type, component_name, quantity, unit_cost, total_cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), batchId, 'overhead', 'Overhead Cost', 1, costBreakdown.overhead_cost, costBreakdown.overhead_cost
      ]);

      // Update material stock levels
      for (const material of costBreakdown.materials_used) {
        await database.run(`
          UPDATE raw_materials 
          SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [material.quantity, material.material_id]);

        // Record in stock ledger
        await database.run(`
          INSERT INTO stock_ledger (
            id, material_id, transaction_type, quantity, unit_cost, total_value,
            reference_type, reference_id, notes, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(), material.material_id, 'consumption', material.quantity,
          material.unit_cost, material.total_cost, 'bottling_batch', batchId,
          `Bottling batch ${batchNumber}`, createdBy
        ]);
      }

      // Get recipe and bulk perfume details for product creation
      const recipe = await database.get(`
        SELECT br.*, bs.size_ml 
        FROM bottling_recipes br
        JOIN bottle_sizes bs ON br.bottle_size_id = bs.id
        WHERE br.id = ?
      `, [recipeId]);

      const bulkPerfume = await database.get(`
        SELECT * FROM perfume_bulk WHERE id = ?
      `, [bulkPerfumeId]);

      // Create or update finished product (upsert by SKU)
      const sku = this.generateSKU(bulkPerfume.name, recipe.size_ml);
      const productName = `${bulkPerfume.name} ${recipe.size_ml}ml`;
      
      // Generate short barcode for labeling (8 characters max)
      const shortBarcode = this.generateShortBarcode(bulkPerfume.name, recipe.size_ml, batchNumber);
      
      const finishedQuantity = quantityProduced - quantityDefective;

      const existingProduct = await database.get(`
        SELECT id, stock_quantity FROM products WHERE sku = ?
      `, [sku]);

      let productId;
      if (existingProduct) {
        productId = existingProduct.id;
        await database.run(`
          UPDATE products
          SET name = ?, description = ?, price = ?, cost_price = ?,
              stock_quantity = stock_quantity + ?, product_type = ?, size = ?,
              barcode = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          productName, bulkPerfume.scent_description, sellingPrice, costBreakdown.unit_cost,
          finishedQuantity, 'perfume', `${recipe.size_ml}ml`, shortBarcode, productId
        ]);
      } else {
        productId = uuidv4();
      await database.run(`
        INSERT INTO products (
          id, name, description, sku, barcode, price, cost_price, 
            stock_quantity, product_type, size, image_url, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        productId, productName, bulkPerfume.scent_description, sku, 
        shortBarcode, sellingPrice, costBreakdown.unit_cost,
          finishedQuantity, 'perfume', `${recipe.size_ml}ml`, null, 1, new Date().toISOString(), new Date().toISOString()
        ]);
      }

      // Optional: record finished goods addition in stock ledger if such ledger exists for products
      try {
        await database.run(`
          INSERT INTO stock_ledger (
            id, material_id, transaction_type, quantity, unit_cost, total_value,
            reference_type, reference_id, notes, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(), productId, 'production_in', finishedQuantity,
          costBreakdown.unit_cost, costBreakdown.unit_cost * finishedQuantity,
          'bottling_batch_finished_product', batchId,
          `Finished goods from bottling batch ${batchNumber}`, createdBy
        ]);
      } catch (e) {
        // Ignore if schema is raw-material specific; do not fail the transaction
      }

      // Decrement bulk perfume stock based on perfume usage in materials
      try {
        const perfumeQuantityUsed = costBreakdown.materials_used
          .filter(m => (m.material_name || '').toLowerCase().includes('perfume'))
          .reduce((sum, m) => sum + (m.quantity || 0), 0);

        if (perfumeQuantityUsed && perfumeQuantityUsed > 0) {
          await database.run(`
            UPDATE perfume_bulk
            SET bulk_quantity_liters = bulk_quantity_liters - ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [perfumeQuantityUsed, bulkPerfumeId]);
        }
      } catch (e) {
        // Log but do not abort the batch if bulk table not aligned
        console.warn('Failed to decrement perfume_bulk quantity:', e.message);
      }

      // Commit transaction
      console.log('🔧 Committing transaction...');
      await database.run('COMMIT');
      console.log('✅ Transaction committed successfully');

      return {
        batch_id: batchId,
        batch_number: batchNumber,
        quantity_planned: quantityPlanned,
        quantity_produced: quantityProduced,
        quantity_defective: quantityDefective,
        total_cost: costBreakdown.total_cost,
        unit_cost: costBreakdown.unit_cost,
        selling_price: sellingPrice,
        efficiency_percentage: efficiencyPercentage,
        waste_percentage: wastePercentage,
        status: 'planned',
        product_created: {
          id: productId,
          sku: sku,
          name: productName
        },
        cost_breakdown: costBreakdown,
        production_steps: productionSteps
      };

    } catch (error) {
      await database.run('ROLLBACK');
      console.error('Create bottling batch error:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Get bottling batch details with cost breakdown
   */
  async getBottlingBatch(batchId) {
    try {
      const batch = await database.get(`
        SELECT bb.*, br.name as recipe_name, pbp.name as perfume_name, 
               bs.size_ml, u.first_name, u.last_name
        FROM bottling_batches bb
        JOIN bottling_recipes br ON bb.recipe_id = br.id
        JOIN perfume_bulk pbp ON bb.bulk_perfume_id = pbp.id
        JOIN bottle_sizes bs ON br.bottle_size_id = bs.id
        JOIN users u ON bb.created_by = u.id
        WHERE bb.id = ?
      `, [batchId]);

      if (!batch) {
        throw new Error('Bottling batch not found');
      }

      // Get cost components
      const costComponents = await database.all(`
        SELECT * FROM cost_components 
        WHERE batch_id = ? 
        ORDER BY component_type, created_at
      `, [batchId]);

      return {
        batch,
        cost_components: costComponents
      };
    } catch (error) {
      console.error('Get bottling batch error:', error);
      throw error;
    }
  }

  /**
   * Update editable fields of bottling batch
   */
  async updateBottlingBatch(batchId, updates) {
    try {
      const allowed = {};
      if (updates.production_date !== undefined) allowed.production_date = updates.production_date;
      if (updates.notes !== undefined) allowed.notes = updates.notes;
      if (Object.keys(allowed).length === 0) {
        return { success: true, updated: false };
      }

      const setClause = Object.keys(allowed).map(k => `${k} = ?`).join(', ');
      const params = [...Object.values(allowed), batchId];
      await database.run(`UPDATE bottling_batches SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
      return { success: true, updated: true };
    } catch (error) {
      console.error('Update bottling batch error:', error);
      throw error;
    }
  }

  /**
   * Delete (cancel) bottling batch and reverse stock movements
   */
  async deleteBottlingBatch(batchId, userId) {
    try {
      await database.run('BEGIN');

      const batch = await database.get('SELECT * FROM bottling_batches WHERE id = ?', [batchId]);
      if (!batch) {
        await database.run('ROLLBACK');
        throw new Error('Batch not found');
      }

      // Check if batch is already cancelled
      if (batch.status === 'cancelled') {
        await database.run('ROLLBACK');
        throw new Error('Batch is already cancelled');
      }

      // Reverse raw material consumption
      const components = await database.all('SELECT * FROM cost_components WHERE batch_id = ? AND component_type = ?',[batchId, 'material']);
      for (const comp of components) {
        // Find material by name via recipe usage map
        const material = await database.get(
          `SELECT rm.material_id, rm2.cost_per_unit FROM recipe_materials rm
           JOIN raw_materials rm2 ON rm.material_id = rm2.id
           WHERE rm.recipe_id = ? AND rm2.name = ?`,
          [batch.recipe_id, comp.component_name]
        );
        if (material) {
          await database.run(
            'UPDATE raw_materials SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [comp.quantity, material.material_id]
          );
          await database.run(
            `INSERT INTO stock_ledger (id, material_id, transaction_type, quantity, unit_cost, total_value, reference_type, reference_id, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(), material.material_id, 'reversal_in', comp.quantity,
              material.cost_per_unit || 0, (material.cost_per_unit || 0) * comp.quantity,
              'bottling_batch_reversal', batchId, `Reversal of batch ${batch.batch_number}`, userId
            ]
          );
        }
      }

      // Reverse finished goods addition: find product by SKU
      const sku = this.generateSKU((await database.get('SELECT name FROM perfume_bulk WHERE id = ?', [batch.bulk_perfume_id]))?.name || 'PERF', (await database.get('SELECT bs.size_ml FROM bottling_recipes br JOIN bottle_sizes bs ON br.bottle_size_id = bs.id WHERE br.id = ?', [batch.recipe_id]))?.size_ml || 0);
      const product = await database.get('SELECT id FROM products WHERE sku = ?', [sku]);
      if (product) {
        const finishedQty = (batch.quantity_produced || 0) - (batch.quantity_defective || 0);
        await database.run('UPDATE products SET stock_quantity = GREATEST(stock_quantity - ?, 0), updated_at = CURRENT_TIMESTAMP WHERE id = ?',[finishedQty, product.id]);
        try {
          await database.run(
            `INSERT INTO stock_ledger (id, material_id, transaction_type, quantity, unit_cost, total_value, reference_type, reference_id, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), product.id, 'production_out_reversal', finishedQty, batch.unit_cost || 0, (batch.unit_cost || 0) * finishedQty, 'bottling_batch_finished_product_reversal', batchId, `Finished goods reversal for batch ${batch.batch_number}`, userId]
          );
        } catch (insertError) {
          console.warn('Failed to insert stock ledger entry for finished goods reversal:', insertError.message);
        }
      }

      // Mark batch as cancelled (soft delete)
      await database.run('UPDATE bottling_batches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',[ 'cancelled', batchId ]);

      await database.run('COMMIT');
      return { success: true, cancelled: true };
    } catch (error) {
      await database.run('ROLLBACK');
      console.error('Delete bottling batch error:', error);
      throw error;
    }
  }

  /**
   * Get bottling statistics and analytics
   */
  async getBottlingStats() {
    try {
      // Overall statistics
      const overallStats = await database.get(`
        SELECT 
          COUNT(*) as total_batches,
          SUM(quantity_produced) as total_bottles,
          SUM(total_cost) as total_cost,
          AVG(unit_cost) as avg_unit_cost,
          AVG(selling_price) as avg_selling_price
        FROM bottling_batches
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      // Cost breakdown by component
      const costBreakdown = await database.all(`
        SELECT 
          component_type,
          SUM(cc.total_cost) as total_cost,
          AVG(cc.unit_cost) as avg_unit_cost
        FROM cost_components cc
        JOIN bottling_batches bb ON cc.batch_id = bb.id
        WHERE bb.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY component_type
        ORDER BY total_cost DESC
      `);

      // Top performing recipes
      const topRecipes = await database.all(`
        SELECT 
          br.name as recipe_name,
          COUNT(bb.id) as batch_count,
          SUM(bb.quantity_produced) as total_bottles,
          AVG(bb.unit_cost) as avg_unit_cost
        FROM bottling_batches bb
        JOIN bottling_recipes br ON bb.recipe_id = br.id
        WHERE bb.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY br.id
        ORDER BY total_bottles DESC
        LIMIT 5
      `);

      // Low stock alerts
      const lowStockMaterials = await database.all(`
        SELECT 
          name, current_stock, min_stock_level, unit
        FROM raw_materials
        WHERE current_stock <= min_stock_level AND is_active = true
        ORDER BY (current_stock / min_stock_level) ASC
      `);

      return {
        overall_stats: overallStats,
        cost_breakdown: costBreakdown,
        top_recipes: topRecipes,
        low_stock_alerts: lowStockMaterials
      };
    } catch (error) {
      console.error('Get bottling stats error:', error);
      throw error;
    }
  }

  /**
   * Forecast material requirements based on sales trends
   */
  async forecastMaterialRequirements(days = 30) {
    try {
      // Get recent bottling data
      const recentBatches = await database.all(`
        SELECT 
          bb.quantity_produced,
          bb.created_at,
          rm.material_id,
          rm.quantity_per_unit,
          rm2.name as material_name
        FROM bottling_batches bb
        JOIN recipe_materials rm ON bb.recipe_id = rm.recipe_id
        JOIN raw_materials rm2 ON rm.material_id = rm2.id
        WHERE bb.created_at >= NOW() - INTERVAL '${days} days'
        ORDER BY bb.created_at DESC
      `);

      // Calculate average daily consumption
      const materialConsumption = {};
      const daysData = days;

      recentBatches.forEach(batch => {
        const materialId = batch.material_id;
        const consumption = batch.quantity_produced * batch.quantity_per_unit;
        
        if (!materialConsumption[materialId]) {
          materialConsumption[materialId] = {
            material_name: batch.material_name,
            total_consumption: 0,
            daily_average: 0
          };
        }
        
        materialConsumption[materialId].total_consumption += consumption;
      });

      // Calculate daily averages and forecast
      const forecast = Object.keys(materialConsumption).map(materialId => {
        const material = materialConsumption[materialId];
        const dailyAverage = material.total_consumption / daysData;
        const forecast30Days = dailyAverage * 30;
        
        return {
          material_id: materialId,
          material_name: material.material_name,
          daily_average: dailyAverage,
          forecast_30_days: forecast30Days,
          current_stock: 0, // Will be populated from raw_materials
          days_remaining: 0 // Will be calculated
        };
      });

      // Get current stock levels
      for (const item of forecast) {
        const stock = await database.get(`
          SELECT current_stock FROM raw_materials WHERE id = ?
        `, [item.material_id]);
        
        if (stock) {
          item.current_stock = stock.current_stock;
          item.days_remaining = stock.current_stock / item.daily_average;
        }
      }

      return forecast;
    } catch (error) {
      console.error('Forecast material requirements error:', error);
      throw error;
    }
  }

  /**
   * Auto-suggest popular sizes based on sales trends
   */
  async getPopularSizes() {
    try {
      const popularSizes = await database.all(`
        SELECT 
          bs.size_ml,
          COUNT(bb.id) as batch_count,
          SUM(bb.quantity_produced) as total_bottles,
          AVG(bb.unit_cost) as avg_unit_cost,
          AVG(bb.selling_price) as avg_selling_price
        FROM bottling_batches bb
        JOIN bottling_recipes br ON bb.recipe_id = br.id
        JOIN bottle_sizes bs ON br.bottle_size_id = bs.id
        WHERE bb.created_at >= NOW() - INTERVAL '90 days'
        GROUP BY bs.size_ml
        ORDER BY total_bottles DESC
        LIMIT 5
      `);

      return popularSizes;
    } catch (error) {
      console.error('Get popular sizes error:', error);
      throw error;
    }
  }

  /**
   * Update batch status
   */
  async updateBatchStatus(batchId, status, userId, notes = '') {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };

      // Add timing data based on status
      if (status === 'in_progress') {
        updateData.start_time = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.end_time = new Date().toISOString();
        // Calculate production duration
        const batch = await database.get('SELECT start_time FROM bottling_batches WHERE id = ?', [batchId]);
        if (batch && batch.start_time) {
          const startTime = new Date(batch.start_time);
          const endTime = new Date();
          const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
          updateData.production_duration_minutes = durationMinutes;
        }
      }

      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updateData);

      await database.run(`
        UPDATE bottling_batches 
        SET ${setClause}
        WHERE id = ?
      `, [...values, batchId]);

      // Log status change
      await database.run(`
        INSERT INTO batch_production_steps (
          id, batch_id, step_name, step_order, status, notes, operator_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), batchId, `Status Change: ${status}`, 999, 'completed', notes, userId]);

      return { success: true, status, updated_at: updateData.updated_at };
    } catch (error) {
      console.error('Update batch status error:', error);
      throw error;
    }
  }

  /**
   * Update production step status
   */
  async updateProductionStep(stepId, status, operatorId, notes = '') {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'in_progress') {
        updateData.start_time = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.end_time = new Date().toISOString();
        // Calculate duration
        const step = await database.get('SELECT start_time FROM batch_production_steps WHERE id = ?', [stepId]);
        if (step && step.start_time) {
          const startTime = new Date(step.start_time);
          const endTime = new Date();
          const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
          updateData.duration_minutes = durationMinutes;
        }
      }

      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updateData);

      await database.run(`
        UPDATE batch_production_steps 
        SET ${setClause}, operator_id = ?
        WHERE id = ?
      `, [...values, operatorId, stepId]);

      return { success: true, status, updated_at: updateData.updated_at };
    } catch (error) {
      console.error('Update production step error:', error);
      throw error;
    }
  }

  /**
   * Record quality check
   */
  async recordQualityCheck(batchId, checkData) {
    try {
      const {
        checkType,
        inspectorId,
        passed,
        score,
        defectsFound = '',
        correctiveActions = '',
        reworkRequired = false,
        reworkQuantity = 0,
        notes = ''
      } = checkData;

      const checkId = uuidv4();
      await database.run(`
        INSERT INTO batch_quality_checks (
          id, batch_id, check_type, inspector_id, check_date, passed, score,
          defects_found, corrective_actions, rework_required, rework_quantity, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        checkId, batchId, checkType, inspectorId, new Date().toISOString(),
        passed, score, defectsFound, correctiveActions, reworkRequired, reworkQuantity, notes
      ]);

      // Update batch quality score if this is a final check
      if (checkType === 'final') {
        await database.run(`
          UPDATE bottling_batches 
          SET quality_score = ?, quality_notes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [score, notes, batchId]);
      }

      return { check_id: checkId, success: true };
    } catch (error) {
      console.error('Record quality check error:', error);
      throw error;
    }
  }

  /**
   * Record equipment usage
   */
  async recordEquipmentUsage(batchId, equipmentData) {
    try {
      const {
        equipmentId,
        equipmentName,
        startTime,
        endTime,
        usageHours,
        maintenanceRequired = false,
        issuesEncountered = '',
        operatorId
      } = equipmentData;

      const usageId = uuidv4();
      await database.run(`
        INSERT INTO batch_equipment_usage (
          id, batch_id, equipment_id, equipment_name, start_time, end_time,
          usage_hours, maintenance_required, issues_encountered, operator_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        usageId, batchId, equipmentId, equipmentName, startTime, endTime,
        usageHours, maintenanceRequired, issuesEncountered, operatorId
      ]);

      return { usage_id: usageId, success: true };
    } catch (error) {
      console.error('Record equipment usage error:', error);
      throw error;
    }
  }

  /**
   * Record environmental conditions
   */
  async recordEnvironmentalConditions(batchId, conditionsData) {
    try {
      const {
        temperatureCelsius,
        humidityPercentage,
        pressureHpa,
        notes = ''
      } = conditionsData;

      const conditionId = uuidv4();
      await database.run(`
        INSERT INTO batch_environmental_conditions (
          id, batch_id, temperature_celsius, humidity_percentage, pressure_hpa, recorded_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        conditionId, batchId, temperatureCelsius, humidityPercentage, pressureHpa,
        new Date().toISOString(), notes
      ]);

      return { condition_id: conditionId, success: true };
    } catch (error) {
      console.error('Record environmental conditions error:', error);
      throw error;
    }
  }

  /**
   * Get enhanced batch details with all related data
   */
  async getEnhancedBatchDetails(batchId) {
    try {
      const batch = await database.get(`
        SELECT bb.*, br.name as recipe_name, pbp.name as perfume_name, 
               bs.size_ml, u.first_name, u.last_name, u2.first_name as operator_first_name,
               u2.last_name as operator_last_name, u3.first_name as supervisor_first_name,
               u3.last_name as supervisor_last_name
        FROM bottling_batches bb
        JOIN bottling_recipes br ON bb.recipe_id = br.id
        JOIN perfume_bulk pbp ON bb.bulk_perfume_id = pbp.id
        JOIN bottle_sizes bs ON br.bottle_size_id = bs.id
        JOIN users u ON bb.created_by = u.id
        LEFT JOIN users u2 ON bb.operator_id = u2.id
        LEFT JOIN users u3 ON bb.supervisor_id = u3.id
        WHERE bb.id = ?
      `, [batchId]);

      if (!batch) {
        throw new Error('Bottling batch not found');
      }

      // Get cost components
      const costComponents = await database.all(`
        SELECT * FROM cost_components 
        WHERE batch_id = ? 
        ORDER BY component_type, created_at
      `, [batchId]);

      // Get production steps
      const productionSteps = await database.all(`
        SELECT bps.*, u.first_name, u.last_name
        FROM batch_production_steps bps
        LEFT JOIN users u ON bps.operator_id = u.id
        WHERE bps.batch_id = ? 
        ORDER BY bps.step_order
      `, [batchId]);

      // Get quality checks
      const qualityChecks = await database.all(`
        SELECT bqc.*, u.first_name, u.last_name
        FROM batch_quality_checks bqc
        JOIN users u ON bqc.inspector_id = u.id
        WHERE bqc.batch_id = ? 
        ORDER BY bqc.check_date
      `, [batchId]);

      // Get equipment usage
      const equipmentUsage = await database.all(`
        SELECT beu.*, u.first_name, u.last_name
        FROM batch_equipment_usage beu
        LEFT JOIN users u ON beu.operator_id = u.id
        WHERE beu.batch_id = ? 
        ORDER BY beu.start_time
      `, [batchId]);

      // Get environmental conditions
      const environmentalConditions = await database.all(`
        SELECT * FROM batch_environmental_conditions 
        WHERE batch_id = ? 
        ORDER BY recorded_at
      `, [batchId]);

      return {
        batch,
        cost_components: costComponents,
        production_steps: productionSteps,
        quality_checks: qualityChecks,
        equipment_usage: equipmentUsage,
        environmental_conditions: environmentalConditions
      };
    } catch (error) {
      console.error('Get enhanced batch details error:', error);
      throw error;
    }
  }
}

module.exports = new BottlingService(); 