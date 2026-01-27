const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { auth, managerAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Raw Materials
 *   description: Raw material inventory management
 */

/**
 * @swagger
 * /raw-materials:
 *   get:
 *     summary: Get all raw materials
 *     tags: [Raw Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Material type filter
 *     responses:
 *       200:
 *         description: List of raw materials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 materials:
 *                   type: array
 *                 pagination:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const type = req.query.type;

        let query = `SELECT * FROM raw_materials WHERE is_active = true`;
        const params = [];

        if (search) {
            query += ` AND (name ILIKE $${params.length + 1} OR supplier_name ILIKE $${params.length + 1})`;
            params.push(`%${search}%`);
        }

        if (type && type !== 'all') {
            query += ` AND type = $${params.length + 1}`;
            params.push(type);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const materials = await database.all(query, params);

        // Get total for pagination
        let countQuery = `SELECT COUNT(*) as total FROM raw_materials WHERE is_active = true`;
        const countParams = [];

        if (search) {
            countQuery += ` AND (name ILIKE $${countParams.length + 1} OR supplier_name ILIKE $${countParams.length + 1})`;
            countParams.push(`%${search}%`);
        }

        if (type && type !== 'all') {
            countQuery += ` AND type = $${countParams.length + 1}`;
            countParams.push(type);
        }

        const countResult = await database.get(countQuery, countParams);
        const total = countResult?.total || 0;

        res.json({
            materials,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get raw materials error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /raw-materials:
 *   post:
 *     summary: Add new raw material
 *     tags: [Raw Materials]
 *     security:
 *       - bearerAuth: [] 
 */
router.post('/', managerAuth, [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('type').trim().notEmpty().withMessage('Type is required'),
    body('unit').trim().notEmpty().withMessage('Unit is required'),
    body('current_stock').isFloat({ min: 0 }).withMessage('Valid stock is required'),
    body('cost_per_unit').isFloat({ min: 0 }).withMessage('Valid cost is required'),
    body('selling_price').optional().isFloat({ min: 0 }),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const id = uuidv4();
        const {
            name, type, unit, current_stock, cost_per_unit, selling_price,
            min_stock_level, supplier_name, supplier_contact
        } = req.body;

        await database.run(`
      INSERT INTO raw_materials (
        id, name, type, unit, current_stock, cost_per_unit, selling_price,
        min_stock_level, supplier_name, supplier_contact
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
            id, name, type, unit, current_stock, cost_per_unit, selling_price || 0,
            min_stock_level || 0, supplier_name, supplier_contact
        ]);

        // Sync with Products table for POS availability
        const sku = `MAT-${id.substring(0, 8)}`;
        const productId = uuidv4();

        await database.run(`
            INSERT INTO products (
                id, name, sku, description, price, cost_price, 
                stock_quantity, current_stock, product_type, unit, 
                is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'atelier_material', $9, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
            productId,
            name,
            sku,
            `Atelier Material: ${type}`,
            selling_price || (cost_per_unit * 1.5),
            cost_per_unit,
            Math.floor(current_stock), // Products usually track integer stock, but we can be flexible if DB allows. Schema says INTEGER for stock_quantity.
            Math.floor(current_stock),
            unit
        ]);

        res.status(201).json({
            message: 'Material added successfully',
            material: { id, ...req.body }
        });
    } catch (error) {
        console.error('Add raw material error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /raw-materials/{id}:
 *   put:
 *     summary: Update raw material
 *     tags: [Raw Materials]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', managerAuth, [
    body('name').optional().trim().notEmpty(),
    body('current_stock').optional().isFloat({ min: 0 }),
    body('cost_per_unit').optional().isFloat({ min: 0 }),
    body('selling_price').optional().isFloat({ min: 0 }),
], async (req, res) => {
    try {
        const { id } = req.params;
        const material = await database.get('SELECT * FROM raw_materials WHERE id = $1', [id]);

        if (!material) {
            return res.status(404).json({ error: 'Material not found' });
        }

        const updates = req.body;
        const allowedFields = [
            'name', 'type', 'unit', 'current_stock', 'cost_per_unit', 'selling_price',
            'min_stock_level', 'supplier_name', 'supplier_contact'
        ];

        const fieldsToUpdate = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                fieldsToUpdate.push(`${key} = $${values.length + 1}`);
                values.push(updates[key]);
            }
        });

        if (fieldsToUpdate.length === 0) {
            return res.status(400).json({ error: 'No valid fields' });
        }

        values.push(id);
        await database.run(`
        UPDATE raw_materials 
        SET ${fieldsToUpdate.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $${values.length}
    `, values);

        // Sync updates to Products table
        const sku = `MAT-${id.substring(0, 8)}`;
        // We need to construct product updates based on raw material updates
        // Only update fields that changed and are relevant to products
        const productUpdates = [];
        const productValues = [];

        if (updates.name) {
            productValues.push(updates.name);
            productUpdates.push(`name = $${productValues.length}`);
        }

        if (updates.selling_price || updates.cost_per_unit) {
            // Recalculate price if either cost or price changes
            const newPrice = updates.selling_price !== undefined ? parseFloat(updates.selling_price) :
                (updates.cost_per_unit !== undefined ? parseFloat(updates.cost_per_unit) * 1.5 : undefined);

            if (newPrice !== undefined) {
                productValues.push(newPrice);
                productUpdates.push(`price = $${productValues.length}`);
            }

            if (updates.cost_per_unit !== undefined) {
                productValues.push(updates.cost_per_unit);
                productUpdates.push(`cost_price = $${productValues.length}`);
            }
        }

        if (updates.current_stock !== undefined) {
            productValues.push(Math.floor(updates.current_stock));
            productUpdates.push(`stock_quantity = $${productValues.length}`);
            productValues.push(Math.floor(updates.current_stock)); // Re-use value isn't easy with parameterized queries without index, just push again
            productUpdates.push(`current_stock = $${productValues.length}`);
        }

        if (productUpdates.length > 0) {
            productValues.push(sku);
            await database.run(`
                UPDATE products 
                SET ${productUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                WHERE sku = $${productValues.length}
            `, productValues);
        }

        res.json({ message: 'Material updated' });
    } catch (error) {
        console.error('Update raw material error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /raw-materials/{id}:
 *   delete:
 *     summary: Soft delete raw material
 *     tags: [Raw Materials]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', managerAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await database.run('UPDATE raw_materials SET is_active = false WHERE id = $1', [id]);

        // Sync delete to Products table
        const sku = `MAT-${id.substring(0, 8)}`;
        await database.run('UPDATE products SET is_active = false WHERE sku = $1', [sku]);

        res.json({ message: 'Material deleted' });
    } catch (error) {
        console.error('Delete raw material error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
