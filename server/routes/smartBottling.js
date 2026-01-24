const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { auth, adminAuth, managerAuth } = require('../middleware/auth');
const bottlingService = require('../services/bottlingService');
const currencyService = require('../services/currencyService');

const router = express.Router();

/**
 * @swagger
 * /smart-bottling/raw-materials:
 *   get:
 *     summary: Get all raw materials
 *     description: Retrieve a list of all raw materials for bottling
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Raw materials retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 materials:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RawMaterial'
 */
router.get('/raw-materials', auth, async (req, res) => {
  try {
    // First get all materials
    const materials = await database.all(`
      SELECT * FROM raw_materials 
      WHERE is_active = true 
      ORDER BY name
    `);

    // Then calculate used units for each material
    const materialsWithUsage = await Promise.all(materials.map(async (material) => {
      try {
        const usageResult = await database.get(`
          SELECT COALESCE(SUM(rm.quantity_per_unit * bb.quantity_produced), 0) as total_used
          FROM recipe_materials rm
          JOIN bottling_batches bb ON rm.recipe_id = bb.recipe_id
          WHERE rm.material_id = $1 
          AND bb.status IN ('planned', 'in_progress', 'completed')
        `, [material.id]);

        const usedInBatches = usageResult?.total_used || 0;
        const remainingStock = Math.max(0, material.current_stock - usedInBatches);

        return {
          ...material,
          used_in_batches: usedInBatches,
          remaining_stock: remainingStock
        };
      } catch (error) {
        console.error(`Error calculating usage for material ${material.id}:`, error);
        return {
          ...material,
          used_in_batches: 0,
          remaining_stock: material.current_stock
        };
      }
    }));

    res.json({ materials: materialsWithUsage });
  } catch (error) {
    console.error('Get raw materials error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/raw-materials:
 *   post:
 *     summary: Add raw material
 *     description: Add a new raw material to inventory
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - unit
 *               - current_stock
 *               - cost_per_unit
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [perfume, bottle, cap, label, packaging]
 *               unit:
 *                 type: string
 *               current_stock:
 *                 type: number
 *               cost_per_unit:
 *                 type: number
 *               min_stock_level:
 *                 type: number
 */
router.post('/raw-materials', adminAuth, [
  body('name').trim().notEmpty().withMessage('Material name is required'),
  body('type').isIn(['perfume', 'bottle', 'cap', 'label', 'packaging']).withMessage('Valid type is required'),
  body('unit').trim().notEmpty().withMessage('Unit is required'),
  body('current_stock').isFloat({ min: 0 }).withMessage('Valid stock quantity is required'),
  body('cost_per_unit').isFloat({ min: 0 }).withMessage('Valid cost is required'),
  body('min_stock_level').optional().isFloat({ min: 0 }).withMessage('Valid minimum stock level is required')
], async (req, res) => {
  try {
    console.log('Raw material creation request body:', req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        errors: errors.array(),
        message: 'Please check the form data and try again'
      });
    }

    const {
      name, type, description, unit, current_stock, cost_per_unit,
      supplier, supplier_id, supplier_contact, supplier_material_code, batch_number, expiry_date,
      min_stock_level = 0, quality_grade, currency = 'RWF', location, bin_number,
      lot_number, manufacturing_date, received_date, usage_rate, lead_time_days,
      minimum_order_quantity, technical_specs, material_composition,
      compliance_standards, test_certificate_url, regulatory_approval,
      economic_order_quantity, physical_properties, safety_data,
      // Add missing fields
      reorder_point, max_stock_level, safety_stock, shelf_life_days,
      storage_requirements, quality_standards, storage_conditions, hazard_classification, msds_required, msds_url,
      certification_required, certification_type, certification_expiry,
      last_purchase_cost, average_cost, last_audit_date
    } = req.body;

    // Validate and convert numeric fields
    const validatedCurrentStock = parseFloat(current_stock);
    const validatedCostPerUnit = parseFloat(cost_per_unit);
    const validatedMinStockLevel = min_stock_level ? parseFloat(min_stock_level) : 0;

    if (isNaN(validatedCurrentStock) || validatedCurrentStock < 0) {
      return res.status(400).json({ error: 'Invalid current stock value' });
    }

    if (isNaN(validatedCostPerUnit) || validatedCostPerUnit < 0) {
      return res.status(400).json({ error: 'Invalid cost per unit value' });
    }

    if (isNaN(validatedMinStockLevel) || validatedMinStockLevel < 0) {
      return res.status(400).json({ error: 'Invalid minimum stock level value' });
    }

    // Validate and convert other numeric fields
    const validatedUsageRate = usage_rate ? parseFloat(usage_rate) : null;
    const validatedLeadTimeDays = lead_time_days ? parseInt(lead_time_days) : null;
    const validatedMinimumOrderQuantity = minimum_order_quantity ? parseFloat(minimum_order_quantity) : null;
    const validatedEconomicOrderQuantity = economic_order_quantity ? parseFloat(economic_order_quantity) : null;
    const validatedReorderPoint = reorder_point ? parseFloat(reorder_point) : null;
    const validatedMaxStockLevel = max_stock_level ? parseFloat(max_stock_level) : null;
    const validatedSafetyStock = safety_stock ? parseFloat(safety_stock) : null;
    const validatedShelfLifeDays = shelf_life_days ? parseInt(shelf_life_days) : null;
    const validatedLastPurchaseCost = last_purchase_cost ? parseFloat(last_purchase_cost) : null;
    const validatedAverageCost = average_cost ? parseFloat(average_cost) : null;

    // Validate numeric fields that might be null
    if (usage_rate && (isNaN(validatedUsageRate) || validatedUsageRate < 0)) {
      return res.status(400).json({ error: 'Invalid usage rate value' });
    }

    if (lead_time_days && (isNaN(validatedLeadTimeDays) || validatedLeadTimeDays < 0)) {
      return res.status(400).json({ error: 'Invalid lead time days value' });
    }

    if (minimum_order_quantity && (isNaN(validatedMinimumOrderQuantity) || validatedMinimumOrderQuantity < 0)) {
      return res.status(400).json({ error: 'Invalid minimum order quantity value' });
    }

    if (economic_order_quantity && (isNaN(validatedEconomicOrderQuantity) || validatedEconomicOrderQuantity < 0)) {
      return res.status(400).json({ error: 'Invalid economic order quantity value' });
    }

    // Validate additional numeric fields
    if (reorder_point && (isNaN(validatedReorderPoint) || validatedReorderPoint < 0)) {
      return res.status(400).json({ error: 'Invalid reorder point value' });
    }

    if (max_stock_level && (isNaN(validatedMaxStockLevel) || validatedMaxStockLevel < 0)) {
      return res.status(400).json({ error: 'Invalid max stock level value' });
    }

    if (safety_stock && (isNaN(validatedSafetyStock) || validatedSafetyStock < 0)) {
      return res.status(400).json({ error: 'Invalid safety stock value' });
    }

    if (shelf_life_days && (isNaN(validatedShelfLifeDays) || validatedShelfLifeDays < 0)) {
      return res.status(400).json({ error: 'Invalid shelf life days value' });
    }

    if (last_purchase_cost && (isNaN(validatedLastPurchaseCost) || validatedLastPurchaseCost < 0)) {
      return res.status(400).json({ error: 'Invalid last purchase cost value' });
    }

    if (average_cost && (isNaN(validatedAverageCost) || validatedAverageCost < 0)) {
      return res.status(400).json({ error: 'Invalid average cost value' });
    }

    // Clean and validate text fields
    const cleanedName = (name || '').trim();
    const cleanedUnit = (unit || '').trim();
    const cleanedDescription = description ? description.trim() : null;

    if (!cleanedName || cleanedName.length === 0) {
      return res.status(400).json({ error: 'Material name is required' });
    }

    if (!cleanedUnit || cleanedUnit.length === 0) {
      return res.status(400).json({ error: 'Unit is required' });
    }

    // Validate URL fields if provided
    if (test_certificate_url && test_certificate_url.trim() !== '') {
      try {
        new URL(test_certificate_url);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid test certificate URL format' });
      }
    }

    const materialId = uuidv4();

    try {
      // Only insert fields that exist in the database table
      await database.run(`
        INSERT INTO raw_materials (
          id, name, type, unit, current_stock, cost_per_unit,
          min_stock_level, max_stock_level, reorder_point, safety_stock,
          supplier_id, supplier_name, supplier_contact, lead_time_days,
          shelf_life_days, storage_requirements, quality_standards, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `, [
        materialId, cleanedName, type, cleanedUnit, validatedCurrentStock, validatedCostPerUnit,
        validatedMinStockLevel, validatedMaxStockLevel, validatedReorderPoint, validatedSafetyStock,
        supplier_id, supplier, supplier_contact, validatedLeadTimeDays,
        validatedShelfLifeDays, storage_requirements, quality_standards, true
      ]);
    } catch (dbError) {
      console.error('Database insertion error:', dbError);
      console.error('SQL parameters:', {
        materialId, cleanedName, type, cleanedDescription, cleanedUnit,
        validatedCurrentStock, validatedCostPerUnit, supplier, supplier_id,
        supplier_material_code, batch_number, expiry_date, validatedMinStockLevel,
        quality_grade, currency, location, bin_number, lot_number,
        manufacturing_date, received_date, validatedUsageRate, validatedLeadTimeDays,
        validatedMinimumOrderQuantity, technical_specs, material_composition,
        compliance_standards, test_certificate_url, regulatory_approval,
        validatedEconomicOrderQuantity, physical_properties, safety_data,
        validatedReorderPoint, validatedMaxStockLevel, validatedSafetyStock, validatedShelfLifeDays,
        storage_conditions, hazard_classification, msds_required, msds_url,
        certification_required, certification_type, certification_expiry,
        validatedLastPurchaseCost, validatedAverageCost, last_audit_date
      });
      return res.status(500).json({ error: 'Database insertion failed', details: dbError.message });
    }

    // Record initial stock in ledger
    try {
      await database.run(`
        INSERT INTO stock_ledger (
          id, material_id, transaction_type, quantity, unit_cost, total_value,
          reference_type, reference_id, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        uuidv4(), materialId, 'initial', validatedCurrentStock, validatedCostPerUnit,
        validatedCurrentStock * validatedCostPerUnit, 'raw_material', materialId,
        'Initial stock entry', req.user.id
      ]);
    } catch (ledgerError) {
      console.error('Stock ledger insertion error:', ledgerError);
      // Don't fail the entire operation if ledger insertion fails
      // The material was already created successfully
    }

    res.status(201).json({
      message: 'Raw material added successfully',
      material: { id: materialId, name, type, current_stock }
    });
  } catch (error) {
    console.error('Add raw material error:', error);
    console.error('Request body:', req.body);
    console.error('Validation errors:', validationResult(req).array());
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

/**
 * @swagger
 * /smart-bottling/raw-materials/{id}:
 *   put:
 *     summary: Update raw material
 *     description: Update an existing raw material
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Raw material ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RawMaterial'
 *     responses:
 *       200:
 *         description: Raw material updated successfully
 *       404:
 *         description: Raw material not found
 *       500:
 *         description: Server error
 */
router.put('/raw-materials/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if raw material exists
    const existingMaterial = await database.get('SELECT * FROM raw_materials WHERE id = $1', [id]);
    if (!existingMaterial) {
      return res.status(404).json({ error: 'Raw material not found' });
    }

    // Update the raw material
    const updatedMaterial = await database.run(`
      UPDATE raw_materials SET
        name = $2,
        type = $3,
        unit = $4,
        current_stock = $5,
        cost_per_unit = $6,
        min_stock_level = $7,
        max_stock_level = $8,
        reorder_point = $9,
        safety_stock = $10,
        supplier_id = $11,
        supplier_name = $12,
        supplier_contact = $13,
        lead_time_days = $14,
        shelf_life_days = $15,
        storage_requirements = $16,
        quality_standards = $17,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [
      id,
      updateData.name,
      updateData.type,
      updateData.unit,
      updateData.current_stock,
      updateData.cost_per_unit,
      updateData.min_stock_level,
      updateData.max_stock_level,
      updateData.reorder_point,
      updateData.safety_stock,
      updateData.supplier_id,
      updateData.supplier_name,
      updateData.supplier_contact,
      updateData.lead_time_days,
      updateData.shelf_life_days,
      updateData.storage_requirements,
      updateData.quality_standards
    ]);

    // Get the updated material
    const updatedMaterialData = await database.get('SELECT * FROM raw_materials WHERE id = $1', [id]);

    res.json({
      message: 'Raw material updated successfully',
      material: updatedMaterialData
    });
  } catch (error) {
    console.error('Update raw material error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/raw-materials/{id}:
 *   delete:
 *     summary: Delete raw material
 *     description: Delete a raw material from inventory
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Raw material ID
 *     responses:
 *       200:
 *         description: Raw material deleted successfully
 *       404:
 *         description: Raw material not found
 *       500:
 *         description: Server error
 */
router.delete('/raw-materials/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if raw material exists
    const material = await database.get('SELECT * FROM raw_materials WHERE id = $1', [id]);
    if (!material) {
      return res.status(404).json({ error: 'Raw material not found' });
    }

    // Check if material is used in any recipes
    const recipeUsage = await database.get(`
      SELECT COUNT(*) as count 
      FROM recipe_materials 
      WHERE material_id = $1
    `, [id]);

    if (recipeUsage.count > 0) {
      return res.status(400).json({
        error: 'Cannot delete raw material',
        message: 'This material is being used in one or more recipes. Please remove it from all recipes first.'
      });
    }

    // Check if material has any stock movements
    const stockMovements = await database.get(`
      SELECT COUNT(*) as count 
      FROM stock_ledger 
      WHERE material_id = $1
    `, [id]);

    if (stockMovements.count > 0) {
      // Soft delete - set is_active to false instead of hard delete
      await database.run(`
        UPDATE raw_materials 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [id]);

      res.json({
        message: 'Raw material deactivated successfully',
        note: 'Material was deactivated instead of deleted due to existing stock movements'
      });
    } else {
      // Hard delete if no stock movements
      await database.run('DELETE FROM raw_materials WHERE id = $1', [id]);
      res.json({ message: 'Raw material deleted successfully' });
    }
  } catch (error) {
    console.error('Delete raw material error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/recipes:
 *   get:
 *     summary: Get bottling recipes
 *     description: Retrieve all bottling recipes (BOM)
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 */
router.get('/recipes', auth, async (req, res) => {
  try {
    const recipes = await database.all(`
      SELECT br.*, bs.size_ml, bs.bottle_cost
      FROM bottling_recipes br
      LEFT JOIN bottle_sizes bs ON br.bottle_size_id = bs.id
      WHERE br.status = 'active'
      ORDER BY br.name
    `);

    // Get materials for each recipe
    for (const recipe of recipes) {
      const materials = await database.all(`
        SELECT rm.*, rm2.name as material_name, rm2.cost_per_unit, rm2.unit
        FROM recipe_materials rm
        JOIN raw_materials rm2 ON rm.material_id = rm2.id
        WHERE rm.recipe_id = $1
      `, [recipe.id]);
      recipe.materials = materials;
    }

    res.json({ recipes });
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/recipes:
 *   post:
 *     summary: Create bottling recipe
 *     description: Create a new bottling recipe with materials
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 */
router.post('/recipes', adminAuth, [
  body('name').trim().notEmpty().withMessage('Recipe name is required'),
  body('bottle_size_id').notEmpty().withMessage('Bottle size is required'),
  body('materials').isArray({ min: 1 }).withMessage('At least one material is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, description, bottle_size_id, materials, version = '1.0', status = 'active',
      category, difficulty_level, estimated_production_time, target_cost, markup_percentage,
      selling_price, currency = 'RWF', quality_standards, shelf_life_days, batch_size_min,
      batch_size_max, production_notes, yield_percentage, waste_percentage, recipe_image_url,
      instruction_manual_url, safety_instructions, testing_requirements, storage_requirements,
      quality_checkpoints, efficiency_rating
    } = req.body;

    // Start transaction
    await database.run('BEGIN');

    const recipeId = uuidv4();
    await database.run(`
      INSERT INTO bottling_recipes (
        id, name, description, bottle_size_id, version, status, category, difficulty_level,
        estimated_production_time, target_cost, markup_percentage, selling_price, currency,
        quality_standards, shelf_life_days, batch_size_min, batch_size_max, production_notes,
        yield_percentage, waste_percentage, recipe_image_url, instruction_manual_url,
        safety_instructions, testing_requirements, storage_requirements, quality_checkpoints,
        efficiency_rating
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
    `, [recipeId, name, description, bottle_size_id, version, status, category, difficulty_level,
      estimated_production_time, target_cost, markup_percentage, selling_price, currency,
      quality_standards, shelf_life_days, batch_size_min, batch_size_max, production_notes,
      yield_percentage, waste_percentage, recipe_image_url, instruction_manual_url,
      safety_instructions, testing_requirements, storage_requirements, quality_checkpoints,
      efficiency_rating]);

    // Add materials to recipe
    for (const material of materials) {
      await database.run(`
        INSERT INTO recipe_materials (id, recipe_id, material_id, quantity_per_unit)
        VALUES ($1, $2, $3, $4)
      `, [uuidv4(), recipeId, material.material_id, material.quantity_per_unit]);
    }

    await database.run('COMMIT');

    res.status(201).json({
      message: 'Recipe created successfully',
      recipe: { id: recipeId, name, bottle_size_id }
    });
  } catch (error) {
    await database.run('ROLLBACK');
    console.error('Create recipe error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/recipes/{id}:
 *   put:
 *     summary: Update bottling recipe
 *     description: Update an existing bottling recipe
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Recipe ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BottlingRecipe'
 *     responses:
 *       200:
 *         description: Recipe updated successfully
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Server error
 */
router.put('/recipes/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if recipe exists
    const existingRecipe = await database.get('SELECT * FROM bottling_recipes WHERE id = $1', [id]);
    if (!existingRecipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Start transaction
    await database.run('BEGIN');

    try {
      // Update the recipe
      await database.run(`
        UPDATE bottling_recipes SET
          name = $2,
          description = $3,
          bottle_size_id = $4,
          version = $5,
          status = $6,
          category = $7,
          difficulty_level = $8,
          estimated_production_time = $9,
          target_cost = $10,
          markup_percentage = $11,
          selling_price = $12,
          currency = $13,
          quality_standards = $14,
          shelf_life_days = $15,
          batch_size_min = $16,
          batch_size_max = $17,
          production_notes = $18,
          recipe_image_url = $19,
          instruction_manual_url = $20,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [
        id,
        updateData.name,
        updateData.description,
        updateData.bottle_size_id,
        updateData.version,
        updateData.status,
        updateData.category,
        updateData.difficulty_level,
        updateData.estimated_production_time,
        updateData.target_cost,
        updateData.markup_percentage,
        updateData.selling_price,
        updateData.currency,
        updateData.quality_standards,
        updateData.shelf_life_days,
        updateData.batch_size_min,
        updateData.batch_size_max,
        updateData.production_notes,
        updateData.recipe_image_url,
        updateData.instruction_manual_url
      ]);

      // Update recipe materials if provided
      if (updateData.materials && Array.isArray(updateData.materials)) {
        // Delete existing materials
        await database.run('DELETE FROM recipe_materials WHERE recipe_id = $1', [id]);

        // Insert new materials
        for (const material of updateData.materials) {
          await database.run(`
            INSERT INTO recipe_materials (id, recipe_id, material_id, quantity_per_unit, unit, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            uuidv4(),
            id,
            material.material_id,
            material.quantity_per_unit,
            material.unit,
            material.notes || ''
          ]);
        }
      }

      // Commit transaction
      await database.run('COMMIT');

      // Get the updated recipe with materials
      const updatedRecipe = await database.get(`
        SELECT br.*, bs.size_ml 
        FROM bottling_recipes br
        LEFT JOIN bottle_sizes bs ON br.bottle_size_id = bs.id
        WHERE br.id = $1
      `, [id]);

      const recipeMaterials = await database.all(`
        SELECT rm.*, rm.name as material_name, rm.type as material_type, rm.unit as material_unit
        FROM recipe_materials rm
        LEFT JOIN raw_materials rm2 ON rm.material_id = rm2.id
        WHERE rm.recipe_id = $1
      `, [id]);

      res.json({
        message: 'Recipe updated successfully',
        recipe: {
          ...updatedRecipe,
          materials: recipeMaterials
        }
      });
    } catch (error) {
      // Rollback transaction
      await database.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Update recipe error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/recipes/{id}:
 *   delete:
 *     summary: Delete bottling recipe
 *     description: Delete a bottling recipe and its materials
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Recipe ID
 *     responses:
 *       200:
 *         description: Recipe deleted successfully
 *       404:
 *         description: Recipe not found
 *       400:
 *         description: Cannot delete recipe (used in batches)
 *       500:
 *         description: Server error
 */
router.delete('/recipes/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if recipe exists
    const recipe = await database.get('SELECT * FROM bottling_recipes WHERE id = $1', [id]);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Check if recipe is used in any batches
    const batchUsage = await database.get(`
      SELECT COUNT(*) as count 
      FROM bottling_batches 
      WHERE recipe_id = $1
    `, [id]);

    if (batchUsage.count > 0) {
      return res.status(400).json({
        error: 'Cannot delete recipe',
        message: 'This recipe is being used in one or more batches. Please delete all batches using this recipe first.'
      });
    }

    // Start transaction
    await database.run('BEGIN');

    // Delete recipe materials first
    await database.run('DELETE FROM recipe_materials WHERE recipe_id = $1', [id]);

    // Delete the recipe
    await database.run('DELETE FROM bottling_recipes WHERE id = $1', [id]);

    await database.run('COMMIT');

    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    await database.run('ROLLBACK');
    console.error('Delete recipe error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/batch:
 *   post:
 *     summary: Create bottling batch
 *     description: Create a new bottling batch with comprehensive cost tracking
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 */
router.post('/batch', auth, [
  body('recipe_id').notEmpty().withMessage('Recipe ID is required'),
  body('bulk_perfume_id').notEmpty().withMessage('Bulk perfume ID is required'),
  body('quantity_planned').isInt({ min: 1 }).withMessage('Valid planned quantity is required'),
  body('quantity_produced').optional().isInt({ min: 0 }).withMessage('Valid produced quantity is required'),
  body('quantity_defective').optional().isInt({ min: 0 }).withMessage('Valid defective quantity is required'),
  body('production_date').optional().isISO8601().withMessage('Valid production date is required'),
  body('operator_id').optional().isUUID().withMessage('Valid operator ID is required'),
  body('supervisor_id').optional().isUUID().withMessage('Valid supervisor ID is required'),
  body('profit_margin').optional().isFloat({ min: 0, max: 1000 }).withMessage('Valid profit margin (0-1000%) is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      recipe_id,
      bulk_perfume_id,
      quantity_planned,
      quantity_produced,
      quantity_defective = 0,
      production_date,
      operator_id,
      supervisor_id,
      profit_margin = 50.00,
      notes
    } = req.body;

    console.log('🔧 Starting batch creation with data:', {
      recipe_id, bulk_perfume_id, quantity_planned, createdBy: req.user.id
    });

    // Create batch and product with guaranteed success
    const batchId = uuidv4();
    const batchNumber = `BATCH${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-3)}`;

    await database.run('BEGIN');

    try {
      // 1. Calculate costs first (in USD)
      let costBreakdown;
      try {
        costBreakdown = await bottlingService.calculateBottlingCost(recipe_id, quantity_planned, bulk_perfume_id);
      } catch (costError) {
        console.warn('Cost calculation failed, using simplified pricing:', costError.message);
        costBreakdown = {
          unit_cost: 50.00,
          total_cost: 50.00 * quantity_planned,
          materials_used: [],
          labor_cost: 30.00,
          overhead_cost: 5.00,
          perfume_cost: 40.00,
          bottle_cost: 5.00,
          cap_cost: 2.00,
          label_cost: 1.00
        };
      }

      // 2. Convert USD costs to RWF using real-time exchange rate
      let rwfCostBreakdown;
      try {
        rwfCostBreakdown = await currencyService.convertBottlingCostsToRWF(costBreakdown);
        console.log('✅ Costs converted to RWF:', {
          usd_unit_cost: costBreakdown.unit_cost,
          rwf_unit_cost: rwfCostBreakdown.unit_cost,
          exchange_rate: rwfCostBreakdown.exchange_rate
        });
      } catch (currencyError) {
        console.warn('Currency conversion failed, using fallback rate:', currencyError.message);
        rwfCostBreakdown = currencyService.convertWithFixedRate(costBreakdown, 1450);
      }

      // Calculate selling price using profit margin
      const markupMultiplier = (profit_margin / 100) + 1;
      const sellingPrice = rwfCostBreakdown.unit_cost * markupMultiplier;

      // 3. Create the bottling batch with RWF costs
      await database.run(`
        INSERT INTO bottling_batches (
          id, batch_number, recipe_id, bulk_perfume_id, quantity_planned, 
          quantity_produced, quantity_defective, total_cost, unit_cost, 
          profit_margin, selling_price, status, production_date, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        batchId, batchNumber, recipe_id, bulk_perfume_id, quantity_planned,
        quantity_produced || quantity_planned, quantity_defective,
        rwfCostBreakdown.total_cost, rwfCostBreakdown.unit_cost,
        profit_margin, sellingPrice, 'planned', production_date, req.user.id
      ]);

      // 2. Get recipe and bulk perfume details for product creation
      const recipe = await database.get(`
        SELECT br.*, bs.size_ml 
        FROM bottling_recipes br
        LEFT JOIN bottle_sizes bs ON br.bottle_size_id = bs.id
        WHERE br.id = ?
      `, [recipe_id]);

      const bulkPerfume = await database.get(`
        SELECT * FROM perfume_bulk WHERE id = ?
      `, [bulk_perfume_id]);

      let productId = null;
      let sku = null;
      let productName = null;
      let finishedQuantity = 0;
      let costPrice = 0;
      let requiredLiters = 0;

      if (recipe && bulkPerfume) {
        // Calculate required bulk perfume quantity in ml
        const bottlesProduced = quantity_produced || quantity_planned;
        const bottleSizeMl = recipe.size_ml || 30;
        requiredLiters = bottlesProduced * bottleSizeMl;

        // Check if sufficient bulk perfume is available
        if (requiredLiters > bulkPerfume.bulk_quantity_ml) {
          return res.status(400).json({
            error: `Insufficient bulk perfume. Available: ${bulkPerfume.bulk_quantity_ml}ML, Required: ${requiredLiters}ML`
          });
        }

        // Update bulk perfume quantity
        await database.run(`
          UPDATE perfume_bulk 
          SET bulk_quantity_ml = bulk_quantity_ml - ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [requiredLiters, bulk_perfume_id]);

        // 3. Create or update finished product using calculated costs
        sku = `PERF-${bulkPerfume.name.substring(0, 3).toUpperCase()}-${bottleSizeMl}ML`;
        productName = `${bulkPerfume.name} ${bottleSizeMl}ml`;
        const shortBarcode = `${bulkPerfume.name.substring(0, 2).toUpperCase()}${bottleSizeMl.toString().padStart(2, '0')}${Date.now().toString().slice(-4)}`;
        finishedQuantity = bottlesProduced - quantity_defective;

        // Use the RWF converted costs
        costPrice = rwfCostBreakdown.unit_cost;
        const markupMultiplier = (profit_margin / 100) + 1;
        const sellingPrice = rwfCostBreakdown.unit_cost * markupMultiplier;

        // Check if product already exists
        const existingProduct = await database.get(`
          SELECT id, stock_quantity FROM products WHERE sku = ?
        `, [sku]);

        if (existingProduct) {
          // Update existing product
          productId = existingProduct.id;
          await database.run(`
            UPDATE products
            SET name = ?, description = ?, price = ?, cost_price = ?,
                stock_quantity = stock_quantity + ?, product_type = ?, size = ?,
                barcode = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [
            productName, bulkPerfume.scent_description || '', sellingPrice, costPrice,
            finishedQuantity, 'perfume', `${recipe.size_ml || 30}ml`, shortBarcode, productId
          ]);
        } else {
          // Create new product
          productId = uuidv4();
          await database.run(`
            INSERT INTO products (
              id, name, description, sku, barcode, price, cost_price, 
              stock_quantity, product_type, size, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            productId, productName, bulkPerfume.scent_description || '', sku,
            shortBarcode, sellingPrice, costPrice, finishedQuantity, 'perfume',
            `${recipe.size_ml || 30}ml`, 1, new Date().toISOString(), new Date().toISOString()
          ]);
        }

        console.log('✅ Product created/updated successfully:', { productId, sku, productName, quantity: finishedQuantity });
      }

      await database.run('COMMIT');

      res.status(201).json({
        message: 'Bottling batch created successfully',
        batch_id: batchId,
        batch_number: batchNumber,
        quantity_planned: quantity_planned,
        quantity_produced: quantity_produced || quantity_planned,
        quantity_defective: quantity_defective,
        total_cost: rwfCostBreakdown.total_cost,
        unit_cost: rwfCostBreakdown.unit_cost,
        selling_price: sellingPrice,
        status: 'planned',
        currency: 'RWF (thousands)',
        exchange_rate: rwfCostBreakdown.exchange_rate,
        unit_multiplier: rwfCostBreakdown.unit_multiplier,
        cost_breakdown: {
          // RWF costs (displayed)
          rwf: {
            materials: rwfCostBreakdown.materials_used || [],
            labor_cost: rwfCostBreakdown.labor_cost || 0,
            overhead_cost: rwfCostBreakdown.overhead_cost || 0,
            perfume_cost: rwfCostBreakdown.perfume_cost || 0,
            bottle_cost: rwfCostBreakdown.bottle_cost || 0,
            cap_cost: rwfCostBreakdown.cap_cost || 0,
            label_cost: rwfCostBreakdown.label_cost || 0,
            total_cost: rwfCostBreakdown.total_cost,
            unit_cost: rwfCostBreakdown.unit_cost
          },
          // USD costs (for reference)
          usd: {
            materials: costBreakdown.materials_used || [],
            labor_cost: costBreakdown.labor_cost || 0,
            overhead_cost: costBreakdown.overhead_cost || 0,
            perfume_cost: costBreakdown.perfume_cost || 0,
            bottle_cost: costBreakdown.bottle_cost || 0,
            cap_cost: costBreakdown.cap_cost || 0,
            label_cost: costBreakdown.label_cost || 0,
            total_cost: costBreakdown.total_cost,
            unit_cost: costBreakdown.unit_cost
          }
        },
        product_created: {
          id: productId || 'unknown',
          sku: sku || 'unknown',
          name: productName || 'unknown',
          quantity: finishedQuantity || 0,
          cost_price: costPrice || 0,
          selling_price: sellingPrice || 0,
          currency: 'RWF'
        },
        bulk_perfume_usage: {
          required_ml: requiredLiters || 0,
          remaining_ml: bulkPerfume ? bulkPerfume.bulk_quantity_ml - (requiredLiters || 0) : 0
        }
      });
    } catch (error) {
      await database.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ Create bottling batch error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/batches/{batchId}:
 *   get:
 *     summary: Get bottling batch by ID
 *     description: Get detailed information about a specific bottling batch
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Batch details retrieved successfully
 *       404:
 *         description: Batch not found
 *       500:
 *         description: Server error
 */
router.get('/batches/:batchId', auth, async (req, res) => {
  try {
    const result = await bottlingService.getBottlingBatch(req.params.batchId);
    res.json(result);
  } catch (error) {
    console.error('Get bottling batch error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/batches/{batchId}:
 *   put:
 *     summary: Update bottling batch basic fields
 *     description: Update editable fields on a bottling batch (notes, production_date)
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               production_date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Batch updated successfully
 */
router.put('/batches/:batchId', auth, [
  body('production_date').optional().isISO8601().withMessage('Valid production date is required'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { batchId } = req.params;
    const { production_date, notes } = req.body;
    const result = await bottlingService.updateBottlingBatch(batchId, { production_date, notes });
    res.json(result);
  } catch (error) {
    console.error('Update bottling batch error:', error);
    res.status(500).json({ error: 'Failed to update batch' });
  }
});

/**
 * @swagger
 * /smart-bottling/batches/{batchId}:
 *   delete:
 *     summary: Delete (cancel) a bottling batch and reverse stock
 *     description: Cancels the batch and reverses material consumption and finished goods stock created by this batch
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Batch deleted and stock reversed successfully
 */
router.delete('/batches/:batchId', auth, async (req, res) => {
  try {
    const { batchId } = req.params;
    const userId = req.user.id;
    const result = await bottlingService.deleteBottlingBatch(batchId, userId);
    res.json(result);
  } catch (error) {
    console.error('Delete bottling batch error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete batch' });
  }
});

/**
 * @swagger
 * /smart-bottling/batch/{id}:
 *   get:
 *     summary: Get bottling batch details
 *     description: Get detailed information about a bottling batch with cost breakdown
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 */
router.get('/batch/:id', auth, async (req, res) => {
  try {
    const result = await bottlingService.getBottlingBatch(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Get bottling batch error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/batches:
 *   get:
 *     summary: Get bottling batches
 *     description: Retrieve recent bottling batches
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 */
router.get('/batches', auth, async (req, res) => {
  try {
    const batches = await database.all(`
      SELECT bb.*, br.name as recipe_name, pbp.name as perfume_name, 
             bs.size_ml, u.first_name, u.last_name
      FROM bottling_batches bb
      LEFT JOIN bottling_recipes br ON bb.recipe_id = br.id
      LEFT JOIN perfume_bulk pbp ON bb.bulk_perfume_id = pbp.id
      LEFT JOIN bottle_sizes bs ON br.bottle_size_id = bs.id
      LEFT JOIN users u ON bb.created_by = u.id
      WHERE bb.status != 'cancelled'
      ORDER BY bb.created_at DESC
      LIMIT 50
    `);

    res.json({ batches });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


/**
 * @swagger
 * /smart-bottling/stats:
 *   get:
 *     summary: Get bottling statistics
 *     description: Get comprehensive bottling statistics and analytics
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await bottlingService.getBottlingStats();
    res.json(stats);
  } catch (error) {
    console.error('Get bottling stats error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/forecast:
 *   get:
 *     summary: Get material forecast
 *     description: Forecast material requirements based on sales trends
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 */
router.get('/forecast', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const forecast = await bottlingService.forecastMaterialRequirements(days);
    res.json({ forecast });
  } catch (error) {
    console.error('Get forecast error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/popular-sizes:
 *   get:
 *     summary: Get popular sizes
 *     description: Get auto-suggested popular sizes based on sales trends
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 */
router.get('/popular-sizes', auth, async (req, res) => {
  try {
    const popularSizes = await bottlingService.getPopularSizes();
    res.json({ popular_sizes: popularSizes });
  } catch (error) {
    console.error('Get popular sizes error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/stock-ledger:
 *   get:
 *     summary: Get stock ledger
 *     description: Get inventory transaction history
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stock-ledger', auth, async (req, res) => {
  try {
    const ledger = await database.all(`
      SELECT sl.*, rm.name as material_name, rm.unit, u.first_name, u.last_name
      FROM stock_ledger sl
      JOIN raw_materials rm ON sl.material_id = rm.id
      JOIN users u ON sl.created_by = u.id
      ORDER BY sl.created_at DESC
      LIMIT 100
    `);

    res.json({ ledger });
  } catch (error) {
    console.error('Get stock ledger error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/low-stock-alerts:
 *   get:
 *     summary: Get low stock alerts
 *     description: Get materials that are running low on stock
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 */
router.get('/low-stock-alerts', auth, async (req, res) => {
  try {
    const alerts = await database.all(`
      SELECT 
        id, name, type, current_stock, min_stock_level, unit,
        (current_stock / min_stock_level) as stock_ratio
      FROM raw_materials
      WHERE current_stock <= min_stock_level AND is_active = true
      ORDER BY stock_ratio ASC
    `);

    res.json({ alerts });
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/cost-breakdown/{batch_id}:
 *   get:
 *     summary: Get cost breakdown
 *     description: Get detailed cost breakdown for a specific batch
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 */
router.get('/cost-breakdown/:batch_id', auth, async (req, res) => {
  try {
    const costComponents = await database.all(`
      SELECT * FROM cost_components 
      WHERE batch_id = $1 
      ORDER BY component_type, created_at
    `, [req.params.batch_id]);

    // Group by component type
    const breakdown = costComponents.reduce((acc, component) => {
      if (!acc[component.component_type]) {
        acc[component.component_type] = [];
      }
      acc[component.component_type].push(component);
      return acc;
    }, {});

    // Calculate totals
    const totals = costComponents.reduce((acc, component) => {
      acc.total_cost += component.total_cost;
      return acc;
    }, { total_cost: 0 });

    res.json({
      breakdown,
      totals,
      components: costComponents
    });
  } catch (error) {
    console.error('Get cost breakdown error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /smart-bottling/batches/{batchId}/status:
 *   put:
 *     summary: Update batch status
 *     description: Update the status of a bottling batch
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [planned, in_progress, completed, cancelled, quality_check, packaged, shipped]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Batch status updated successfully
 */
router.put('/batches/:batchId/status', auth, [
  body('status').isIn(['planned', 'in_progress', 'completed', 'cancelled', 'quality_check', 'packaged', 'shipped']).withMessage('Valid status is required'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { batchId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;

    const result = await bottlingService.updateBatchStatus(batchId, status, userId, notes);
    res.json(result);
  } catch (error) {
    console.error('Update batch status error:', error);
    res.status(500).json({ error: 'Failed to update batch status' });
  }
});

/**
 * @swagger
 * /smart-bottling/batches/{batchId}/steps/{stepId}:
 *   put:
 *     summary: Update production step status
 *     description: Update the status of a production step
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, failed, skipped]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Production step updated successfully
 */
router.put('/batches/:batchId/steps/:stepId', auth, [
  body('status').isIn(['pending', 'in_progress', 'completed', 'failed', 'skipped']).withMessage('Valid status is required'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { stepId } = req.params;
    const { status, notes } = req.body;
    const operatorId = req.user.id;

    const result = await bottlingService.updateProductionStep(stepId, status, operatorId, notes);
    res.json(result);
  } catch (error) {
    console.error('Update production step error:', error);
    res.status(500).json({ error: 'Failed to update production step' });
  }
});

/**
 * @swagger
 * /smart-bottling/batches/{batchId}/quality-checks:
 *   post:
 *     summary: Record quality check
 *     description: Record a quality check for a bottling batch
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - checkType
 *               - passed
 *               - score
 *             properties:
 *               checkType:
 *                 type: string
 *                 enum: [visual, functional, chemical, packaging, final]
 *               passed:
 *                 type: boolean
 *               score:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *               defectsFound:
 *                 type: string
 *               correctiveActions:
 *                 type: string
 *               reworkRequired:
 *                 type: boolean
 *               reworkQuantity:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Quality check recorded successfully
 */
router.post('/batches/:batchId/quality-checks', auth, [
  body('checkType').isIn(['visual', 'functional', 'chemical', 'packaging', 'final']).withMessage('Valid check type is required'),
  body('passed').isBoolean().withMessage('Passed must be boolean'),
  body('score').isFloat({ min: 0, max: 1 }).withMessage('Score must be between 0 and 1'),
  body('defectsFound').optional().isString().withMessage('Defects found must be a string'),
  body('correctiveActions').optional().isString().withMessage('Corrective actions must be a string'),
  body('reworkRequired').optional().isBoolean().withMessage('Rework required must be boolean'),
  body('reworkQuantity').optional().isInt({ min: 0 }).withMessage('Rework quantity must be a positive integer'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { batchId } = req.params;
    const checkData = {
      ...req.body,
      inspectorId: req.user.id
    };

    const result = await bottlingService.recordQualityCheck(batchId, checkData);
    res.status(201).json(result);
  } catch (error) {
    console.error('Record quality check error:', error);
    res.status(500).json({ error: 'Failed to record quality check' });
  }
});

/**
 * @swagger
 * /smart-bottling/batches/{batchId}/equipment-usage:
 *   post:
 *     summary: Record equipment usage
 *     description: Record equipment usage for a bottling batch
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - equipmentId
 *               - equipmentName
 *               - usageHours
 *             properties:
 *               equipmentId:
 *                 type: string
 *               equipmentName:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               usageHours:
 *                 type: number
 *               maintenanceRequired:
 *                 type: boolean
 *               issuesEncountered:
 *                 type: string
 *     responses:
 *       201:
 *         description: Equipment usage recorded successfully
 */
router.post('/batches/:batchId/equipment-usage', auth, [
  body('equipmentId').notEmpty().withMessage('Equipment ID is required'),
  body('equipmentName').notEmpty().withMessage('Equipment name is required'),
  body('usageHours').isFloat({ min: 0 }).withMessage('Usage hours must be a positive number'),
  body('startTime').optional().isISO8601().withMessage('Start time must be a valid date'),
  body('endTime').optional().isISO8601().withMessage('End time must be a valid date'),
  body('maintenanceRequired').optional().isBoolean().withMessage('Maintenance required must be boolean'),
  body('issuesEncountered').optional().isString().withMessage('Issues encountered must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { batchId } = req.params;
    const equipmentData = {
      ...req.body,
      operatorId: req.user.id
    };

    const result = await bottlingService.recordEquipmentUsage(batchId, equipmentData);
    res.status(201).json(result);
  } catch (error) {
    console.error('Record equipment usage error:', error);
    res.status(500).json({ error: 'Failed to record equipment usage' });
  }
});

/**
 * @swagger
 * /smart-bottling/batches/{batchId}/environmental-conditions:
 *   post:
 *     summary: Record environmental conditions
 *     description: Record environmental conditions for a bottling batch
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               temperatureCelsius:
 *                 type: number
 *               humidityPercentage:
 *                 type: number
 *               pressureHpa:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Environmental conditions recorded successfully
 */
router.post('/batches/:batchId/environmental-conditions', auth, [
  body('temperatureCelsius').optional().isFloat().withMessage('Temperature must be a number'),
  body('humidityPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Humidity must be between 0 and 100'),
  body('pressureHpa').optional().isFloat({ min: 0 }).withMessage('Pressure must be a positive number'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { batchId } = req.params;
    const result = await bottlingService.recordEnvironmentalConditions(batchId, req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Record environmental conditions error:', error);
    res.status(500).json({ error: 'Failed to record environmental conditions' });
  }
});

/**
 * @swagger
 * /smart-bottling/batches/{batchId}/details:
 *   get:
 *     summary: Get enhanced batch details
 *     description: Get comprehensive details of a bottling batch including all related data
 *     tags: [Smart Bottling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Enhanced batch details retrieved successfully
 */
router.get('/batches/:batchId/details', auth, async (req, res) => {
  try {
    const { batchId } = req.params;
    const details = await bottlingService.getEnhancedBatchDetails(batchId);
    res.json(details);
  } catch (error) {
    console.error('Get enhanced batch details error:', error);
    res.status(500).json({ error: 'Failed to get batch details' });
  }
});

/**
 * @swagger
 * /api/smart-bottling/recipes/{recipeId}/compatible-perfumes:
 *   get:
 *     summary: Get compatible bulk perfumes for a recipe
 *     tags: [Smart Bottling]
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Recipe ID
 *     responses:
 *       200:
 *         description: List of compatible bulk perfumes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 compatible_perfumes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       scent_description:
 *                         type: string
 *                       bulk_quantity_liters:
 *                         type: number
 *                       cost_per_liter:
 *                         type: number
 *                       compatibility_score:
 *                         type: number
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Server error
 */
router.get('/recipes/:recipeId/compatible-perfumes', auth, async (req, res) => {
  try {
    const { recipeId } = req.params;

    // Get recipe details
    const recipe = await database.get(`
      SELECT br.*, bs.size_ml 
      FROM bottling_recipes br
      JOIN bottle_sizes bs ON br.bottle_size_id = bs.id
      WHERE br.id = $1 AND br.is_active = true
    `, [recipeId]);

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Get recipe materials that are perfume-related
    const perfumeMaterials = await database.all(`
      SELECT rm.*, rm2.name as material_name, rm2.type, rm2.description
      FROM recipe_materials rm
      JOIN raw_materials rm2 ON rm.material_id = rm2.id
      WHERE rm.recipe_id = $1 
      AND (rm2.type = 'perfume' OR rm2.name LIKE '%perfume%' OR rm2.name LIKE '%fragrance%' OR rm2.name LIKE '%essence%')
    `, [recipeId]);

    // Get all active bulk perfumes
    const bulkPerfumes = await database.all(`
      SELECT * FROM perfume_bulk 
      WHERE is_active = true 
      ORDER BY name
    `, []);

    // Calculate compatibility scores based on:
    // 1. Scent family matching
    // 2. Concentration compatibility
    // 3. Available quantity vs recipe requirements
    const compatiblePerfumes = bulkPerfumes.map(perfume => {
      let compatibilityScore = 0;
      let reasons = [];

      // Check if perfume name matches any material names
      const perfumeName = perfume.name.toLowerCase();
      const scentDesc = (perfume.scent_description || '').toLowerCase();

      for (const material of perfumeMaterials) {
        const materialName = material.material_name.toLowerCase();
        const materialDesc = (material.description || '').toLowerCase();

        // Direct name matching
        if (perfumeName.includes(materialName) || materialName.includes(perfumeName)) {
          compatibilityScore += 50;
          reasons.push(`Name matches material: ${material.material_name}`);
        }

        // Scent description matching
        if (scentDesc.includes(materialName) || materialDesc.includes(perfumeName)) {
          compatibilityScore += 30;
          reasons.push(`Scent description matches material: ${material.material_name}`);
        }

        // Check for common scent families
        const commonScents = ['rose', 'lavender', 'oud', 'musk', 'vanilla', 'jasmine', 'citrus'];
        for (const scent of commonScents) {
          if ((perfumeName.includes(scent) || scentDesc.includes(scent)) &&
            (materialName.includes(scent) || materialDesc.includes(scent))) {
            compatibilityScore += 20;
            reasons.push(`Common scent family: ${scent}`);
            break;
          }
        }
      }

      // Check quantity compatibility
      const totalPerfumeRequired = perfumeMaterials.reduce((total, material) => {
        return total + material.quantity_per_unit;
      }, 0);

      if (perfume.bulk_quantity_liters >= totalPerfumeRequired) {
        compatibilityScore += 20;
        reasons.push(`Sufficient quantity available: ${perfume.bulk_quantity_liters}L`);
      } else {
        compatibilityScore -= 10;
        reasons.push(`Insufficient quantity: ${perfume.bulk_quantity_liters}L available, ${totalPerfumeRequired}L required`);
      }

      // Base score for all perfumes
      compatibilityScore += 10;

      return {
        ...perfume,
        compatibility_score: Math.max(0, Math.min(100, compatibilityScore)),
        compatibility_reasons: reasons,
        quantity_available: perfume.bulk_quantity_liters
      };
    });

    // Sort by compatibility score (highest first)
    compatiblePerfumes.sort((a, b) => b.compatibility_score - a.compatibility_score);

    res.json({
      recipe: {
        id: recipe.id,
        name: recipe.name,
        size_ml: recipe.size_ml,
        perfume_materials: perfumeMaterials
      },
      compatible_perfumes: compatiblePerfumes
    });

  } catch (error) {
    console.error('Get compatible perfumes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 