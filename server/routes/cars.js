const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Cars
 *   description: Car registration and management
 */

/**
 * @swagger
 * /api/cars:
 *   get:
 *     summary: Get all registered cars
 *     tags: [Cars]
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
 *         description: Search by plate number, owner name, or contact
 *     responses:
 *       200:
 *         description: List of cars
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cars:
 *                   type: array
 *                 pagination:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let query = `SELECT * FROM cars WHERE is_active = true`;
        const params = [];

        if (search) {
            query += ` AND (plate_number ILIKE $${params.length + 1} OR owner_name ILIKE $${params.length + 1} OR owner_contact ILIKE $${params.length + 1})`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const cars = await database.all(query, params);

        // Get total for pagination
        let countQuery = `SELECT COUNT(*) as total FROM cars WHERE is_active = true`;
        const countParams = [];

        if (search) {
            countQuery += ` AND (plate_number ILIKE $${countParams.length + 1} OR owner_name ILIKE $${countParams.length + 1} OR owner_contact ILIKE $${countParams.length + 1})`;
            countParams.push(`%${search}%`);
        }

        const countResult = await database.get(countQuery, countParams);
        const total = countResult?.total || 0;

        res.json({
            cars,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get cars error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /api/cars:
 *   post:
 *     summary: Register a new car
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plate_number
 *               - owner_name
 *               - owner_contact
 *             properties:
 *               plate_number:
 *                 type: string
 *               make:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *               color:
 *                 type: string
 *               owner_name:
 *                 type: string
 *               owner_contact:
 *                 type: string
 *     responses:
 *       201:
 *         description: Car registered successfully
 *       400:
 *         description: Validation error or Duplicate plate number
 *       500:
 *         description: Server error
 */
router.post('/', auth, [
    body('plate_number').trim().notEmpty().withMessage('Plate number is required'),
    body('owner_name').trim().notEmpty().withMessage('Owner name is required'),
    body('owner_contact').trim().notEmpty().withMessage('Owner contact is required'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { plate_number, make, model, year, color, owner_name, owner_contact } = req.body;

        // Check for duplicate plate number
        const existingCar = await database.get('SELECT id FROM cars WHERE plate_number = $1 AND is_active = true', [plate_number]);
        if (existingCar) {
            return res.status(400).json({ error: 'Car with this plate number already exists' });
        }

        const id = uuidv4();
        await database.run(`
            INSERT INTO cars (
                id, plate_number, make, model, year, color, owner_name, owner_contact
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [id, plate_number, make, model, year, color, owner_name, owner_contact]);

        res.status(201).json({
            message: 'Car registered successfully',
            car: { id, ...req.body }
        });
    } catch (error) {
        console.error('Register car error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
