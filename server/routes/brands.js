const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { auth, adminAuth, managerAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Brand:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         logo_url:
 *           type: string

 *         is_active:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Brands
 *   description: Brand management
 */

/**
 * @swagger
 * /api/brands:
 *   get:
 *     summary: Get all brands
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search brands by name
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of brands
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 brands:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Brand'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', auth, async (req, res) => {
  try {
    const { search = '', active } = req.query;
    
    let whereConditions = [];
    let params = [];
    
    if (search) {
      whereConditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (active !== undefined) {
      whereConditions.push('is_active = ?');
      params.push(active === 'true' ? 1 : 0);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
         const brands = await database.all(`
       SELECT 
         id,
         name,
         description,
         logo_url,
         is_active,
         created_at,
         updated_at
       FROM brands
       ${whereClause}
       ORDER BY name
     `, params);
    
    res.json({
      success: true,
      brands
    });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/brands/{id}:
 *   get:
 *     summary: Get a specific brand by ID
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID
 *     responses:
 *       200:
 *         description: Brand details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 brand:
 *                   $ref: '#/components/schemas/Brand'
 *       404:
 *         description: Brand not found
 *       500:
 *         description: Server error
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
         const brand = await database.get(`
       SELECT 
         id,
         name,
         description,
         logo_url,
         is_active,
         created_at,
         updated_at
       FROM brands
       WHERE id = ?
     `, [id]);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    res.json({
      success: true,
      brand
    });
  } catch (error) {
    console.error('Get brand error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/brands:
 *   post:
 *     summary: Create a new brand
 *     tags: [Brands]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               logo_url:
 *                 type: string
 *               website:
 *                 type: string
 *               country:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Brand created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 brand:
 *                   $ref: '#/components/schemas/Brand'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/', [auth, adminAuth], [
  body('name').trim().notEmpty().withMessage('Brand name is required'),
  body('description').optional().trim(),
  body('logo_url').optional().custom((value) => {
    if (value && value.trim() !== '') {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(value)) {
        throw new Error('Invalid logo URL format');
      }
    }
    return true;
  }),
  body('website').optional().custom((value) => {
    if (value && value.trim() !== '') {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(value)) {
        throw new Error('Invalid website URL format');
      }
    }
    return true;
  }),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
         const { name, description, logo_url, website, country, is_active = true } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Check if website and country columns exist
    const hasWebsite = await database.get(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'brands' AND column_name = 'website'
    `);
    
    const hasCountry = await database.get(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'brands' AND column_name = 'country'
    `);
    
    if (hasWebsite && hasCountry) {
      // New schema with website and country
      await database.run(`
        INSERT INTO brands (id, name, description, logo_url, website, country, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, name, description, logo_url, website, country, is_active ? 1 : 0, now, now]);
    } else {
      // Old schema without website and country
      await database.run(`
        INSERT INTO brands (id, name, description, logo_url, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [id, name, description, logo_url, is_active ? 1 : 0, now, now]);
    }
    
    const brand = await database.get('SELECT * FROM brands WHERE id = ?', [id]);
    
    res.status(201).json({
      success: true,
      brand
    });
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/brands/{id}:
 *   put:
 *     summary: Update a brand
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               logo_url:
 *                 type: string
 *               website:
 *                 type: string
 *               country:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Brand updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 brand:
 *                   $ref: '#/components/schemas/Brand'
 *       404:
 *         description: Brand not found
 *       500:
 *         description: Server error
 */
router.put('/:id', [auth, adminAuth], [
  body('name').optional().trim().notEmpty().withMessage('Brand name cannot be empty'),
  body('description').optional().trim(),
  body('logo_url').optional().custom((value) => {
    if (value && value.trim() !== '') {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(value)) {
        throw new Error('Invalid logo URL format');
      }
    }
    return true;
  }),
  body('website').optional().custom((value) => {
    if (value && value.trim() !== '') {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(value)) {
        throw new Error('Invalid website URL format');
      }
    }
    return true;
  }),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
         const { name, description, logo_url, website, country, is_active } = req.body;
    const now = new Date().toISOString();
    
    // Check if brand exists
    const existingBrand = await database.get('SELECT id FROM brands WHERE id = ?', [id]);
    if (!existingBrand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    // Check if website and country columns exist
    const hasWebsite = await database.get(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'brands' AND column_name = 'website'
    `);
    
    const hasCountry = await database.get(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'brands' AND column_name = 'country'
    `);
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (logo_url !== undefined) {
      updates.push('logo_url = ?');
      params.push(logo_url);
    }
    if (website !== undefined && hasWebsite) {
      updates.push('website = ?');
      params.push(website);
    }
    if (country !== undefined && hasCountry) {
      updates.push('country = ?');
      params.push(country);
    }
    
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    
    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);
    
    await database.run(`
      UPDATE brands 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);
    
    const brand = await database.get('SELECT * FROM brands WHERE id = ?', [id]);
    
    res.json({
      success: true,
      brand
    });
  } catch (error) {
    console.error('Update brand error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/brands/{id}:
 *   delete:
 *     summary: Delete a brand
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID
 *     responses:
 *       200:
 *         description: Brand deleted successfully
 *       404:
 *         description: Brand not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if brand exists
    const existingBrand = await database.get('SELECT id FROM brands WHERE id = ?', [id]);
    if (!existingBrand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    // Check if brand is used by any products
    const productsUsingBrand = await database.get(`
      SELECT COUNT(*) as count FROM products WHERE brand_id = ?
    `, [id]);
    
    if (productsUsingBrand.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete brand. It is associated with existing products.' 
      });
    }
    
    await database.run('DELETE FROM brands WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Brand deleted successfully'
    });
  } catch (error) {
    console.error('Delete brand error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 