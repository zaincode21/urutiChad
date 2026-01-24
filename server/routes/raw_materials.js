const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { auth, managerAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /raw-materials:
 *   get:
 *     summary: Get all raw materials
 *     tags: [Raw Materials]
 *     security:
 *       - bearerAuth: []
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
 */
router.delete('/:id', managerAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await database.run('UPDATE raw_materials SET is_active = false WHERE id = $1', [id]);
        res.json({ message: 'Material deleted' });
    } catch (error) {
        console.error('Delete raw material error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
