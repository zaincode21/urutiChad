const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         parent_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         path:
 *           type: string
 *         level:
 *           type: integer
 *         type:
 *           type: string
 *         is_active:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         children:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Category'
 *     CategoryAttribute:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         category_id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         type:
 *           type: string
 *         is_required:
 *           type: boolean
 *         default_value:
 *           type: string
 *         options:
 *           type: string
 *         sort_order:
 *           type: integer
 *         is_active:
 *           type: boolean
 */

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Hierarchical category management
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories in hierarchical structure
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *         description: Filter by category level
 *       - in: query
 *         name: parent_id
 *         schema:
 *           type: string
 *         description: Filter by parent category ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by category type
 *     responses:
 *       200:
 *         description: List of categories in hierarchical structure
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', auth, async (req, res) => {
  try {
    const { level, parent_id, type } = req.query;
    
    let whereClause = "WHERE (c.deleted_at IS NULL OR c.deleted_at = '')";
    const params = [];
    
    if (level !== undefined) {
      whereClause += " AND c.level = ?";
      params.push(level);
    }
    
    if (parent_id !== undefined) {
      whereClause += " AND c.parent_id = ?";
      params.push(parent_id);
    }
    
    if (type) {
      whereClause += " AND c.type = ?";
      params.push(type);
    }

    const query = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.parent_id,
        c.path,
        c.level,
        c.type,
        c.is_active,
        c.created_at,
        c.updated_at,
        p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      ${whereClause}
      ORDER BY c.level, c.name
    `;
    
    const rows = await db.all(query, params);
    
    // Build hierarchical structure
    const categoriesMap = new Map();
    const rootCategories = [];
    
    // First pass: create map of all categories
    rows.forEach(row => {
      categoriesMap.set(row.id, {
        ...row,
        children: []
      });
    });
    
    // Second pass: build hierarchy
    rows.forEach(row => {
      if (row.parent_id) {
        const parent = categoriesMap.get(row.parent_id);
        if (parent) {
          parent.children.push(categoriesMap.get(row.id));
        }
      } else {
        rootCategories.push(categoriesMap.get(row.id));
      }
    });

    res.json({
      success: true,
      categories: rootCategories,
      flat: rows // Also return flat structure for easier frontend handling
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get a specific category by ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.parent_id,
        c.path,
        c.level,
        c.type,
        c.is_active,
        c.created_at,
        c.updated_at,
        p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = ? AND (c.deleted_at IS NULL OR c.deleted_at = '')
    `;
    
    const category = await db.get(query, [id]);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Get children categories
    const childrenQuery = `
      SELECT id, name, description, level, type, is_active
      FROM categories 
      WHERE parent_id = ? AND (deleted_at IS NULL OR deleted_at = '')
      ORDER BY name
    `;
    const children = await db.all(childrenQuery, [id]);

    res.json({
      success: true,
      category: {
        ...category,
        children
      }
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
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
 *               parent_id:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/', auth, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional().trim(),
  body('parent_id').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) return true;
    return require('validator').isUUID(value);
  }).withMessage('Invalid parent_id format'),
  body('type').optional().trim(),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, parent_id, type = 'general', is_active = true } = req.body;
    
    // Handle empty string parent_id
    const finalParentId = (parent_id === '' || parent_id === null || parent_id === undefined) ? null : parent_id;
    
    // Check if parent exists if parent_id is provided
    let level = 0;
    let path = '';
    
    if (finalParentId) {
      const parent = await db.get('SELECT id, level, path FROM categories WHERE id = ? AND (deleted_at IS NULL OR deleted_at = \'\')', [finalParentId]);
      if (!parent) {
        return res.status(400).json({ error: 'Parent category not found' });
      }
      level = parent.level + 1;
      path = parent.path ? `${parent.path}/${parent.id}` : parent.id;
    }

    const id = require('crypto').randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO categories (id, name, description, parent_id, path, level, type, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await db.run(query, [id, name, description, finalParentId, path, level, type, is_active, now, now]);

    const newCategory = await db.get(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.parent_id,
        c.path,
        c.level,
        c.type,
        c.is_active,
        c.created_at,
        c.updated_at,
        p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = ?
    `, [id]);

    res.status(201).json({
      success: true,
      category: newCategory
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
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
 *               parent_id:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.put('/:id', auth, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('description').optional().trim(),
  body('parent_id').optional().isUUID().withMessage('Invalid parent_id format'),
  body('type').optional().trim(),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, parent_id, type, is_active } = req.body;

    // Check if category exists
    const existingCategory = await db.get('SELECT * FROM categories WHERE id = ? AND (deleted_at IS NULL OR deleted_at = \'\')', [id]);
    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if parent exists if parent_id is provided
    let level = existingCategory.level;
    let path = existingCategory.path;
    
    if (parent_id && parent_id !== existingCategory.parent_id) {
      const parent = await db.get('SELECT id, level, path FROM categories WHERE id = ? AND (deleted_at IS NULL OR deleted_at = \'\')', [parent_id]);
      if (!parent) {
        return res.status(400).json({ error: 'Parent category not found' });
      }
      level = parent.level + 1;
      path = parent.path ? `${parent.path}/${parent.id}` : parent.id;
    }

    const updateFields = [];
    const params = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }
    if (parent_id !== undefined) {
      updateFields.push('parent_id = ?');
      params.push(parent_id);
    }
    if (path !== existingCategory.path) {
      updateFields.push('path = ?');
      params.push(path);
    }
    if (level !== existingCategory.level) {
      updateFields.push('level = ?');
      params.push(level);
    }
    if (type !== undefined) {
      updateFields.push('type = ?');
      params.push(type);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(is_active);
    }

    updateFields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    const query = `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.run(query, params);

    const updatedCategory = await db.get(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.parent_id,
        c.path,
        c.level,
        c.type,
        c.is_active,
        c.created_at,
        c.updated_at,
        p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = ?
    `, [id]);

    res.json({
      success: true,
      category: updatedCategory
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category (soft delete)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Category not found
 *       400:
 *         description: Cannot delete category with children or products
 *       500:
 *         description: Server error
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await db.get('SELECT * FROM categories WHERE id = ? AND (deleted_at IS NULL OR deleted_at = \'\')', [id]);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has children
    const children = await db.get('SELECT COUNT(*) as count FROM categories WHERE parent_id = ? AND (deleted_at IS NULL OR deleted_at = \'\')', [id]);
    if (children.count > 0) {
      return res.status(400).json({ error: 'Cannot delete category with subcategories' });
    }

    // Check if category has products
    const products = await db.get('SELECT COUNT(*) as count FROM product_categories WHERE category_id = ?', [id]);
    if (products.count > 0) {
      return res.status(400).json({ error: 'Cannot delete category with associated products' });
    }

    // Soft delete
    await db.run('UPDATE categories SET deleted_at = ? WHERE id = ?', [new Date().toISOString(), id]);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/categories/{id}/attributes:
 *   get:
 *     summary: Get attributes for a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category attributes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 attributes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CategoryAttribute'
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.get('/:id/attributes', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await db.get('SELECT id FROM categories WHERE id = ? AND (deleted_at IS NULL OR deleted_at = \'\')', [id]);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const attributes = await db.all(`
      SELECT * FROM category_attributes 
      WHERE category_id = ? AND is_active = 1
      ORDER BY sort_order, name
    `, [id]);

    res.json({
      success: true,
      attributes
    });
  } catch (error) {
    console.error('Error fetching category attributes:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/categories/{id}/attributes:
 *   post:
 *     summary: Add attribute to a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               is_required:
 *                 type: boolean
 *               default_value:
 *                 type: string
 *               options:
 *                 type: string
 *               sort_order:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Attribute added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 attribute:
 *                   $ref: '#/components/schemas/CategoryAttribute'
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.post('/:id/attributes', auth, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('type').trim().notEmpty().withMessage('Type is required'),
  body('is_required').optional().isBoolean(),
  body('default_value').optional().trim(),
  body('options').optional().trim(),
  body('sort_order').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, type, is_required = false, default_value, options, sort_order = 0 } = req.body;

    // Check if category exists
    const category = await db.get('SELECT id FROM categories WHERE id = ? AND (deleted_at IS NULL OR deleted_at = \'\')', [id]);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const attributeId = require('crypto').randomUUID();
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO category_attributes (id, category_id, name, type, is_required, default_value, options, sort_order, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [attributeId, id, name, type, is_required, default_value, options, sort_order, true, now]);

    const attribute = await db.get('SELECT * FROM category_attributes WHERE id = ?', [attributeId]);

    res.status(201).json({
      success: true,
      attribute
    });
  } catch (error) {
    console.error('Error adding category attribute:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 