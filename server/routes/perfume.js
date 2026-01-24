const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { auth, adminAuth, managerAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /perfume/bulk:
 *   get:
 *     summary: Get all bulk perfumes
 *     description: Retrieve a list of all active bulk perfumes in inventory
 *     tags: [Perfumes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bulk perfumes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 perfumes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BulkPerfume'
 *             example:
 *               perfumes:
 *                 - id: "perfume-uuid-1"
 *                   name: "Lavender Fields"
 *                   scent_description: "Fresh lavender with hints of vanilla"
 *                   bulk_quantity_ml: 50000
 *                   cost_per_ml: 0.025
 *                   supplier: "Aroma Supplies Co"
 *                   batch_number: "LF-2024-001"
 *                   expiry_date: "2025-12-31"
 *                   is_active: true
 *                   created_at: "2024-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/bulk', auth, async (req, res) => {
  try {
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const totalCountResult = await database.get(`
      SELECT COUNT(*) as total
      FROM perfume_bulk pb
      WHERE pb.is_active = true
    `);
    const totalCount = totalCountResult?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Get paginated perfumes
    const perfumes = await database.all(`
      SELECT pb.*, c.name as category_name, c.id as category_id
      FROM perfume_bulk pb
      LEFT JOIN categories c ON pb.category_id = c.id
      WHERE pb.is_active = true 
      ORDER BY pb.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // Calculate remaining quantity for each perfume
    const perfumesWithRemaining = await Promise.all(perfumes.map(async (perfume) => {
      try {
        // Calculate total ml used in smart bottling batches
        const smartBottlingResult = await database.get(`
          SELECT COALESCE(SUM(bb.quantity_produced * bs.size_ml), 0) as total_used_ml
          FROM bottling_batches bb
          JOIN bottling_recipes br ON bb.recipe_id = br.id
          JOIN bottle_sizes bs ON br.bottle_size_id = bs.id
          WHERE bb.bulk_perfume_id = $1 
          AND bb.status IN ('planned', 'in_progress', 'completed')
        `, [perfume.id]);

        // Calculate total ml currently in shop inventory (actual "used" liquid)
        // This reflects what's actually bottled and sitting in shops right now
        const currentInventoryResult = await database.get(`
          SELECT COALESCE(SUM(si.quantity * CAST(REGEXP_REPLACE(p.size, '[^0-9]', '', 'g') AS INTEGER)), 0) as total_used_ml
          FROM shop_inventory si
          JOIN products p ON si.product_id = p.id
          WHERE p.name LIKE $1 || '%'
          AND si.quantity > 0
          AND p.product_type = 'perfume'
        `, [perfume.name]);

        const usedInSmartBottling = smartBottlingResult?.total_used_ml || 0;
        const usedInRegularBottling = currentInventoryResult?.total_used_ml || 0;
        const totalUsedMl = usedInSmartBottling + usedInRegularBottling;
        const remainingMl = Math.max(0, perfume.bulk_quantity_ml - totalUsedMl);

        console.log(`Perfume ${perfume.name}: Total=${perfume.bulk_quantity_ml}ML, Smart=${usedInSmartBottling}ML, Regular=${usedInRegularBottling}ML, Total Used=${totalUsedMl}ML, Remaining=${remainingMl}ML`);

        return {
          ...perfume,
          total_stock_ml: perfume.bulk_quantity_ml,
          used_in_smart_bottling: usedInSmartBottling,
          used_in_regular_bottling: usedInRegularBottling,
          used_in_bottling: totalUsedMl,
          remaining_ml: remainingMl
        };
      } catch (error) {
        console.error(`Error calculating remaining for perfume ${perfume.id}:`, error);
        return {
          ...perfume,
          total_stock_ml: perfume.bulk_quantity_ml,
          used_in_bottling: 0,
          remaining_ml: perfume.bulk_quantity_ml
        };
      }
    }));

    res.json({
      perfumes: perfumesWithRemaining,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get bulk perfumes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /perfume/bulk/{id}:
 *   get:
 *     summary: Get bulk perfume by ID
 *     description: Retrieve detailed information about a specific bulk perfume including bottling history
 *     tags: [Perfumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Bulk perfume ID
 *     responses:
 *       200:
 *         description: Bulk perfume details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 perfume:
 *                   $ref: '#/components/schemas/BulkPerfume'
 *                 bottling_history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       quantity_bottled:
 *                         type: integer
 *                       total_cost:
 *                         type: number
 *                         format: decimal
 *                       size_ml:
 *                         type: integer
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Perfume not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/bulk/:id', auth, async (req, res) => {
  try {
    const perfume = await database.get(`
      SELECT * FROM perfume_bulk WHERE id = ? AND is_active = true
    `, [req.params.id]);

    if (!perfume) {
      return res.status(404).json({ error: 'Perfume not found' });
    }

    // Get bottling history
    const bottlingHistory = await database.all(`
      SELECT pb.*, bs.size_ml, u.first_name, u.last_name
      FROM perfume_bottling pb
      JOIN bottle_sizes bs ON pb.bottle_size_id = bs.id
      JOIN users u ON pb.created_by = u.id
      WHERE pb.bulk_perfume_id = ?
      ORDER BY pb.created_at DESC
    `, [req.params.id]);

    res.json({ perfume, bottling_history: bottlingHistory });
  } catch (error) {
    console.error('Get bulk perfume error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /perfume/bulk:
 *   post:
 *     summary: Add bulk perfume
 *     description: Add a new bulk perfume to inventory (admin only)
 *     tags: [Perfumes]
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
 *               - scent_description
 *               - bulk_quantity_liters
 *               - cost_per_liter
 *             properties:
 *               name:
 *                 type: string
 *                 description: Perfume name
 *               scent_description:
 *                 type: string
 *                 description: Detailed scent description
 *               bulk_quantity_liters:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0.1
 *                 description: Quantity in liters
 *               cost_per_liter:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Cost per liter
 *               supplier:
 *                 type: string
 *                 description: Supplier name
 *               batch_number:
 *                 type: string
 *                 description: Batch number
 *               expiry_date:
 *                 type: string
 *                 format: date
 *                 description: Expiry date
 *           example:
 *             name: "Rose Garden"
 *             scent_description: "Romantic rose petals with musk undertones"
 *             bulk_quantity_ml: 30000
 *             cost_per_ml: 0.0355
 *             supplier: "Fragrance World"
 *             batch_number: "RG-2024-002"
 *             expiry_date: "2025-06-30"
 *     responses:
 *       201:
 *         description: Bulk perfume added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 perfume:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     bulk_quantity_liters:
 *                       type: number
 *                       format: decimal
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/bulk', managerAuth, [
  body('name').trim().notEmpty().withMessage('Perfume name is required'),
  body('scent_description').trim().notEmpty().withMessage('Scent description is required'),
  body('bulk_quantity_ml').isInt({ min: 1 }).withMessage('Valid quantity in milliliters is required'),
  body('cost_per_ml').isFloat({ min: 0 }).withMessage('Valid cost per milliliter is required'),
  body('supplier').optional().trim(),
  body('batch_number').optional().trim(),
  body('expiry_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Valid expiry date is required'),
  body('category_id').optional({ nullable: true }).isUUID().withMessage('Valid category ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, scent_description, bulk_quantity_ml, cost_per_ml,
      supplier, batch_number, expiry_date, category_id
    } = req.body;

    // Convert empty expiry_date to null
    const finalExpiryDate = expiry_date && expiry_date.trim() !== '' ? expiry_date : null;

    const perfumeId = uuidv4();
    await database.run(`
      INSERT INTO perfume_bulk (
        id, name, scent_description, bulk_quantity_ml, cost_per_ml,
        supplier, batch_number, expiry_date, category_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [perfumeId, name, scent_description, bulk_quantity_ml, cost_per_ml,
      supplier || null, batch_number || null, finalExpiryDate, category_id || null]);

    res.status(201).json({
      message: 'Bulk perfume added successfully',
      perfume: { id: perfumeId, name, bulk_quantity_ml }
    });
  } catch (error) {
    console.error('Add bulk perfume error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /perfume/bulk/{id}:
 *   put:
 *     summary: Update bulk perfume
 *     description: Update an existing bulk perfume (admin only)
 *     tags: [Perfumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Bulk perfume ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Perfume name
 *               scent_description:
 *                 type: string
 *                 description: Detailed scent description
 *               bulk_quantity_liters:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0.1
 *                 description: Quantity in liters
 *               cost_per_liter:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Cost per liter
 *               supplier:
 *                 type: string
 *                 description: Supplier name
 *               batch_number:
 *                 type: string
 *                 description: Batch number
 *               expiry_date:
 *                 type: string
 *                 format: date
 *                 description: Expiry date
 *     responses:
 *       200:
 *         description: Bulk perfume updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 perfume:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Perfume not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/bulk/:id', managerAuth, [
  body('name').optional().trim().notEmpty().withMessage('Perfume name cannot be empty'),
  body('scent_description').optional().trim().notEmpty().withMessage('Scent description cannot be empty'),
  body('bulk_quantity_ml').optional().isInt({ min: 1 }).withMessage('Valid quantity in milliliters is required'),
  body('cost_per_ml').optional().isFloat({ min: 0 }).withMessage('Valid cost per milliliter is required'),
  body('supplier').optional().trim(),
  body('batch_number').optional().trim(),
  body('expiry_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Valid expiry date is required'),
  body('category_id').optional({ nullable: true }).isUUID().withMessage('Valid category ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    // Convert empty expiry_date to null
    if (updateData.expiry_date !== undefined) {
      updateData.expiry_date = updateData.expiry_date && updateData.expiry_date.trim() !== ''
        ? updateData.expiry_date
        : null;
    }

    // Check if perfume exists
    const existingPerfume = await database.get('SELECT * FROM perfume_bulk WHERE id = ?', [id]);
    if (!existingPerfume) {
      return res.status(404).json({ error: 'Perfume not found' });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await database.run(`
      UPDATE perfume_bulk 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    res.json({
      message: 'Bulk perfume updated successfully',
      perfume: { id, ...updateData }
    });
  } catch (error) {
    console.error('Update bulk perfume error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /perfume/bulk/{id}:
 *   delete:
 *     summary: Delete bulk perfume
 *     description: Soft delete a bulk perfume (admin only)
 *     tags: [Perfumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Bulk perfume ID
 *     responses:
 *       200:
 *         description: Bulk perfume deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Perfume not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/bulk/:id', managerAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if perfume exists
    const existingPerfume = await database.get('SELECT * FROM perfume_bulk WHERE id = ?', [id]);
    if (!existingPerfume) {
      return res.status(404).json({ error: 'Perfume not found' });
    }

    // Soft delete by setting is_active to false
    await database.run('UPDATE perfume_bulk SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

    res.json({ message: 'Bulk perfume deleted successfully' });
  } catch (error) {
    console.error('Delete bulk perfume error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /perfume/bottle-sizes:
 *   get:
 *     summary: Get bottle sizes
 *     description: Retrieve a list of all available bottle sizes
 *     tags: [Perfumes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bottle sizes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sizes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BottleSize'
 *             example:
 *               sizes:
 *                 - id: "size-uuid-1"
 *                   size_ml: 30
 *                   bottle_cost: 2.50
 *                   label_cost: 0.75
 *                   packaging_cost: 1.25
 *                   labor_cost: 3.00
 *                   is_active: true
 *                   created_at: "2024-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/bottle-sizes', auth, async (req, res) => {
  try {
    const sizes = await database.all(`
      SELECT * FROM bottle_sizes WHERE is_active = true ORDER BY size_ml
    `);

    // Calculate used quantity for each bottle size
    const sizesWithUsedQuantity = await Promise.all(sizes.map(async (size) => {
      try {
        const usedResult = await database.get(`
          SELECT COALESCE(SUM(quantity_bottled), 0) as used_quantity
          FROM perfume_bottling
          WHERE bottle_size_id = ?
        `, [size.id]);

        const usedQuantity = parseInt(usedResult?.used_quantity || 0);
        return {
          ...size,
          used_quantity: usedQuantity
        };
      } catch (error) {
        console.error(`Error calculating used quantity for bottle size ${size.id}:`, error);
        return {
          ...size,
          used_quantity: 0
        };
      }
    }));

    res.json({ sizes: sizesWithUsedQuantity });
  } catch (error) {
    console.error('Get bottle sizes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /perfume/bottle-sizes:
 *   post:
 *     summary: Add bottle size
 *     description: Add a new bottle size configuration (admin only)
 *     tags: [Perfumes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - size_ml
 *               - bottle_cost
 *             properties:
 *               size_ml:
 *                 type: integer
 *                 minimum: 1
 *                 description: Size in milliliters
 *               bottle_cost:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Cost per bottle
 *               label_cost:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Cost per label
 *               packaging_cost:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Cost per packaging
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *                 description: Number of bottles in stock for this size
 *           example:
 *             size_ml: 50
 *             bottle_cost: 3.25
 *             label_cost: 1.00
 *             packaging_cost: 1.50
 *             quantity: 100
 *     responses:
 *       201:
 *         description: Bottle size added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 size:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     size_ml:
 *                       type: integer
 *                     bottle_cost:
 *                       type: number
 *                       format: decimal
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/bottle-sizes', managerAuth, [
  body('size_ml').isInt({ min: 1 }).withMessage('Valid size in ml is required'),
  body('bottle_cost').isFloat({ min: 0 }).withMessage('Valid bottle cost is required'),
  body('label_cost').optional().isFloat({ min: 0 }).withMessage('Valid label cost is required'),
  body('packaging_cost').optional().isFloat({ min: 0 }).withMessage('Valid packaging cost is required'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Valid quantity is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { size_ml, bottle_cost, label_cost = 0, packaging_cost = 0, quantity = 0 } = req.body;

    const sizeId = uuidv4();
    await database.run(`
      INSERT INTO bottle_sizes (id, size_ml, bottle_cost, label_cost, packaging_cost, quantity)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [sizeId, size_ml, bottle_cost, label_cost, packaging_cost, quantity]);

    res.status(201).json({
      message: 'Bottle size added successfully',
      size: { id: sizeId, size_ml, bottle_cost }
    });
  } catch (error) {
    console.error('Add bottle size error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /perfume/bottle-sizes/{id}:
 *   put:
 *     summary: Update bottle size
 *     description: Update an existing bottle size configuration (admin only)
 *     tags: [Perfumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bottle size ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               size_ml:
 *                 type: integer
 *                 minimum: 1
 *                 description: Size in milliliters
 *               bottle_cost:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Cost per bottle
 *               label_cost:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Cost per label
 *               packaging_cost:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Cost per packaging
 *               labor_cost:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Labor cost per bottle
 *           example:
 *             size_ml: 50
 *             bottle_cost: 3.25
 *             label_cost: 1.00
 *             packaging_cost: 1.50
 *             labor_cost: 4.00
 *     responses:
 *       200:
 *         description: Bottle size updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 size:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Bottle size not found
 *       500:
 *         description: Server error
 */
router.put('/bottle-sizes/:id', managerAuth, [
  body('size_ml').optional().isInt({ min: 1 }).withMessage('Valid size in ml is required'),
  body('bottle_cost').optional().isFloat({ min: 0 }).withMessage('Valid bottle cost is required'),
  body('label_cost').optional().isFloat({ min: 0 }).withMessage('Valid label cost is required'),
  body('packaging_cost').optional().isFloat({ min: 0 }).withMessage('Valid packaging cost is required'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Valid quantity is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body;

    console.log('Update bottle size request:', { id, updateData });

    // Check if bottle size exists
    const existingSize = await database.get('SELECT * FROM bottle_sizes WHERE id = ?', [id]);
    if (!existingSize) {
      return res.status(404).json({ error: 'Bottle size not found' });
    }

    // Build dynamic update query - only allow specific fields
    const allowedFields = ['size_ml', 'bottle_cost', 'label_cost', 'packaging_cost', 'quantity'];
    const updateFields = [];
    const updateValues = [];

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined && updateData[key] !== null && updateData[key] !== '') {
        updateFields.push(`${key} = ?`);
        // Convert to appropriate type
        if (key === 'size_ml' || key === 'quantity') {
          const intValue = parseInt(updateData[key]);
          if (isNaN(intValue) || intValue < 0) {
            throw new Error(`Invalid ${key} value: ${updateData[key]}. Must be a non-negative integer.`);
          }
          updateValues.push(intValue);
        } else {
          const floatValue = parseFloat(updateData[key]);
          if (isNaN(floatValue) || floatValue < 0) {
            throw new Error(`Invalid ${key} value: ${updateData[key]}. Must be a non-negative number.`);
          }
          updateValues.push(floatValue);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add updated_at timestamp using NOW() for PostgreSQL (no placeholder needed)
    updateFields.push('updated_at = NOW()');

    // Add id for WHERE clause
    updateValues.push(id);
    const updateQuery = `UPDATE bottle_sizes SET ${updateFields.join(', ')} WHERE id = ?`;

    console.log('Update bottle size query:', updateQuery);
    console.log('Update bottle size values:', updateValues);
    console.log('Placeholder count in query:', (updateQuery.match(/\?/g) || []).length);
    console.log('Values count:', updateValues.length);

    // Verify placeholder count matches values count
    const placeholderCount = (updateQuery.match(/\?/g) || []).length;
    if (placeholderCount !== updateValues.length) {
      console.error('Placeholder mismatch!', { placeholderCount, valuesCount: updateValues.length });
      return res.status(500).json({
        error: 'Query placeholder mismatch',
        details: `Expected ${placeholderCount} values but got ${updateValues.length}`
      });
    }

    try {
      const result = await database.run(updateQuery, updateValues);
      console.log('Update successful:', result);
    } catch (dbError) {
      console.error('Database run error:', dbError);
      console.error('Error message:', dbError.message);
      console.error('Error code:', dbError.code);
      console.error('Error detail:', dbError.detail);
      console.error('Error hint:', dbError.hint);
      console.error('Query:', updateQuery);
      console.error('Values:', updateValues);

      // Check if it's a column doesn't exist error
      if (dbError.code === '42703' || dbError.message?.includes('column') || dbError.message?.includes('does not exist')) {
        return res.status(500).json({
          error: 'Database schema error',
          message: 'The quantity column may not exist in the database. Please run database migrations.',
          details: dbError.message
        });
      }

      throw dbError;
    }

    // Get updated bottle size
    const updatedSize = await database.get('SELECT * FROM bottle_sizes WHERE id = ?', [id]);

    res.json({
      message: 'Bottle size updated successfully',
      size: updatedSize
    });
  } catch (error) {
    console.error('Update bottle size error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @swagger
 * /perfume/bottle-sizes/{id}:
 *   delete:
 *     summary: Delete bottle size
 *     description: Delete a bottle size configuration (admin only)
 *     tags: [Perfumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bottle size ID
 *     responses:
 *       200:
 *         description: Bottle size deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Bottle size not found
 *       500:
 *         description: Server error
 */
router.delete('/bottle-sizes/:id', managerAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if bottle size exists
    const existingSize = await database.get('SELECT * FROM bottle_sizes WHERE id = ?', [id]);
    if (!existingSize) {
      return res.status(404).json({ error: 'Bottle size not found' });
    }

    // Check if bottle size is being used in recipes or bottling
    const recipeUsage = await database.get('SELECT id FROM bottling_recipes WHERE bottle_size_id = ? LIMIT 1', [id]);
    if (recipeUsage) {
      return res.status(400).json({ error: 'Cannot delete bottle size that is being used in recipes' });
    }

    const bottlingUsage = await database.get('SELECT id FROM bottling_batches WHERE recipe_id IN (SELECT id FROM bottling_recipes WHERE bottle_size_id = ?) LIMIT 1', [id]);
    if (bottlingUsage) {
      return res.status(400).json({ error: 'Cannot delete bottle size that has been used in bottling batches' });
    }

    // Soft delete by setting is_active to 0
    await database.run('UPDATE bottle_sizes SET is_active = false WHERE id = ?', [id]);

    res.json({
      message: 'Bottle size deleted successfully'
    });
  } catch (error) {
    console.error('Delete bottle size error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /perfume/bottle:
 *   post:
 *     summary: Bottle perfume
 *     description: Bottle perfume from bulk inventory and create new product
 *     tags: [Perfumes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bulk_perfume_id
 *               - bottle_size_id
 *               - quantity_bottled
 *             properties:
 *               bulk_perfume_id:
 *                 type: string
 *                 format: uuid
 *                 description: Bulk perfume ID
 *               bottle_size_id:
 *                 type: string
 *                 format: uuid
 *                 description: Bottle size ID
 *               quantity_bottled:
 *                 type: integer
 *                 minimum: 1
 *                 description: Number of bottles to create
 *           example:
 *             bulk_perfume_id: "perfume-uuid-1"
 *             bottle_size_id: "size-uuid-1"
 *             quantity_bottled: 100
 *     responses:
 *       201:
 *         description: Perfume bottled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 bottling:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     quantity_bottled:
 *                       type: integer
 *                     total_cost:
 *                       type: number
 *                       format: decimal
 *                     product_created:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         sku:
 *                           type: string
 *                         name:
 *                           type: string
 *       400:
 *         description: Validation error or insufficient bulk quantity
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Bulk perfume or bottle size not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/bottle', auth, [
  body('bulk_perfume_id').notEmpty().withMessage('Bulk perfume ID is required'),
  body('bottle_size').isInt({ min: 1 }).withMessage('Valid bottle size (30, 50, or 100) is required'),
  body('quantity_bottled').isInt({ min: 1 }).withMessage('Valid quantity is required'),
  body('shop_id').isUUID().withMessage('Valid shop ID is required'),
  body('batch_number').optional().trim()
], async (req, res) => {
  // Start transaction at the beginning
  let transactionStarted = false;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bulk_perfume_id, bottle_size, quantity_bottled, shop_id, batch_number } = req.body;

    console.log('[BOTTLING] Starting bottling process:', {
      bulk_perfume_id,
      bottle_size,
      quantity_bottled,
      shop_id,
      user: req.user.id
    });

    // Validate bottle size is one of the allowed values
    if (![30, 50, 100].includes(parseInt(bottle_size))) {
      return res.status(400).json({ error: 'Bottle size must be 30, 50, or 100 ML' });
    }

    // Get bulk perfume details with category
    const bulkPerfume = await database.get(`
      SELECT pb.*, c.name as category_name, c.id as category_id
      FROM perfume_bulk pb
      LEFT JOIN categories c ON pb.category_id = c.id
      WHERE pb.id = ? AND pb.is_active = true
    `, [bulk_perfume_id]);

    if (!bulkPerfume) {
      console.error('[BOTTLING] Bulk perfume not found:', bulk_perfume_id);
      return res.status(404).json({ error: 'Bulk perfume not found' });
    }

    console.log('[BOTTLING] Bulk perfume found:', {
      name: bulkPerfume.name,
      category: bulkPerfume.category_name,
      quantity_ml: bulkPerfume.bulk_quantity_ml
    });

    // Determine pricing category based on bulk perfume's category name
    const categoryName = bulkPerfume.category_name || '';
    const isSelectiveLabels = categoryName.toLowerCase().includes('selective labels') ||
      categoryName.toLowerCase().includes('selective');
    const pricingCategory = isSelectiveLabels ? 'selective_labels' : 'men_women';

    // Find bottle size by size_ml
    const bottleSize = await database.get(`
      SELECT * FROM bottle_sizes WHERE size_ml = ? AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `, [bottle_size]);

    if (!bottleSize) {
      console.error('[BOTTLING] Bottle size not found:', bottle_size);
      return res.status(404).json({ error: `Bottle size ${bottle_size}ML not found in inventory` });
    }

    // Validate shop exists
    const shop = await database.get(`
      SELECT id, name FROM shops WHERE id = ? AND is_active = 1
    `, [shop_id]);

    if (!shop) {
      console.error('[BOTTLING] Shop not found:', shop_id);
      return res.status(404).json({ error: 'Shop not found' });
    }

    console.log('[BOTTLING] Shop validated:', shop.name);

    // Pricing matrix
    const pricingMatrix = {
      men_women: {
        30: 500,
        50: 500,
        100: 400
      },
      selective_labels: {
        30: 833.3333333333,
        50: 700,
        100: 550
      }
    };

    // Calculate selling price per ml based on category and size
    const selling_price_per_ml = pricingMatrix[pricingCategory]?.[parseInt(bottle_size)];
    if (!selling_price_per_ml) {
      return res.status(400).json({ error: 'Invalid category or bottle size combination' });
    }

    // Check bottle size quantity
    const bottleSizeQuantity = parseInt(bottleSize.quantity) || 0;
    if (bottleSizeQuantity < quantity_bottled) {
      return res.status(400).json({
        error: `Insufficient bottle stock. Available: ${bottleSizeQuantity}, Required: ${quantity_bottled}`
      });
    }

    // Calculate required bulk quantity in ml
    const requiredMl = quantity_bottled * bottleSize.size_ml;

    if (requiredMl > bulkPerfume.bulk_quantity_ml) {
      return res.status(400).json({
        error: `Insufficient bulk quantity. Available: ${bulkPerfume.bulk_quantity_ml}ML, Required: ${requiredMl}ML`
      });
    }

    // Calculate total cost
    const perfumeCost = requiredMl * bulkPerfume.cost_per_ml;
    const bottleCost = quantity_bottled * bottleSize.bottle_cost;
    const labelCost = quantity_bottled * bottleSize.label_cost;
    const packagingCost = quantity_bottled * bottleSize.packaging_cost;
    const totalCost = perfumeCost + bottleCost + labelCost + packagingCost;

    // Calculate selling price based on category and size
    const sellingPrice = selling_price_per_ml * bottleSize.size_ml;

    // BEGIN TRANSACTION
    await database.run('BEGIN');
    transactionStarted = true;
    console.log('[BOTTLING] Transaction started');

    // Create bottling record
    const bottlingId = uuidv4();
    await database.run(`
      INSERT INTO perfume_bottling (
        id, bulk_perfume_id, bottle_size_id, quantity_bottled, total_cost, created_by, selling_price_per_ml
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [bottlingId, bulk_perfume_id, bottleSize.id, quantity_bottled, totalCost, req.user.id, selling_price_per_ml]);

    console.log('[BOTTLING] Bottling record created:', bottlingId);

    // Update bulk quantity
    await database.run(`
      UPDATE perfume_bulk 
      SET bulk_quantity_ml = bulk_quantity_ml - ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [requiredMl, bulk_perfume_id]);

    console.log('[BOTTLING] Bulk quantity updated. Used:', requiredMl, 'ML');

    // Decrement bottle size quantity
    await database.run(`
      UPDATE bottle_sizes 
      SET quantity = quantity - ?, updated_at = NOW()
      WHERE id = ?
    `, [quantity_bottled, bottleSize.id]);

    // Get updated bulk quantity for response
    const updatedBulkPerfume = await database.get(`
      SELECT bulk_quantity_ml FROM perfume_bulk WHERE id = ?
    `, [bulk_perfume_id]);

    // Generate SKU - unique per perfume name and bottle size
    // Use first 8 alphanumeric characters to prevent collisions (e.g. "Eros Pour Lui" vs "Erose Femme")
    const sanitizedName = bulkPerfume.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const namePrefix = sanitizedName.substring(0, 8);
    const sku = `PERF-${namePrefix}-${bottleSize.size_ml}ML`;
    const productName = `${bulkPerfume.name} ${bottleSize.size_ml}ml`;

    console.log('[BOTTLING] Generated SKU:', sku);

    // Check if product with this SKU already exists (same perfume, same size)
    let existingProduct = await database.get(`
      SELECT id, stock_quantity, current_stock, is_active FROM products WHERE sku = ?
    `, [sku]);

    let productId;
    if (existingProduct) {
      // Product already exists - reuse it and update stock
      productId = existingProduct.id;
      console.log('[BOTTLING] Existing product found:', productId);

      // Update product stock quantities and ensure it's active
      await database.run(`
        UPDATE products 
        SET stock_quantity = COALESCE(stock_quantity, 0) + ?,
            current_stock = COALESCE(current_stock, 0) + ?,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [quantity_bottled, quantity_bottled, productId]);

      console.log('[BOTTLING] Product stock updated. Added:', quantity_bottled);

      // Ensure product is linked to category (defensive check for existing products)
      const categoryId = bulkPerfume.category_id || null;
      if (categoryId) {
        try {
          const hasCategoryLink = await database.get(`
            SELECT 1 FROM product_categories WHERE product_id = ? AND category_id = ?
          `, [productId, categoryId]);

          if (!hasCategoryLink) {
            const category = await database.get(`
              SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL
            `, [categoryId]);

            if (category) {
              await database.run(`
                INSERT INTO product_categories (id, product_id, category_id, is_primary)
                VALUES (?, ?, ?, ?)
              `, [uuidv4(), productId, categoryId, true]);
              console.log('[BOTTLING] Existing product linked to missing category:', categoryId);
            }
          }
        } catch (catError) {
          console.warn('[BOTTLING] Error checking category link:', catError.message);
        }
      }
    } else {
      // Create new product
      console.log('[BOTTLING] Creating new product');

      // Generate 6-digit barcode
      const shortBarcode = (Math.floor(Math.random() * 900000) + 100000).toString();

      // Use the category from bulk perfume
      const categoryId = bulkPerfume.category_id || null;

      productId = uuidv4();
      await database.run(`
        INSERT INTO products (
          id, name, description, sku, barcode, category_id, price, cost_price, 
          stock_quantity, current_stock, product_type, size, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        productId, productName, bulkPerfume.scent_description || '', sku, shortBarcode,
        categoryId, sellingPrice, totalCost / quantity_bottled,
        quantity_bottled, quantity_bottled, 'perfume', `${bottleSize.size_ml}ml`, true
      ]);

      console.log('[BOTTLING] New product created:', {
        id: productId,
        sku,
        name: productName,
        stock: quantity_bottled,
        is_active: true
      });

      // Link product to category in product_categories table if category exists
      if (categoryId) {
        try {
          // Verify category exists
          const category = await database.get(`
            SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL
          `, [categoryId]);

          if (category) {
            await database.run(`
              INSERT INTO product_categories (id, product_id, category_id, is_primary)
              VALUES (?, ?, ?, ?)
            `, [uuidv4(), productId, categoryId, true]);
            console.log('[BOTTLING] Product linked to category:', categoryId);
          }
        } catch (categoryError) {
          console.warn('[BOTTLING] Could not link product to category:', categoryError.message);
        }
      }
    }

    // Verify product was created/updated
    const verifyProduct = await database.get(`
      SELECT id, name, sku, stock_quantity, is_active FROM products WHERE id = ?
    `, [productId]);

    if (!verifyProduct) {
      throw new Error('Product creation/update failed - product not found after insert/update');
    }

    console.log('[BOTTLING] Product verified:', verifyProduct);

    // Assign product to shop
    const assignmentId = uuidv4();
    const existingAssignment = await database.get(`
      SELECT id, quantity FROM shop_inventory WHERE shop_id = ? AND product_id = ?
    `, [shop_id, productId]);

    if (existingAssignment) {
      // Update existing assignment - add the new quantity
      await database.run(`
        UPDATE shop_inventory 
        SET quantity = quantity + ?, last_updated = CURRENT_TIMESTAMP 
        WHERE shop_id = ? AND product_id = ?
      `, [quantity_bottled, shop_id, productId]);

      console.log('[BOTTLING] Shop inventory updated. Added:', quantity_bottled);
    } else {
      // Create new assignment
      await database.run(`
        INSERT INTO shop_inventory (id, shop_id, product_id, quantity, min_stock_level, max_stock_level) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [assignmentId, shop_id, productId, quantity_bottled, 10, 100]);

      console.log('[BOTTLING] New shop inventory created:', assignmentId);
    }

    // Verify shop assignment
    const verifyAssignment = await database.get(`
      SELECT id, quantity FROM shop_inventory WHERE shop_id = ? AND product_id = ?
    `, [shop_id, productId]);

    if (!verifyAssignment) {
      throw new Error('Shop assignment failed - assignment not found after insert/update');
    }

    console.log('[BOTTLING] Shop assignment verified:', {
      shop_id,
      product_id: productId,
      quantity: verifyAssignment.quantity
    });

    // COMMIT TRANSACTION
    await database.run('COMMIT');
    transactionStarted = false;
    console.log('[BOTTLING] Transaction committed successfully');

    res.status(201).json({
      message: 'Perfume bottled successfully and assigned to shop',
      bottling: {
        id: bottlingId,
        quantity_bottled,
        total_cost: totalCost,
        ml_used: requiredMl,
        remaining_ml: updatedBulkPerfume.bulk_quantity_ml,
        selling_price_per_ml: selling_price_per_ml,
        selling_price: sellingPrice,
        product_created: { id: productId, sku, name: productName },
        shop_assigned: { id: shop_id, name: shop.name }
      }
    });
  } catch (error) {
    // ROLLBACK TRANSACTION on error
    if (transactionStarted) {
      try {
        await database.run('ROLLBACK');
        console.log('[BOTTLING] Transaction rolled back due to error');
      } catch (rollbackError) {
        console.error('[BOTTLING] Rollback failed:', rollbackError);
      }
    }

    console.error('[BOTTLING] Error during bottling process:', error);
    console.error('[BOTTLING] Error stack:', error.stack);
    res.status(500).json({
      error: 'Server error during bottling',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @swagger
 * /perfume/bottle-all-sizes:
 *   post:
 *     summary: Quick bottle all sizes
 *     description: Bottle perfume in all three sizes (30ml, 50ml, 100ml) with quantity 1 each for selected shop(s) (admin only)
 *     tags: [Perfumes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bulk_perfume_id
 *               - shop_id
 *             properties:
 *               bulk_perfume_id:
 *                 type: string
 *                 format: uuid
 *                 description: Bulk perfume ID
 *               shop_id:
 *                 type: string
 *                 description: Shop ID or "all" for all shops
 *               batch_number:
 *                 type: string
 *                 description: Optional batch number
 *           example:
 *             bulk_perfume_id: "perfume-uuid-1"
 *             shop_id: "shop-uuid-1"
 *             batch_number: "BATCH-2024-001"
 *     responses:
 *       201:
 *         description: Perfume bottled successfully in all sizes
 *       400:
 *         description: Validation error or insufficient stock
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/bottle-all-sizes', managerAuth, [
  body('bulk_perfume_id').isUUID().withMessage('Valid bulk perfume ID is required'),
  body('shop_id').notEmpty().withMessage('Shop ID is required (use "all" for all shops)'),
  body('batch_number').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bulk_perfume_id, shop_id, batch_number } = req.body;

    // Get bulk perfume details with category
    const bulkPerfume = await database.get(`
      SELECT pb.*, c.name as category_name, c.id as category_id
      FROM perfume_bulk pb
      LEFT JOIN categories c ON pb.category_id = c.id
      WHERE pb.id = ? AND pb.is_active = true
    `, [bulk_perfume_id]);

    if (!bulkPerfume) {
      return res.status(404).json({ error: 'Bulk perfume not found' });
    }

    // Determine pricing category
    const categoryName = bulkPerfume.category_name || '';
    const isSelectiveLabels = categoryName.toLowerCase().includes('selective labels') ||
      categoryName.toLowerCase().includes('selective');
    const pricingCategory = isSelectiveLabels ? 'selective_labels' : 'men_women';

    // Pricing matrix
    const pricingMatrix = {
      men_women: {
        30: 500,
        50: 500,
        100: 400
      },
      selective_labels: {
        30: 833.3333333333,
        50: 700,
        100: 550
      }
    };

    // Get all bottle sizes (30ml, 50ml, 100ml)
    const bottleSizes = await database.all(`
      SELECT * FROM bottle_sizes 
      WHERE size_ml IN (30, 50, 100) AND is_active = true
      ORDER BY size_ml
    `);

    if (bottleSizes.length !== 3) {
      return res.status(400).json({
        error: 'All three bottle sizes (30ml, 50ml, 100ml) must be configured'
      });
    }

    // Determine shops to assign to
    let shopsToAssign = [];
    if (shop_id === 'all') {
      const allShops = await database.all(`
        SELECT id FROM shops WHERE is_active = 1
      `);
      shopsToAssign = allShops.map(s => s.id);
    } else {
      // Validate single shop
      const shop = await database.get(`
        SELECT id FROM shops WHERE id = ? AND is_active = 1
      `, [shop_id]);
      if (!shop) {
        return res.status(404).json({ error: 'Shop not found' });
      }
      shopsToAssign = [shop_id];
    }

    if (shopsToAssign.length === 0) {
      return res.status(400).json({ error: 'No active shops found' });
    }

    // Check if we have enough bulk perfume (30ml + 50ml + 100ml = 180ml per shop)
    const totalMlNeeded = shopsToAssign.length * 180; // 1 of each size per shop
    if (totalMlNeeded > bulkPerfume.bulk_quantity_ml) {
      return res.status(400).json({
        error: `Insufficient bulk quantity. Available: ${bulkPerfume.bulk_quantity_ml}ML, Required: ${totalMlNeeded}ML`
      });
    }

    // Check bottle stock for each size
    for (const bottleSize of bottleSizes) {
      const bottleSizeQuantity = parseInt(bottleSize.quantity) || 0;
      if (bottleSizeQuantity < shopsToAssign.length) {
        return res.status(400).json({
          error: `Insufficient ${bottleSize.size_ml}ml bottle stock. Available: ${bottleSizeQuantity}, Required: ${shopsToAssign.length}`
        });
      }
    }

    const results = [];
    const errors_occurred = [];

    // Bottle each size for each shop
    for (const bottleSize of bottleSizes) {
      const bottleSizeMl = bottleSize.size_ml;
      const selling_price_per_ml = pricingMatrix[pricingCategory]?.[bottleSizeMl];

      if (!selling_price_per_ml) {
        errors_occurred.push(`Invalid pricing for ${bottleSizeMl}ml`);
        continue;
      }

      const quantity_bottled = 1; // Always 1 per shop per size
      const requiredMl = quantity_bottled * bottleSizeMl;
      const totalRequiredMl = requiredMl * shopsToAssign.length; // Total ML needed for all shops

      // Calculate total cost per unit
      const perfumeCostPerUnit = requiredMl * bulkPerfume.cost_per_ml;
      const bottleCostPerUnit = quantity_bottled * bottleSize.bottle_cost;
      const labelCostPerUnit = quantity_bottled * bottleSize.label_cost;
      const packagingCostPerUnit = quantity_bottled * bottleSize.packaging_cost;
      const totalCostPerUnit = perfumeCostPerUnit + bottleCostPerUnit + labelCostPerUnit + packagingCostPerUnit;
      const sellingPrice = selling_price_per_ml * bottleSizeMl;

      // Generate SKU
      const sku = `PERF-${bulkPerfume.name.substring(0, 3).toUpperCase()}-${bottleSizeMl}ML`;
      const productName = `${bulkPerfume.name} ${bottleSizeMl}ml`;

      // Check if product exists
      let existingProduct = await database.get(`
        SELECT id, stock_quantity, current_stock FROM products WHERE sku = ? AND is_active = 1
      `, [sku]);

      let productId;
      if (existingProduct) {
        // Reuse existing product and update stock
        productId = existingProduct.id;
        await database.run(`
          UPDATE products 
          SET stock_quantity = COALESCE(stock_quantity, 0) + ?,
              current_stock = COALESCE(current_stock, 0) + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [shopsToAssign.length, shopsToAssign.length, productId]);
      } else {
        // Create new product
        const shortBarcode = (Math.floor(Math.random() * 900000) + 100000).toString();
        const categoryId = bulkPerfume.category_id || null;

        productId = uuidv4();
        await database.run(`
          INSERT INTO products (
            id, name, description, sku, barcode, category_id, price, cost_price, 
            stock_quantity, current_stock, product_type, size
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          productId, productName, bulkPerfume.scent_description || '', sku, shortBarcode,
          categoryId, sellingPrice, totalCostPerUnit / quantity_bottled,
          shopsToAssign.length, shopsToAssign.length, 'perfume', `${bottleSizeMl}ml`
        ]);

        // Link product to category
        if (categoryId) {
          try {
            const category = await database.get(`
              SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL
            `, [categoryId]);

            if (category) {
              await database.run(`
                INSERT INTO product_categories (id, product_id, category_id, is_primary)
                VALUES (?, ?, ?, ?)
              `, [uuidv4(), productId, categoryId, true]);
            }
          } catch (categoryError) {
            console.warn('Could not link product to category:', categoryError.message);
          }
        }
      }

      // Create bottling records and assign to shops
      for (const shopId of shopsToAssign) {
        try {
          // Create bottling record for this shop
          const bottlingId = uuidv4();
          await database.run(`
            INSERT INTO perfume_bottling (
              id, bulk_perfume_id, bottle_size_id, quantity_bottled, total_cost, created_by, selling_price_per_ml
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [bottlingId, bulk_perfume_id, bottleSize.id, quantity_bottled, totalCostPerUnit, req.user.id, selling_price_per_ml]);

          // Assign product to shop
          const existingAssignment = await database.get(`
            SELECT id, quantity FROM shop_inventory WHERE shop_id = ? AND product_id = ?
          `, [shopId, productId]);

          if (existingAssignment) {
            await database.run(`
              UPDATE shop_inventory 
              SET quantity = quantity + ?, last_updated = CURRENT_TIMESTAMP 
              WHERE shop_id = ? AND product_id = ?
            `, [quantity_bottled, shopId, productId]);
          } else {
            const assignmentId = uuidv4();
            await database.run(`
              INSERT INTO shop_inventory (id, shop_id, product_id, quantity, min_stock_level, max_stock_level) 
              VALUES (?, ?, ?, ?, ?, ?)
            `, [assignmentId, shopId, productId, quantity_bottled, 10, 100]);
          }

          results.push({
            size: `${bottleSizeMl}ml`,
            shop_id: shopId,
            quantity: quantity_bottled,
            product_sku: sku
          });
        } catch (error) {
          console.error(`Error bottling ${bottleSizeMl}ml for shop ${shopId}:`, error);
          errors_occurred.push(`${bottleSizeMl}ml for shop ${shopId}: ${error.message}`);
        }
      }

      // Update bulk quantity (once per size)
      await database.run(`
        UPDATE perfume_bulk 
        SET bulk_quantity_ml = bulk_quantity_ml - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [totalRequiredMl, bulk_perfume_id]);

      // Decrement bottle size quantity (once per size)
      await database.run(`
        UPDATE bottle_sizes 
        SET quantity = quantity - ?, updated_at = NOW()
        WHERE id = ?
      `, [shopsToAssign.length, bottleSize.id]);
    }

    // Get updated bulk quantity
    const updatedBulkPerfume = await database.get(`
      SELECT bulk_quantity_ml FROM perfume_bulk WHERE id = ?
    `, [bulk_perfume_id]);

    if (errors_occurred.length > 0) {
      return res.status(207).json({
        message: 'Bottling completed with some errors',
        results,
        errors: errors_occurred,
        remaining_ml: updatedBulkPerfume.bulk_quantity_ml
      });
    }

    res.status(201).json({
      message: `Successfully bottled all sizes (30ml, 50ml, 100ml) for ${shopsToAssign.length} shop(s)`,
      results,
      remaining_ml: updatedBulkPerfume.bulk_quantity_ml,
      shops_assigned: shopsToAssign.length
    });
  } catch (error) {
    console.error('Quick bottle all sizes error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @swagger
 * /perfume/bottle-all-bulk:
 *   post:
 *     summary: Bottle ALL bulk perfumes
 *     description: Iterates through ALL active bulk perfumes and bottles them (30ml, 50ml, 100ml) for selected shop(s) if stock permits.
 *     tags: [Perfumes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shop_id
 *             properties:
 *               shop_id:
 *                 type: string
 *                 description: Shop ID or "all" to bottle for all shops
 *     responses:
 *       200:
 *         description: Bulk bottling process completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 results:
 *                   type: object
 *                   properties:
 *                     processed:
 *                       type: integer
 *                     success:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *       500:
 *         description: Server error
 */
router.post('/bottle-all-bulk', managerAuth, [
  body('shop_id').notEmpty().withMessage('Shop ID is required (use "all" for all shops)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shop_id } = req.body;

    console.log('[BULK-BOTTLE-ALL] Starting process for shop:', shop_id);

    // 1. Get ALL active bulk perfumes
    const bulkPerfumes = await database.all(`
      SELECT pb.*, c.name as category_name, c.id as category_id
      FROM perfume_bulk pb
      LEFT JOIN categories c ON pb.category_id = c.id
      WHERE pb.is_active = true AND pb.bulk_quantity_ml >= 180 -- Minimum for 1 set (30+50+100)
    `);

    if (bulkPerfumes.length === 0) {
      return res.json({
        message: 'No bulk perfumes found with sufficient stock (min 180ml).',
        results: { processed: 0, success: 0, failed: 0, details: [] }
      });
    }

    // 2. Determine shops
    let shopsToAssign = [];
    if (shop_id === 'all') {
      const allShops = await database.all('SELECT id FROM shops WHERE is_active = 1');
      shopsToAssign = allShops.map(s => s.id);
    } else {
      const shop = await database.get('SELECT id FROM shops WHERE id = ? AND is_active = 1', [shop_id]);
      if (!shop) return res.status(404).json({ error: 'Shop not found' });
      shopsToAssign = [shop_id];
    }

    if (shopsToAssign.length === 0) return res.status(400).json({ error: 'No active shops found' });

    // 3. Get Bottle Config
    const bottleSizes = await database.all(`
      SELECT * FROM bottle_sizes WHERE size_ml IN (30, 50, 100) AND is_active = true ORDER BY size_ml
    `);

    if (bottleSizes.length !== 3) {
      return res.status(400).json({ error: 'Bottle configuration missing (need 30, 50, 100ml)' });
    }

    const pricingMatrix = {
      men_women: { 30: 500, 50: 500, 100: 400 },
      selective_labels: { 30: 833.3333333333, 50: 700, 100: 550 }
    };

    let stats = { processed: 0, success: 0, failed: 0, details: [] };

    console.log(`[BULK-BOTTLE-ALL] Processing ${bulkPerfumes.length} perfumes for ${shopsToAssign.length} shops...`);

    // 4. Iterate and Bottle
    for (const perfume of bulkPerfumes) {
      stats.processed++;

      const totalMlNeeded = shopsToAssign.length * 180;

      // Check Bulk Stock
      if (perfume.bulk_quantity_ml < totalMlNeeded) {
        stats.failed++;
        stats.details.push({ name: perfume.name, status: 'Skipped', reason: `Low Bulk Stock (${perfume.bulk_quantity_ml}ml < ${totalMlNeeded}ml)` });
        continue;
      }

      // Check Bottle Stock
      // Note: We need to re-fetch bottle stock inside loop or optimize. 
      // For safety/concurrency, let's re-fetch or use a transaction. 
      // Given complexity, we will attempt the transaction for each perfume.

      let transactionStarted = false;
      try {
        await database.run('BEGIN');
        transactionStarted = true;

        // Re-verify stocks inside transaction
        const currentBulk = await database.get('SELECT bulk_quantity_ml FROM perfume_bulk WHERE id = ? FOR UPDATE', [perfume.id]);
        if (currentBulk.bulk_quantity_ml < totalMlNeeded) {
          throw new Error('Insufficient bulk stock (race condition)');
        }

        // Check and decrement bottles
        for (const size of bottleSizes) {
          const res = await database.run(`
            UPDATE bottle_sizes 
            SET quantity = quantity - ? 
            WHERE id = ? AND quantity >= ?
          `, [shopsToAssign.length, size.id, shopsToAssign.length]);

          if (res.changes === 0) throw new Error(`Insufficient ${size.size_ml}ml bottles`);
        }

        // Decrement Bulk
        await database.run(`
          UPDATE perfume_bulk 
          SET bulk_quantity_ml = bulk_quantity_ml - ? 
          WHERE id = ?
        `, [totalMlNeeded, perfume.id]);

        // Process Products & Shop Inventory
        const categoryName = perfume.category_name || '';
        const isSelective = categoryName.toLowerCase().includes('selective');
        const priceCat = isSelective ? 'selective_labels' : 'men_women';

        for (const shopId of shopsToAssign) {
          for (const size of bottleSizes) {
            const ml = size.size_ml;

            // SKU & Product Logic (Reuse from standard bottling)
            const sanitizedName = perfume.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            const sku = `PERF-${sanitizedName.substring(0, 8)}-${ml}ML`;
            const productName = `${perfume.name} ${ml}ml`;

            const costPerMl = perfume.cost_per_ml; // Should be in DB
            const bottleCost = size.cost;
            const totalCost = (costPerMl * ml) + bottleCost;
            const pricePerMl = pricingMatrix[priceCat][ml];
            const sellingPrice = Math.round(pricePerMl * ml);

            // Upsert Product
            let prod = await database.get('SELECT id FROM products WHERE sku = ?', [sku]);
            let prodId = prod ? prod.id : uuidv4();

            if (prod) {
              await database.run(`
                UPDATE products SET stock_quantity = stock_quantity + 1, current_stock = current_stock + 1, is_active = true WHERE id = ?
              `, [prodId]);
            } else {
              // Create Product
              const barcode = (Math.floor(Math.random() * 900000) + 100000).toString();
              await database.run(`
                 INSERT INTO products (id, name, sku, barcode, category_id, price, cost_price, stock_quantity, current_stock, product_type, size, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 'perfume', ?, true)
               `, [prodId, productName, sku, barcode, perfume.category_id, sellingPrice, totalCost, `${ml}ml`]);
            }

            // Shop Inventory
            const inv = await database.get('SELECT id FROM shop_inventory WHERE shop_id = ? AND product_id = ?', [shopId, prodId]);
            if (inv) {
              await database.run('UPDATE shop_inventory SET quantity = quantity + 1 WHERE id = ?', [inv.id]);
            } else {
              await database.run('INSERT INTO shop_inventory (id, shop_id, product_id, quantity) VALUES (?, ?, ?, 1)', [uuidv4(), shopId, prodId]);
            }

            // Record History
            await database.run(`
              INSERT INTO perfume_bottling (id, bulk_perfume_id, bottle_size_id, quantity_bottled, total_cost, created_by)
              VALUES (?, ?, ?, 1, ?, ?)
            `, [uuidv4(), perfume.id, size.id, totalCost, req.user.id]);
          }
        }

        await database.run('COMMIT');
        stats.success++;
      } catch (err) {
        if (transactionStarted) await database.run('ROLLBACK');
        stats.failed++;
        stats.details.push({ name: perfume.name, status: 'Failed', reason: err.message });
      }
    }

    res.json({
      message: `Completed. Success: ${stats.success}, Failed/Skipped: ${stats.failed}`,
      results: stats
    });

  } catch (error) {
    console.error('Global bulk bottle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


/**
 * @swagger
 * /perfume/bottling/history:
 *   get:
 *     summary: Get bottling history
 *     description: Retrieve recent bottling history with details
 *     tags: [Perfumes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bottling history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       perfume_name:
 *                         type: string
 *                       size_ml:
 *                         type: integer
 *                       quantity_bottled:
 *                         type: integer
 *                       total_cost:
 *                         type: number
 *                         format: decimal
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/bottling/history', auth, async (req, res) => {
  try {
    const history = await database.all(`
      SELECT pb.*, pbp.name as perfume_name, bs.size_ml, u.first_name, u.last_name
      FROM perfume_bottling pb
      JOIN perfume_bulk pbp ON pb.bulk_perfume_id = pbp.id
      JOIN bottle_sizes bs ON pb.bottle_size_id = bs.id
      JOIN users u ON pb.created_by = u.id
      ORDER BY pb.created_at DESC
      LIMIT 100
    `);

    res.json({ history });
  } catch (error) {
    console.error('Get bottling history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /perfume/stats:
 *   get:
 *     summary: Get perfume statistics
 *     description: Retrieve comprehensive statistics about perfume operations
 *     tags: [Perfumes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfume statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bulk_summary:
 *                   type: object
 *                   properties:
 *                     total_bulk_items:
 *                       type: integer
 *                     total_liters:
 *                       type: number
 *                       format: decimal
 *                     total_value:
 *                       type: number
 *                       format: decimal
 *                 bottling_stats:
 *                   type: object
 *                   properties:
 *                     total_bottling_sessions:
 *                       type: integer
 *                     total_bottles_created:
 *                       type: integer
 *                     total_bottling_cost:
 *                       type: number
 *                       format: decimal
 *                 top_perfumes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       total_bottled:
 *                         type: integer
 *                       total_cost:
 *                         type: number
 *                         format: decimal
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', auth, async (req, res) => {
  try {
    // Bulk inventory summary
    const bulkSummary = await database.get(`
      SELECT 
        COUNT(*) as total_bulk_items,
        SUM(bulk_quantity_ml) as total_ml,
        SUM(bulk_quantity_ml * cost_per_ml) as total_value
      FROM perfume_bulk 
      WHERE is_active = true
    `);

    // Bottling statistics (using bottling_batches table)
    const bottlingStats = await database.get(`
      SELECT 
        COUNT(*) as total_bottling_sessions,
        SUM(quantity_produced) as total_bottles_created,
        0 as total_bottling_cost
      FROM bottling_batches
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // Top perfumes by bottling (using bottling_batches and perfume_bulk)
    const topPerfumes = await database.all(`
      SELECT pbp.name, SUM(bb.quantity_produced) as total_bottled, 0 as total_cost
      FROM bottling_batches bb
      LEFT JOIN perfume_bulk pbp ON bb.bulk_perfume_id = pbp.id
      WHERE pbp.name IS NOT NULL
      GROUP BY pbp.id, pbp.name
      ORDER BY total_bottled DESC
      LIMIT 5
    `);

    res.json({
      bulk_summary: bulkSummary,
      bottling_stats: bottlingStats,
      top_perfumes: topPerfumes
    });
  } catch (error) {
    console.error('Get perfume stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


/**
 * @swagger
 * /perfume/return-shop-inventory:
 *   post:
 *     summary: Return shop inventory to bulk
 *     description: Return all unsold shop inventory back to the main bulk perfume inventory and bottle sizes
 *     tags: [Perfumes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 recovered_stats:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/return-shop-inventory', managerAuth, async (req, res) => {
  let transactionStarted = false;
  try {
    console.log('[RETURN INVENTORY] Starting process...');

    // 1. Get all shop inventory with quantity > 0
    const shopInventoryItems = await database.all(`
      SELECT si.id, si.shop_id, si.product_id, si.quantity, p.name as product_name, p.sku
      FROM shop_inventory si
      JOIN products p ON si.product_id = p.id
      WHERE si.quantity > 0
    `);

    if (shopInventoryItems.length === 0) {
      return res.status(200).json({ message: 'No shop inventory to return.' });
    }

    console.log(`[RETURN INVENTORY] Found ${shopInventoryItems.length} items to return.`);

    // 2. Get reference data
    const bulkPerfumes = await database.all('SELECT id, name FROM perfume_bulk');
    const bottleSizes = await database.all('SELECT id, size_ml FROM bottle_sizes');

    await database.run('BEGIN');
    transactionStarted = true;

    let totalLiquidRecovered = 0;
    let totalBottlesRecovered = 0;
    let processedItems = 0;
    let errors = [];

    for (const item of shopInventoryItems) {
      try {
        // Extract size from product name (assuming format "Name SizeML")
        // e.g. "Rose Garden 50ml"
        const sizeMatch = item.product_name.match(/(\d+)ml$/i);
        if (!sizeMatch) {
          console.warn(`Could not extract size from product: ${item.product_name}`);
          errors.push(`Skipped ${item.product_name}: Could not determine size`);
          continue;
        }

        const sizeMl = parseInt(sizeMatch[1]);

        // Find bulk perfume (match name)
        // Check if product name starts with bulk name
        // Sort bulk perfumes by name length desc to match longest possible name first
        const sortedBulk = bulkPerfumes.sort((a, b) => b.name.length - a.name.length);
        const matchedBulk = sortedBulk.find(b => item.product_name.toLowerCase().startsWith(b.name.toLowerCase()));

        if (!matchedBulk) {
          console.warn(`Could not find bulk perfume for product: ${item.product_name}`);
          errors.push(`Skipped ${item.product_name}: Could not find matching bulk perfume`);
          continue;
        }

        // Find bottle size
        const matchedBottleSize = bottleSizes.find(s => s.size_ml === sizeMl);
        if (!matchedBottleSize) {
          console.warn(`Could not find bottle size configuration for: ${sizeMl}ml`);
          errors.push(`Skipped ${item.product_name}: Unknown bottle size ${sizeMl}ml`);
          continue;
        }

        const liquidToReturn = item.quantity * sizeMl;
        const bottlesToReturn = item.quantity;

        // 3. Updates

        // Return liquid to bulk
        await database.run(`
          UPDATE perfume_bulk 
          SET bulk_quantity_ml = bulk_quantity_ml + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [liquidToReturn, matchedBulk.id]);

        // Return bottles to stock
        await database.run(`
          UPDATE bottle_sizes 
          SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [bottlesToReturn, matchedBottleSize.id]);

        // Clear shop inventory
        await database.run(`
          UPDATE shop_inventory 
          SET quantity = 0, last_updated = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [item.id]);

        // Reduce product stock (Global)
        // Since we are removing from shop, we must reduce the global product stock.
        // Assuming products.stock_quantity is the sum of all shop inventories + warehouse.
        await database.run(`
          UPDATE products 
          SET stock_quantity = GREATEST(0, stock_quantity - ?), 
              current_stock = GREATEST(0, current_stock - ?),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [item.quantity, item.quantity, item.product_id]);

        totalLiquidRecovered += liquidToReturn;
        totalBottlesRecovered += bottlesToReturn;
        processedItems++;

      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError);
        errors.push(`Error on ${item.product_name}: ${itemError.message}`);
      }
    }

    await database.run('COMMIT');
    transactionStarted = false;

    console.log('[RETURN INVENTORY] Completed.');

    res.json({
      message: 'Shop inventory return process completed',
      recovered_stats: {
        items_processed: processedItems,
        liquid_ml: totalLiquidRecovered,
        bottles: totalBottlesRecovered,
        errors: errors
      }
    });

  } catch (error) {
    if (transactionStarted) {
      await database.run('ROLLBACK');
    }
    console.error('Return shop inventory error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;
