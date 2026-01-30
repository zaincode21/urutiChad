const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         sku:
 *           type: string
 *         barcode:
 *           type: string
 *         brand_id:
 *           type: string
 *           format: uuid
 *         product_type:
 *           type: string
 *         size:
 *           type: string
 *         color:
 *           type: string
 *         variant:
 *           type: string
 *         price:
 *           type: number
 *         cost_price:
 *           type: number
 *         currency:
 *           type: string
 *         stock_quantity:
 *           type: integer
 *         min_stock_level:
 *           type: integer
 *         max_stock_level:
 *           type: integer
 *         unit:
 *           type: string
 *         weight:
 *           type: number
 *         dimensions:
 *           type: string
 *         image_url:
 *           type: string
 *         is_active:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         categories:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductCategory'
 *         attributes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductAttribute'
 *         images:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductImage'
 *     ProductCategory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         category_id:
 *           type: string
 *           format: uuid
 *         category_name:
 *           type: string
 *         is_primary:
 *           type: boolean
 *     ProductAttribute:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         attribute_id:
 *           type: string
 *           format: uuid
 *         attribute_name:
 *           type: string
 *         value:
 *           type: string
 *     ProductImage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         image_url:
 *           type: string
 *         alt_text:
 *           type: string
 *         is_primary:
 *           type: boolean
 *         sort_order:
 *           type: integer
 */

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management with hierarchical categories
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with hierarchical categories
 *     tags: [Products]
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
 *         name: category
 *         schema:
 *           type: string
 *         description: Category ID filter
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *         description: Currency filter
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: in_stock
 *         schema:
 *           type: string
 *         description: Stock filter (true/false)
 *       - in: query
 *         name: include_all
 *         schema:
 *           type: string
 *         description: Include all products regardless of shop assignment (true/false)
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      product_type = '',
      size = '',
      currency = 'RWF',
      min_price = '',
      max_price = '',
      in_stock = '',
      status = '',
      sortBy = 'created_at',
      sortOrder = 'desc',
      include_all = ''
    } = req.query;

    // Debug logging
    console.log('Products API - Query params:', { page, limit, include_all, search, status, in_stock, sortBy, sortOrder });
    console.log('Products API - Request query:', req.query);
    console.log('Products API - include_all type:', typeof include_all, 'value:', include_all);

    const offset = (page - 1) * limit;

    // Check if we should return all products (no pagination)
    const shouldReturnAll = include_all === 'true' || include_all === true;

    let whereConditions = [];
    let params = [];

    if (search) {
      // Case-insensitive search using LOWER() function
      whereConditions.push('(LOWER(p.name) LIKE LOWER(?) OR LOWER(p.description) LIKE LOWER(?) OR LOWER(p.sku) LIKE LOWER(?))');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      whereConditions.push('pc.category_id = ?');
      params.push(category);
    }

    if (product_type) {
      whereConditions.push('p.product_type = ?');
      params.push(product_type);
    }

    if (size) {
      whereConditions.push('p.size = ?');
      params.push(size);
    }

    if (min_price) {
      whereConditions.push('p.price >= ?');
      params.push(min_price);
    }

    if (max_price) {
      whereConditions.push('p.price <= ?');
      params.push(max_price);
    }

    // Handle stock filter with 'in', 'low', 'out' values from frontend
    if (in_stock === 'in') {
      // In stock: quantity > min_stock_level
      whereConditions.push('p.stock_quantity > p.min_stock_level');
    } else if (in_stock === 'low') {
      // Low stock: quantity > 0 AND quantity <= min_stock_level
      whereConditions.push('p.stock_quantity > 0 AND p.stock_quantity <= p.min_stock_level');
    } else if (in_stock === 'out') {
      // Out of stock: quantity = 0
      whereConditions.push('p.stock_quantity = 0');
    } else if (in_stock === 'true') {
      // Legacy support: any stock
      whereConditions.push('p.stock_quantity > 0');
    } else if (in_stock === 'false') {
      // Legacy support: no stock
      whereConditions.push('p.stock_quantity = 0');
    }

    // Handle status filter (active/inactive)
    if (status === 'active') {
      whereConditions.push('p.is_active = true');
    } else if (status === 'inactive') {
      whereConditions.push('p.is_active = false');
    } else {
      // Default: only show active products if no status filter specified
      whereConditions.push('p.is_active = true');
    }

    // Add shop-specific filtering only for cashiers (unless include_all is true)
    // Managers and admins see global inventory
    let shopJoin = '';
    if (req.user.role === 'cashier' && req.user.shop_id && !shouldReturnAll) {
      whereConditions.push('si.shop_id = ?');
      params.push(req.user.shop_id);
      shopJoin = 'INNER JOIN shop_inventory si ON p.id = si.product_id';
    }

    // Add category join if category filter is used
    let categoryJoin = '';
    if (category) {
      categoryJoin = 'INNER JOIN product_categories pc ON p.id = pc.product_id';
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build dynamic ORDER BY clause
    let orderByClause = 'ORDER BY ';
    const validSortFields = {
      'name': 'p.name',
      'price': 'p.price',
      'stock': 'p.stock_quantity',
      'created_at': 'p.created_at'
    };
    const sortField = validSortFields[sortBy] || 'p.created_at';
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    orderByClause += `${sortField} ${sortDirection}`;

    // Simplified products query with shop-specific quantities
    let productsQuery = `
      SELECT 
        p.*,
        b.name as brand_name,
        ${req.user.role === 'cashier' && req.user.shop_id && !shouldReturnAll
        ? 'COALESCE(si.quantity, 0) as shop_quantity, si.min_stock_level as shop_min_stock_level, si.max_stock_level as shop_max_stock_level'
        : 'p.stock_quantity as shop_quantity, p.min_stock_level as shop_min_stock_level, p.max_stock_level as shop_max_stock_level'
      }
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      ${categoryJoin}
      ${shopJoin}
      ${whereClause}
      ${orderByClause}
      ${shouldReturnAll ? '' : 'LIMIT ? OFFSET ?'}
    `;

    const products = await database.all(
      productsQuery,
      shouldReturnAll ? params : [...params, parseInt(limit), offset]
    );

    console.log('Products API - Products fetched:', products.length);
    console.log('Products API - include_all:', include_all);
    console.log('Products API - shouldReturnAll:', shouldReturnAll);
    console.log('Products API - Using LIMIT:', !shouldReturnAll);

    // Get categories for each product and update quantities
    for (let product of products) {
      // Get category information for each product
      if (product.category_id) {
        const category = await database.get(
          'SELECT id, name FROM categories WHERE id = ?',
          [product.category_id]
        );
        product.categories = category ? [{
          id: category.id,
          category_id: category.id,
          category_name: category.name,
          is_primary: true
        }] : [];
      } else {
        product.categories = [];
      }

      // For admin/manager, calculate shop distribution
      if (req.user.role === 'admin' || req.user.role === 'manager') {
        // Get total quantity assigned to shops
        const shopStats = await database.get(
          `SELECT 
            COALESCE(SUM(quantity), 0) as total_shop_quantity,
            COUNT(DISTINCT shop_id) as shops_with_product
           FROM shop_inventory 
           WHERE product_id = ?`,
          [product.id]
        );

        const globalStock = product.stock_quantity || product.current_stock || 0;
        const totalAssigned = shopStats.total_shop_quantity || 0;

        product.total_shop_quantity = totalAssigned;
        product.shops_with_product = shopStats.shops_with_product || 0;
        product.global_quantity = globalStock;
        product.global_min_stock = product.min_stock_level;
        product.available_for_assignment = Math.max(0, globalStock - totalAssigned);
      }

      // For cashiers, use shop-specific quantities
      if (req.user.role === 'cashier' && req.user.shop_id && !shouldReturnAll) {
        // shop_quantity comes from the query (COALESCE(si.quantity, 0))
        const shopQty = product.shop_quantity !== undefined && product.shop_quantity !== null ? product.shop_quantity : 0;
        product.stock_quantity = shopQty;
        product.min_stock_level = product.shop_min_stock_level !== undefined && product.shop_min_stock_level !== null
          ? product.shop_min_stock_level
          : product.min_stock_level;
        product.max_stock_level = product.shop_max_stock_level !== undefined && product.shop_max_stock_level !== null
          ? product.shop_max_stock_level
          : product.max_stock_level;
      }

      // Remove shop-specific fields from response
      delete product.shop_quantity;
      delete product.shop_min_stock_level;
      delete product.shop_max_stock_level;
    }

    // Simplified count query
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      ${categoryJoin}
      ${shopJoin}
      ${whereClause}
    `;

    const countResult = await database.get(countQuery, params);

    const total = countResult.total;
    const totalPages = shouldReturnAll ? 1 : Math.ceil(total / limit);

    res.json({
      products,
      pagination: {
        page: shouldReturnAll ? 1 : parseInt(page),
        limit: shouldReturnAll ? total : parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await database.get(`
      SELECT 
        p.*,
        b.name as brand_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.id = ? AND p.is_active = true
    `, [id]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get categories
    const categories = await database.all(`
      SELECT 
        pc.id,
        pc.category_id,
        pc.is_primary,
        c.name as category_name,
        c.level as category_level,
        c.path as category_path
      FROM product_categories pc
      JOIN categories c ON pc.category_id = c.id
      WHERE pc.product_id = ? AND (c.deleted_at IS NULL OR c.deleted_at = '')
      ORDER BY pc.is_primary DESC, c.level, c.name
    `, [id]);

    // Get attributes
    const attributes = await database.all(`
      SELECT 
        pav.id,
        pav.attribute_id,
        pav.value,
        ca.name as attribute_name,
        ca.type as attribute_type,
        ca.is_required
      FROM product_attribute_values pav
      JOIN category_attributes ca ON pav.attribute_id = ca.id
      WHERE pav.product_id = ? AND ca.is_active = true
      ORDER BY ca.sort_order, ca.name
    `, [id]);

    // Get images
    const images = await database.all(`
      SELECT id, image_url, alt_text, is_primary, sort_order
      FROM product_images
      WHERE product_id = ?
      ORDER BY is_primary DESC, sort_order, created_at
    `, [id]);

    res.json({
      success: true,
      product: {
        ...product,
        categories,
        attributes,
        images
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
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
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               sku:
 *                 type: string
 *               barcode:
 *                 type: string
 *               brand_id:
 *                 type: string
 *                 format: uuid
 *               product_type:
 *                 type: string
 *               size:
 *                 type: string
 *               color:
 *                 type: string
 *               variant:
 *                 type: string
 *               price:
 *                 type: number
 *               cost_price:
 *                 type: number
 *               currency:
 *                 type: string
 *               stock_quantity:
 *                 type: integer
 *               min_stock_level:
 *                 type: integer
 *               max_stock_level:
 *                 type: integer
 *               unit:
 *                 type: string
 *               weight:
 *                 type: number
 *               dimensions:
 *                 type: string
 *               image_url:
 *                 type: string
 *               category_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               attributes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     attribute_id:
 *                       type: string
 *                       format: uuid
 *                     value:
 *                       type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/', auth, [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('sku').optional().trim(),
  body('barcode').optional().trim(),
  body('brand_id').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Invalid brand_id format'),
  body('category_id').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Invalid category_id format'),
  body('category_ids').optional().isArray().withMessage('category_ids must be an array'),
  body('category_ids.*').optional().isUUID().withMessage('Invalid category_id format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, description, sku, barcode, brand_id, product_type, size, color, variant,
      price, cost_price, stock_quantity = 0, min_stock_level = 0,
      max_stock_level, unit = 'piece', weight, dimensions, image_url,
      category_id, category_ids = [], attributes = []
    } = req.body;

    // Enforce SKU uniqueness if provided
    if (sku && sku.trim() !== '') {
      const existingSku = await database.get('SELECT id FROM products WHERE sku = ?', [sku]);
      if (existingSku) {
        return res.status(400).json({ error: 'SKU already exists' });
      }
    }

    // Force currency to be RWF
    const currency = 'RWF';

    // AI Intelligence: Smart SKU Generation
    let finalSku = sku;
    if (!sku || sku.trim() === '') {
      try {
        // Fallback to simple SKU generation since generateSmartSku method doesn't exist
        finalSku = `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      } catch (skuError) {
        console.warn('SKU generation failed:', skuError.message);
        // Fallback to simple SKU generation
        finalSku = `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      }
    }

    // AI Intelligence: Duplicate Detection
    let duplicateAnalysis = null;
    try {
      // Skip duplicate detection since detectDuplicates method doesn't exist
      duplicateAnalysis = null;
    } catch (duplicateError) {
      console.warn('Duplicate detection failed:', duplicateError.message);
    }

    const productId = uuidv4();
    const now = new Date().toISOString();

    // Use category_id if provided, otherwise use first category from category_ids, otherwise default to Uncategorized
    let finalCategoryId = category_id;
    if (!finalCategoryId && category_ids.length > 0) {
      finalCategoryId = category_ids[0];
    }
    if (!finalCategoryId) {
      finalCategoryId = '00000000-0000-0000-0000-000000000001'; // Default Uncategorized category
    }

    // Insert product
    await database.run(`
      INSERT INTO products (
        id, name, description, sku, barcode, brand_id, category_id, product_type, size, color, variant,
        price, cost_price, currency, stock_quantity, min_stock_level, max_stock_level,
        unit, weight, dimensions, image_url, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      productId, name, description, finalSku, barcode, brand_id, finalCategoryId, product_type, size, color, variant,
      price, cost_price, currency, stock_quantity, min_stock_level, max_stock_level,
      unit, weight, dimensions, image_url, true, now, now
    ]);

    // Insert category relationships (skip if product_categories table doesn't exist)
    try {
      for (let i = 0; i < category_ids.length; i++) {
        const categoryId = category_ids[i];
        // Verify category exists
        const category = await database.get('SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL', [categoryId]);
        if (category) {
          await database.run(`
            INSERT INTO product_categories (id, product_id, category_id, is_primary)
            VALUES (?, ?, ?, ?)
          `, [uuidv4(), productId, categoryId, i === 0 ? true : false]);
        }
      }
    } catch (categoryError) {
      console.warn('Category relationships insertion failed (table may not exist):', categoryError.message);
    }

    // Insert attributes (skip if product_attribute_values table doesn't exist)
    try {
      for (const attr of attributes) {
        if (attr.attribute_id && attr.value !== undefined) {
          await database.run(`
            INSERT INTO product_attribute_values (id, product_id, attribute_id, value)
            VALUES (?, ?, ?, ?)
          `, [uuidv4(), productId, attr.attribute_id, attr.value]);
        }
      }
    } catch (attributeError) {
      console.warn('Attribute values insertion failed (table may not exist):', attributeError.message);
    }

    // Get created product with all relationships
    const product = await database.get(`
      SELECT 
        p.*,
        b.name as brand_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.id = ?
    `, [productId]);

    // Get categories from the product's category_id field
    let categories = [];
    if (product && product.category_id) {
      try {
        const category = await database.get(`
          SELECT id, name, level, path
          FROM categories 
          WHERE id = ? AND deleted_at IS NULL
        `, [product.category_id]);

        if (category) {
          categories = [{
            id: category.id,
            category_id: category.id,
            category_name: category.name,
            is_primary: true
          }];
        }
      } catch (categoryError) {
        console.warn('Category retrieval failed:', categoryError.message);
        categories = [];
      }
    }

    // Get attributes (skip if product_attribute_values table doesn't exist)
    let productAttributes = [];
    try {
      productAttributes = await database.all(`
        SELECT 
          pav.id,
          pav.attribute_id,
          pav.value,
          ca.name as attribute_name,
          ca.type as attribute_type,
          ca.is_required
        FROM product_attribute_values pav
        JOIN category_attributes ca ON pav.attribute_id = ca.id
        WHERE pav.product_id = ? AND ca.is_active = true
        ORDER BY ca.sort_order, ca.name
      `, [productId]);
    } catch (attributeError) {
      console.warn('Attributes retrieval failed (table may not exist):', attributeError.message);
      productAttributes = [];
    }

    res.status(201).json({
      success: true,
      product: {
        ...product,
        categories,
        attributes: productAttributes,
        images: []
      },
      aiInsights: {
        skuGenerated: !sku || sku.trim() === '',
        generatedSku: finalSku,
        duplicateAnalysis: duplicateAnalysis ? {
          hasDuplicates: duplicateAnalysis.hasDuplicates,
          similarityScore: duplicateAnalysis.similarityScore,
          duplicateReasons: duplicateAnalysis.duplicateReasons,
          suggestions: duplicateAnalysis.suggestions
        } : null
      }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
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
 *               sku:
 *                 type: string
 *               barcode:
 *                 type: string
 *               brand_id:
 *                 type: string
 *                 format: uuid
 *               product_type:
 *                 type: string
 *               size:
 *                 type: string
 *               color:
 *                 type: string
 *               variant:
 *                 type: string
 *               price:
 *                 type: number
 *               cost_price:
 *                 type: number
 *               currency:
 *                 type: string
 *               stock_quantity:
 *                 type: integer
 *               min_stock_level:
 *                 type: integer
 *               max_stock_level:
 *                 type: integer
 *               unit:
 *                 type: string
 *               weight:
 *                 type: number
 *               dimensions:
 *                 type: string
 *               image_url:
 *                 type: string
 *               category_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               attributes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     attribute_id:
 *                       type: string
 *                       format: uuid
 *                     value:
 *                       type: string
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.put('/:id', auth, [
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('sku').optional().trim(),
  body('barcode').optional().trim(),
  body('brand_id').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Invalid brand_id format'),
  body('category_id').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Invalid category_id format'),
  body('category_ids').optional().isArray().withMessage('category_ids must be an array'),
  body('category_ids.*').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Invalid category_id format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, sku, barcode, brand_id, product_type, size, color, variant,
      price, cost_price, stock_quantity, min_stock_level, max_stock_level,
      unit, weight, dimensions, image_url, category_id, category_ids, attributes } = req.body;

    // Force currency to be RWF
    const currency = 'RWF';

    // Check if product exists
    const existingProduct = await database.get('SELECT id FROM products WHERE id = ?', [id]);
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Enforce SKU uniqueness on update if provided
    if (sku && sku.trim() !== '') {
      const duplicateSku = await database.get('SELECT id FROM products WHERE sku = ? AND id <> ?', [sku, id]);
      if (duplicateSku) {
        return res.status(400).json({ error: 'SKU already exists' });
      }
    }

    // Update product
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
    if (sku !== undefined) {
      updateFields.push('sku = ?');
      params.push(sku);
    }
    if (barcode !== undefined) {
      updateFields.push('barcode = ?');
      params.push(barcode);
    }
    if (brand_id !== undefined) {
      updateFields.push('brand_id = ?');
      params.push(brand_id);
    }
    if (category_id !== undefined) {
      updateFields.push('category_id = ?');
      params.push(category_id);
    }
    if (product_type !== undefined) {
      updateFields.push('product_type = ?');
      params.push(product_type);
    }
    if (size !== undefined) {
      updateFields.push('size = ?');
      params.push(size);
    }
    if (color !== undefined) {
      updateFields.push('color = ?');
      params.push(color);
    }
    if (variant !== undefined) {
      updateFields.push('variant = ?');
      params.push(variant);
    }
    if (price !== undefined) {
      updateFields.push('price = ?');
      params.push(price);
    }
    if (cost_price !== undefined) {
      updateFields.push('cost_price = ?');
      params.push(cost_price);
    }
    if (currency !== undefined) {
      updateFields.push('currency = ?');
      params.push(currency);
    }
    if (stock_quantity !== undefined) {
      updateFields.push('stock_quantity = ?');
      params.push(stock_quantity);
    }
    if (min_stock_level !== undefined) {
      updateFields.push('min_stock_level = ?');
      params.push(min_stock_level);
    }
    if (max_stock_level !== undefined) {
      updateFields.push('max_stock_level = ?');
      params.push(max_stock_level);
    }
    if (unit !== undefined) {
      updateFields.push('unit = ?');
      params.push(unit);
    }
    if (weight !== undefined) {
      updateFields.push('weight = ?');
      params.push(weight);
    }
    if (dimensions !== undefined) {
      updateFields.push('dimensions = ?');
      params.push(dimensions);
    }
    if (image_url !== undefined) {
      updateFields.push('image_url = ?');
      params.push(image_url);
    }

    updateFields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    const query = `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`;
    await database.run(query, params);

    // Handle category updates - frontend sends 'categories' array, but we use single category_id
    if (req.body.categories !== undefined) {
      const categories = req.body.categories;
      let finalCategoryId = '00000000-0000-0000-0000-000000000001'; // Default to Uncategorized

      if (categories && categories.length > 0) {
        // Use the first selected category
        finalCategoryId = categories[0];
      }

      // Update the category_id in the products table
      await database.run('UPDATE products SET category_id = ? WHERE id = ?', [finalCategoryId, id]);
    }

    // Update attributes if provided
    if (attributes !== undefined) {
      // Remove existing attributes
      await database.run('DELETE FROM product_attribute_values WHERE product_id = ?', [id]);

      // Add new attributes
      for (const attr of attributes) {
        if (attr.attribute_id && attr.value !== undefined) {
          await database.run(`
            INSERT INTO product_attribute_values (id, product_id, attribute_id, value)
            VALUES (?, ?, ?, ?)
          `, [uuidv4(), id, attr.attribute_id, attr.value]);
        }
      }
    }

    // Get updated product with all relationships
    const product = await database.get(`
      SELECT 
        p.*,
        b.name as brand_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.id = ?
    `, [id]);

    // Get categories using the new direct category_id approach
    const categories = [];
    if (product.category_id) {
      const category = await database.get(`
        SELECT 
          id,
          id as category_id,
          1 as is_primary,
          name as category_name,
          level as category_level,
          path as category_path
        FROM categories
        WHERE id = ? AND deleted_at IS NULL
      `, [product.category_id]);

      if (category) {
        categories.push(category);
      }
    }

    // Get attributes
    const productAttributes = await database.all(`
      SELECT 
        pav.id,
        pav.attribute_id,
        pav.value,
        ca.name as attribute_name,
        ca.type as attribute_type,
        ca.is_required
      FROM product_attribute_values pav
      JOIN category_attributes ca ON pav.attribute_id = ca.id
      WHERE pav.product_id = ? AND ca.is_active = true
      ORDER BY ca.sort_order, ca.name
    `, [id]);

    // Get images
    const images = await database.all(`
      SELECT id, image_url, alt_text, is_primary, sort_order
      FROM product_images
      WHERE product_id = ?
      ORDER BY is_primary DESC, sort_order, created_at
    `, [id]);

    res.json({
      success: true,
      product: {
        ...product,
        categories,
        attributes: productAttributes,
        images
      }
    });
  } catch (error) {
    console.error('Update product error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Update product barcode
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               barcode:
 *                 type: string
 *                 description: New barcode value
 *     responses:
 *       200:
 *         description: Product barcode updated successfully
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
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.patch('/:id', auth, [
  body('barcode').optional().trim().isLength({ min: 1 }).withMessage('Barcode cannot be empty if provided')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { barcode } = req.body;

    const product = await database.get('SELECT id FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update barcode
    await database.run('UPDATE products SET barcode = ?, updated_at = ? WHERE id = ?', [barcode, new Date().toISOString(), id]);

    res.json({
      success: true,
      message: 'Product barcode updated successfully'
    });
  } catch (error) {
    console.error('Update product barcode error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product (soft delete)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
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
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await database.get('SELECT id FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Soft delete product
    await database.run('UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?', [new Date().toISOString(), id]);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/products/{productId}/status:
 *   patch:
 *     summary: Update product status
 *     description: Toggle product active/inactive status
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: New active status
 *     responses:
 *       200:
 *         description: Product status updated successfully
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:productId/status', auth, [
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId } = req.params;
    const { isActive } = req.body;

    // Check if product exists
    const product = await database.get('SELECT id FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update product status
    await database.run(
      'UPDATE products SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [isActive, productId]
    );

    res.json({
      success: true,
      message: `Product ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Update product status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/products/{productId}/duplicate:
 *   post:
 *     summary: Duplicate a product
 *     description: Create a copy of an existing product with a new ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID to duplicate
 *     responses:
 *       201:
 *         description: Product duplicated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:productId/duplicate', auth, async (req, res) => {
  try {
    const { productId } = req.params;

    // Get original product
    const originalProduct = await database.get('SELECT * FROM products WHERE id = ?', [productId]);
    if (!originalProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Create new product ID
    const newProductId = uuidv4();
    const now = new Date().toISOString();

    // Generate new SKU and barcode
    const newSku = `${originalProduct.sku}-COPY-${Date.now()}`;
    const newBarcode = originalProduct.barcode ? `${originalProduct.barcode}-COPY` : null;

    // Insert duplicated product
    await database.run(`
      INSERT INTO products (
        id, name, description, sku, barcode, brand_id, product_type, size, color, variant,
        price, cost_price, currency, stock_quantity, min_stock_level, max_stock_level,
        unit, weight, dimensions, image_url, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newProductId,
      `${originalProduct.name} (Copy)`,
      originalProduct.description,
      newSku,
      newBarcode,
      originalProduct.brand_id,
      originalProduct.product_type,
      originalProduct.size,
      originalProduct.color,
      originalProduct.variant,
      originalProduct.price,
      originalProduct.cost_price,
      originalProduct.currency,
      0, // Reset stock quantity for new product
      originalProduct.min_stock_level,
      originalProduct.max_stock_level,
      originalProduct.unit,
      originalProduct.weight,
      originalProduct.dimensions,
      originalProduct.image_url,
      false, // Set as inactive by default
      now,
      now
    ]);

    // Get the created product
    const duplicatedProduct = await database.get('SELECT * FROM products WHERE id = ?', [newProductId]);

    res.status(201).json({
      success: true,
      product: duplicatedProduct,
      message: 'Product duplicated successfully'
    });
  } catch (error) {
    console.error('Duplicate product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/products/assign-all-to-shop:
 *   post:
 *     summary: Assign all products to a shop
 *     description: Assign all active products to a specific shop with optional default quantity and stock levels
 *     tags: [Products]
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
 *                 format: uuid
 *                 description: Shop ID to assign products to
 *               default_quantity:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *                 description: Default quantity to assign (0 means use product's current stock)
 *               min_stock_level:
 *                 type: integer
 *                 minimum: 0
 *                 default: 10
 *                 description: Default minimum stock level
 *               max_stock_level:
 *                 type: integer
 *                 minimum: 0
 *                 default: 100
 *                 description: Default maximum stock level
 *               update_existing:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to update existing assignments
 *     responses:
 *       200:
 *         description: Products assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total_products:
 *                       type: integer
 *                     assigned:
 *                       type: integer
 *                     updated:
 *                       type: integer
 *                     skipped:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post('/assign-all-to-shop', auth, [
  body('shop_id').isUUID().withMessage('Invalid shop ID format'),
  body('default_quantity').optional().isInt({ min: 0 }).withMessage('Default quantity must be a non-negative integer'),
  body('min_stock_level').optional().isInt({ min: 0 }).withMessage('Min stock level must be a non-negative integer'),
  body('max_stock_level').optional().isInt({ min: 0 }).withMessage('Max stock level must be a non-negative integer'),
  body('update_existing').optional().isBoolean().withMessage('Update existing must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Only admin can assign all products
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin users can assign all products to shops' });
    }

    const {
      shop_id,
      default_quantity = 0,
      min_stock_level = 10,
      max_stock_level = 100,
      update_existing = false
    } = req.body;

    // Validate shop exists
    const shop = await database.get('SELECT id, name FROM shops WHERE id = ? AND is_active = 1', [shop_id]);
    if (!shop) {
      return res.status(400).json({ error: 'Shop not found or inactive' });
    }

    // Get all active products
    const allProducts = await database.all(
      'SELECT id, name, sku, stock_quantity, COALESCE(stock_quantity, 0) as current_stock FROM products WHERE is_active = 1'
    );

    if (!allProducts || allProducts.length === 0) {
      return res.status(400).json({ error: 'No active products found' });
    }

    // Get existing assignments for this shop
    const existingAssignments = await database.all(
      'SELECT product_id, quantity FROM shop_inventory WHERE shop_id = ?',
      [shop_id]
    );
    const existingMap = new Map(existingAssignments.map(a => [a.product_id, a.quantity]));

    // Statistics
    let assigned = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors_list = [];

    // Process products in batches for better performance
    const batchSize = 50;
    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);

      for (const product of batch) {
        try {
          const productId = product.id;
          const hasExisting = existingMap.has(productId);

          // Skip if exists and update_existing is false
          if (hasExisting && !update_existing) {
            skipped++;
            continue;
          }

          // Determine quantity to assign
          let quantity = default_quantity;
          if (quantity === 0) {
            // Use product's current stock if default_quantity is 0
            quantity = Math.max(0, product.current_stock || 0);
          }

          // Calculate available stock for this product
          const shopAssignments = await database.get(
            'SELECT COALESCE(SUM(quantity), 0) as total FROM shop_inventory WHERE product_id = ?',
            [productId]
          );
          const warehouseAssignments = await database.get(
            'SELECT COALESCE(SUM(quantity), 0) as total FROM warehouse_inventory WHERE product_id = ?',
            [productId]
          );

          const totalAssigned = (shopAssignments?.total || 0) + (warehouseAssignments?.total || 0);
          const availableStock = product.current_stock - totalAssigned;

          // If updating existing, adjust for current assignment
          if (hasExisting && update_existing) {
            const currentAssignment = existingMap.get(productId);
            availableStock += currentAssignment; // Add back the currently assigned quantity
          }

          // Cap quantity to available stock if needed
          if (quantity > availableStock && availableStock >= 0) {
            quantity = Math.max(0, availableStock);
          }

          if (hasExisting && update_existing) {
            // Update existing assignment
            await database.run(
              `UPDATE shop_inventory SET 
                quantity = ?, 
                min_stock_level = ?, 
                max_stock_level = ?, 
                last_updated = CURRENT_TIMESTAMP 
               WHERE shop_id = ? AND product_id = ?`,
              [quantity, min_stock_level, max_stock_level, shop_id, productId]
            );
            updated++;
          } else if (!hasExisting) {
            // Create new assignment
            const assignmentId = uuidv4();
            await database.run(
              `INSERT INTO shop_inventory (id, shop_id, product_id, quantity, min_stock_level, max_stock_level) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [assignmentId, shop_id, productId, quantity, min_stock_level, max_stock_level]
            );
            assigned++;
          }
        } catch (error) {
          failed++;
          errors_list.push({
            product_id: product.id,
            product_name: product.name,
            error: error.message
          });
          console.error(`Error assigning product ${product.id}:`, error);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk assignment completed for ${shop.name}`,
      stats: {
        total_products: allProducts.length,
        assigned,
        updated,
        skipped,
        failed,
        errors: errors_list.slice(0, 10) // Limit error details
      }
    });
  } catch (error) {
    console.error('Assign all products to shop error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

/**
 * @swagger
 * /api/products/unassign-all-from-shop:
 *   post:
 *     summary: Unassign all products from a shop
 *     description: Remove all product assignments from a specific shop
 *     tags: [Products]
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
 *                 format: uuid
 *                 description: Shop ID to unassign products from
 *     responses:
 *       200:
 *         description: Products unassigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total_unassigned:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post('/unassign-all-from-shop', auth, [
  body('shop_id').isUUID().withMessage('Invalid shop ID format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Only admin can unassign all products
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin users can unassign all products from shops' });
    }

    const { shop_id } = req.body;

    // Validate shop exists
    const shop = await database.get('SELECT id, name FROM shops WHERE id = ? AND is_active = 1', [shop_id]);
    if (!shop) {
      return res.status(400).json({ error: 'Shop not found or inactive' });
    }

    // Get all assignments for this shop
    const assignments = await database.all(
      'SELECT id, product_id, quantity FROM shop_inventory WHERE shop_id = ?',
      [shop_id]
    );

    if (!assignments || assignments.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No products assigned to ${shop.name}`,
        stats: {
          total_unassigned: 0,
          failed: 0
        }
      });
    }

    // Statistics
    let unassigned = 0;
    let failed = 0;
    const errors_list = [];

    // Delete all assignments for this shop
    try {
      await database.run('DELETE FROM shop_inventory WHERE shop_id = ?', [shop_id]);
      unassigned = assignments.length;
    } catch (error) {
      console.error('Error unassigning products:', error);
      failed = assignments.length;
      errors_list.push({
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      message: `Bulk unassignment completed for ${shop.name}`,
      stats: {
        total_unassigned: unassigned,
        failed,
        errors: errors_list.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Unassign all products from shop error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

module.exports = router; 