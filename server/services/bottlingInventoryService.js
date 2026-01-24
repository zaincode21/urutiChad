const database = require('../database/database');
const { v4: uuidv4 } = require('uuid');

class BottlingInventoryService {
  
  /**
   * Start a bottling batch and consume raw materials
   */
  async startBatch(batchData) {
    const { recipe_id, quantity_planned, operator_id } = batchData;
    
    try {
      // Start transaction
      await database.run('BEGIN');
      
      // 1. Create the bottling batch
      const batchId = uuidv4();
      const batchNumber = `BATCH-${Date.now()}`;
      
      await database.run(`
        INSERT INTO bottling_batches (
          id, batch_number, recipe_id, quantity_planned, 
          status, operator_id, created_by, created_at
        ) VALUES (?, ?, ?, ?, 'in_progress', ?, ?, CURRENT_TIMESTAMP)
      `, [batchId, batchNumber, recipe_id, quantity_planned, operator_id, operator_id]);
      
      // 2. Get recipe materials and consume raw materials
      const recipeMaterials = await database.all(`
        SELECT rm.id, rm.current_stock, rm.name, rm.unit,
               rm.cost_per_unit, rm.min_stock_level,
               rm.reorder_point, rm.safety_stock,
               rm.quantity_per_unit
        FROM recipe_materials rcm
        JOIN raw_materials rm ON rcm.material_id = rm.id
        WHERE rcm.recipe_id = ?
      `, [recipe_id]);
      
      // 3. Check if we have enough materials
      for (const material of recipeMaterials) {
        const requiredQuantity = material.quantity_per_unit * quantity_planned;
        if (material.current_stock < requiredQuantity) {
          throw new Error(`Insufficient stock for ${material.name}. Required: ${requiredQuantity} ${material.unit}, Available: ${material.current_stock} ${material.unit}`);
        }
      }
      
      // 4. Consume raw materials and create inventory transactions
      for (const material of recipeMaterials) {
        const consumedQuantity = material.quantity_per_unit * quantity_planned;
        const newStock = material.current_stock - consumedQuantity;
        
        // Update raw material stock
        await database.run(`
          UPDATE raw_materials 
          SET current_stock = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [newStock, material.id]);
        
        // Create inventory transaction for consumption
        await database.run(`
          INSERT INTO inventory_transactions (
            id, product_id, transaction_type, quantity, 
            previous_stock, new_stock, unit_cost, total_value,
            reference_id, reference_type, notes, created_by
          ) VALUES (?, ?, 'consumption', ?, ?, ?, ?, ?, ?, 'bottling_batch', ?, ?)
        `, [
          uuidv4(), material.id, consumedQuantity, 
          material.current_stock, newStock, material.cost_per_unit,
          consumedQuantity * material.cost_per_unit, batchId, 
          `Raw material consumed for batch ${batchNumber}`, operator_id
        ]);
        
        // Check if stock is below reorder point
        if (newStock <= material.reorder_point) {
          await this.createLowStockAlert(material, newStock, material.reorder_point);
        }
      }
      
      // 5. Create cost components for the batch
      const totalMaterialCost = recipeMaterials.reduce((total, material) => {
        return total + (material.quantity_per_unit * quantity_planned * material.cost_per_unit);
      }, 0);
      
      await database.run(`
        INSERT INTO cost_components (
          id, batch_id, component_type, component_name, 
          quantity, unit_cost, total_cost, created_at
        ) VALUES (?, ?, 'raw_materials', 'Total Materials', ?, ?, ?, CURRENT_TIMESTAMP)
      `, [uuidv4(), batchId, quantity_planned, totalMaterialCost / quantity_planned, totalMaterialCost]);
      
      // Commit transaction
      await database.run('COMMIT');
      
      return {
        success: true,
        batch_id: batchId,
        batch_number: batchNumber,
        consumed_materials: recipeMaterials.map(m => ({
          name: m.name,
          consumed: m.quantity_per_unit * quantity_planned,
          unit: m.unit,
          cost: m.quantity_per_unit * quantity_planned * m.cost_per_unit
        })),
        total_material_cost: totalMaterialCost
      };
      
    } catch (error) {
      // Rollback transaction on error
      await database.run('ROLLBACK');
      throw error;
    }
  }
}

module.exports = new BottlingInventoryService();
