const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { auth, adminAuth, managerAuth } = require('../middleware/auth');
const procurementService = require('../services/procurementService');

const router = express.Router();

/**
 * @swagger
 * /procurement/suppliers:
 *   get:
 *     summary: Get all suppliers
 *     description: Retrieve a list of all suppliers with performance metrics
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by supplier category
 *       - in: query
 *         name: is_approved
 *         schema:
 *           type: boolean
 *         description: Filter by approval status
 */
router.get('/suppliers', auth, async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      is_approved: req.query.is_approved !== undefined ? req.query.is_approved === 'true' : undefined
    };

    const suppliers = await procurementService.getSuppliers(filters);
    res.json({ suppliers });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /procurement/suppliers:
 *   post:
 *     summary: Add new supplier
 *     description: Add a new supplier to the system
 *     tags: [Procurement]
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
 *               - contact_person
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *               contact_person:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               postal_code:
 *                 type: string
 *               tax_id:
 *                 type: string
 *               payment_terms:
 *                 type: string
 *               credit_limit:
 *                 type: number
 *               supplier_category:
 *                 type: string
 *               notes:
 *                 type: string
 */
router.post('/suppliers', adminAuth, [
  body('name').trim().notEmpty().withMessage('Supplier name is required'),
  body('contact_person').trim().notEmpty().withMessage('Contact person is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
  body('credit_limit').optional().isFloat({ min: 0 }).withMessage('Valid credit limit is required'),
  body('payment_terms').optional().isIn(['Net 15', 'Net 30', 'Net 45', 'Net 60']).withMessage('Valid payment terms required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const supplier = await procurementService.createSupplier(req.body);
    res.status(201).json({ supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /procurement/supplier-materials:
 *   get:
 *     summary: Get supplier materials
 *     description: Retrieve all supplier materials with filtering options
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: supplier_id
 *         schema:
 *           type: string
 *         description: Filter by supplier ID
 *       - in: query
 *         name: material_id
 *         schema:
 *           type: string
 *         description: Filter by material ID
 */
router.get('/supplier-materials', auth, async (req, res) => {
  try {
    const filters = {
      supplier_id: req.query.supplier_id,
      material_id: req.query.material_id
    };

    const supplierMaterials = await procurementService.getSupplierMaterials(filters);
    res.json({ supplier_materials: supplierMaterials });
  } catch (error) {
    console.error('Get supplier materials error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /procurement/supplier-materials:
 *   post:
 *     summary: Add supplier material
 *     description: Add a material that a supplier provides
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 */
router.post('/supplier-materials', adminAuth, [
  body('supplier_id').notEmpty().withMessage('Supplier ID is required'),
  body('material_id').notEmpty().withMessage('Material ID is required'),
  body('standard_cost').isFloat({ min: 0 }).withMessage('Valid standard cost is required'),
  body('lead_time_days').optional().isInt({ min: 1 }).withMessage('Valid lead time is required'),
  body('minimum_order_quantity').optional().isFloat({ min: 0 }).withMessage('Valid minimum order quantity is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const supplierMaterial = await procurementService.addSupplierMaterial(req.body);
    res.status(201).json({ supplier_material: supplierMaterial });
  } catch (error) {
    console.error('Add supplier material error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /procurement/requisitions:
 *   get:
 *     summary: Get purchase requisitions
 *     description: Retrieve purchase requisitions with filtering options
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 */
router.get('/requisitions', auth, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      requested_by: req.query.requested_by
    };

    const requisitions = await procurementService.getPurchaseRequisitions(filters);
    res.json({ requisitions });
  } catch (error) {
    console.error('Get requisitions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /procurement/requisitions:
 *   post:
 *     summary: Create purchase requisition
 *     description: Create a new purchase requisition
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 */
router.post('/requisitions', auth, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('requested_by').notEmpty().withMessage('Requested by is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.material_id').notEmpty().withMessage('Material ID is required for each item'),
  body('items.*.quantity_required').isFloat({ min: 0.001 }).withMessage('Valid quantity is required for each item'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Valid priority is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const requisition = await procurementService.createPurchaseRequisition(req.body);
    res.status(201).json({ requisition });
  } catch (error) {
    console.error('Create requisition error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /procurement/requisitions/{id}/approve:
 *   post:
 *     summary: Approve purchase requisition
 *     description: Approve a purchase requisition
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 */
router.post('/requisitions/:id/approve', adminAuth, async (req, res) => {
  try {
    const result = await procurementService.approveRequisition(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Approve requisition error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /procurement/purchase-orders:
 *   get:
 *     summary: Get purchase orders
 *     description: Retrieve purchase orders with filtering options
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 */
router.get('/purchase-orders', auth, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      supplier_id: req.query.supplier_id
    };

    const purchaseOrders = await procurementService.getPurchaseOrders(filters);
    res.json({ purchase_orders: purchaseOrders });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /procurement/purchase-orders:
 *   post:
 *     summary: Create purchase order
 *     description: Create a new purchase order
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 */
router.post('/purchase-orders', adminAuth, [
  body('supplier_id').notEmpty().withMessage('Supplier ID is required'),
  body('order_date').isDate().withMessage('Valid order date is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.material_id').notEmpty().withMessage('Material ID is required for each item'),
  body('items.*.quantity_ordered').isFloat({ min: 0.001 }).withMessage('Valid quantity is required for each item'),
  body('items.*.unit_cost').isFloat({ min: 0 }).withMessage('Valid unit cost is required for each item'),
  body('total_amount').isFloat({ min: 0 }).withMessage('Valid total amount is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const purchaseOrder = await procurementService.createPurchaseOrder({
      ...req.body,
      created_by: req.user.id
    });
    res.status(201).json({ purchase_order: purchaseOrder });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /procurement/goods-receipts:
 *   post:
 *     summary: Create goods receipt
 *     description: Create a goods receipt note for received materials
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 */
router.post('/goods-receipts', auth, [
  body('purchase_order_id').notEmpty().withMessage('Purchase order ID is required'),
  body('delivery_date').isDate().withMessage('Valid delivery date is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.purchase_order_item_id').notEmpty().withMessage('Purchase order item ID is required'),
  body('items.*.material_id').notEmpty().withMessage('Material ID is required'),
  body('items.*.quantity_received').isFloat({ min: 0.001 }).withMessage('Valid quantity received is required'),
  body('items.*.unit_cost').isFloat({ min: 0 }).withMessage('Valid unit cost is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const goodsReceipt = await procurementService.createGoodsReceipt({
      ...req.body,
      received_by: req.user.id
    });
    res.status(201).json({ goods_receipt: goodsReceipt });
  } catch (error) {
    console.error('Create goods receipt error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /procurement/quality-inspections:
 *   post:
 *     summary: Perform quality inspection
 *     description: Perform quality inspection on received materials
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 */
router.post('/quality-inspections', auth, [
  body('grn_item_id').notEmpty().withMessage('GRN item ID is required'),
  body('inspection_type').isIn(['receiving', 'periodic', 'complaint']).withMessage('Valid inspection type is required'),
  body('visual_inspection').isBoolean().withMessage('Visual inspection status is required'),
  body('functional_test').optional().isBoolean().withMessage('Functional test status is required'),
  body('lab_test').optional().isBoolean().withMessage('Lab test status is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const inspection = await procurementService.performQualityInspection({
      ...req.body,
      inspector_id: req.user.id
    });
    res.status(201).json({ inspection });
  } catch (error) {
    console.error('Perform quality inspection error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /procurement/supplier-performance:
 *   post:
 *     summary: Evaluate supplier performance
 *     description: Evaluate and record supplier performance metrics
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 */
router.post('/supplier-performance', adminAuth, [
  body('supplier_id').notEmpty().withMessage('Supplier ID is required'),
  body('evaluation_period').notEmpty().withMessage('Evaluation period is required'),
  body('delivery_on_time_rate').isFloat({ min: 0, max: 100 }).withMessage('Valid delivery rate is required'),
  body('quality_acceptance_rate').isFloat({ min: 0, max: 100 }).withMessage('Valid quality rate is required'),
  body('price_competitiveness').isFloat({ min: 0, max: 100 }).withMessage('Valid price competitiveness is required'),
  body('communication_rating').isFloat({ min: 0, max: 100 }).withMessage('Valid communication rating is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const evaluation = await procurementService.evaluateSupplierPerformance({
      ...req.body,
      evaluated_by: req.user.id
    });
    res.status(201).json({ evaluation });
  } catch (error) {
    console.error('Evaluate supplier performance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /procurement/analytics:
 *   get:
 *     summary: Get procurement analytics
 *     description: Get comprehensive procurement analytics and insights
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: "30"
 *         description: Analysis period in days
 */
router.get('/analytics', auth, async (req, res) => {
  try {
    const period = req.query.period || '30';
    const analytics = await procurementService.getProcurementAnalytics(period);
    res.json(analytics);
  } catch (error) {
    console.error('Get procurement analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /procurement/reorder-suggestions:
 *   get:
 *     summary: Get reorder suggestions
 *     description: Get inventory reorder suggestions based on stock levels
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 */
router.get('/reorder-suggestions', auth, async (req, res) => {
  try {
    const suggestions = await procurementService.getReorderSuggestions();
    res.json({ suggestions });
  } catch (error) {
    console.error('Get reorder suggestions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /procurement/materials:
 *   get:
 *     summary: Get raw materials with procurement data
 *     description: Get raw materials with supplier and procurement information
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 */
router.get('/materials', auth, async (req, res) => {
  try {
    const materials = await database.all(`
      SELECT 
        rm.*,
        COUNT(DISTINCT sm.supplier_id) as supplier_count,
        AVG(sm.standard_cost) as avg_supplier_cost,
        MIN(sm.standard_cost) as min_supplier_cost,
        MAX(sm.lead_time_days) as max_lead_time
      FROM raw_materials rm
      LEFT JOIN supplier_materials sm ON rm.id = sm.material_id
      WHERE rm.is_active = 1
      GROUP BY rm.id
      ORDER BY rm.name
    `);

    res.json({ materials });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /procurement/materials/{id}/suppliers:
 *   get:
 *     summary: Get suppliers for a specific material
 *     description: Get all suppliers that provide a specific material
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 */
router.get('/materials/:id/suppliers', auth, async (req, res) => {
  try {
    const suppliers = await database.all(`
      SELECT 
        s.*,
        sm.supplier_material_code,
        sm.lead_time_days,
        sm.minimum_order_quantity,
        sm.standard_cost,
        sm.bulk_discount_percentage,
        sm.is_preferred,
        sm.last_order_date,
        sm.last_order_quantity,
        sm.last_order_cost
      FROM supplier_materials sm
      JOIN suppliers s ON sm.supplier_id = s.id
      WHERE sm.material_id = ? AND sm.is_active = 1
      ORDER BY sm.is_preferred DESC, sm.standard_cost ASC
    `, [req.params.id]);

    res.json({ suppliers });
  } catch (error) {
    console.error('Get material suppliers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 