const { v4: uuidv4 } = require('uuid');
const database = require('../database/database');

class ProcurementService {
  /**
   * Generate unique numbers for various documents
   */
  generateRequisitionNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `REQ${year}${month}${day}-${random}`;
  }

  generatePONumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO${year}${month}${day}-${random}`;
  }

  generateGRNNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `GRN${year}${month}${day}-${random}`;
  }

  /**
   * Supplier Management
   */
  async createSupplier(supplierData) {
    try {
      const {
        name, contact_person, email, phone, address, city, state, country,
        postal_code, tax_id, payment_terms, credit_limit, supplier_category, notes
      } = supplierData;

      const supplierId = uuidv4();
      await database.run(`
        INSERT INTO suppliers (
          id, name, contact_person, email, phone, address, city, state, country,
          postal_code, tax_id, payment_terms, credit_limit, supplier_category, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        supplierId, name, contact_person, email, phone, address, city, state, country,
        postal_code, tax_id, payment_terms, credit_limit, supplier_category, notes
      ]);

      return { id: supplierId, name };
    } catch (error) {
      console.error('Create supplier error:', error);
      throw error;
    }
  }

  async getSuppliers(filters = {}) {
    try {
      let query = `
        SELECT s.*, 
               COUNT(DISTINCT sm.material_id) as materials_count,
               COUNT(DISTINCT po.id) as total_orders,
               AVG(sp.overall_rating) as avg_rating
        FROM suppliers s
        LEFT JOIN supplier_materials sm ON s.id = sm.supplier_id
        LEFT JOIN purchase_orders po ON s.id = po.supplier_id
        LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
        WHERE s.is_active = true
      `;

      const params = [];
      if (filters.category) {
        query += ' AND s.supplier_category = ?';
        params.push(filters.category);
      }
      if (filters.is_approved !== undefined) {
        query += ' AND s.is_approved = ?';
        params.push(filters.is_approved);
      }

      query += ' GROUP BY s.id ORDER BY s.name';

      const suppliers = await database.all(query, params);
      return suppliers;
    } catch (error) {
      console.error('Get suppliers error:', error);
      throw error;
    }
  }

  async addSupplierMaterial(supplierMaterialData) {
    try {
      const {
        supplier_id, material_id, supplier_material_code, lead_time_days,
        minimum_order_quantity, standard_cost, bulk_discount_percentage
      } = supplierMaterialData;

      const supplierMaterialId = uuidv4();
      await database.run(`
        INSERT INTO supplier_materials (
          id, supplier_id, material_id, supplier_material_code, lead_time_days,
          minimum_order_quantity, standard_cost, bulk_discount_percentage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        supplierMaterialId, supplier_id, material_id, supplier_material_code,
        lead_time_days, minimum_order_quantity, standard_cost, bulk_discount_percentage
      ]);

      return { id: supplierMaterialId };
    } catch (error) {
      console.error('Add supplier material error:', error);
      throw error;
    }
  }

  async getSupplierMaterials(filters = {}) {
    try {
      let query = `
        SELECT sm.*, 
               s.name as supplier_name,
               s.email as supplier_email,
               rm.name as material_name,
               rm.type as material_category,
               rm.unit as unit_of_measure
        FROM supplier_materials sm
        LEFT JOIN suppliers s ON sm.supplier_id = s.id
        LEFT JOIN raw_materials rm ON sm.material_id = rm.id
        WHERE 1=1
      `;

      const params = [];
      if (filters.supplier_id) {
        query += ' AND sm.supplier_id = ?';
        params.push(filters.supplier_id);
      }
      if (filters.material_id) {
        query += ' AND sm.material_id = ?';
        params.push(filters.material_id);
      }

      query += ' ORDER BY s.name, rm.name';

      const supplierMaterials = await database.all(query, params);
      return supplierMaterials;
    } catch (error) {
      console.error('Get supplier materials error:', error);
      throw error;
    }
  }

  /**
   * Purchase Requisition Management
   */
  async createPurchaseRequisition(requisitionData) {
    try {
      const {
        title, description, priority, requested_by, items, notes
      } = requisitionData;

      await database.run('BEGIN TRANSACTION');

      // Create requisition
      const requisitionId = uuidv4();
      const requisitionNumber = this.generateRequisitionNumber();
      
      await database.run(`
        INSERT INTO purchase_requisitions (
          id, requisition_number, title, description, priority, requested_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [requisitionId, requisitionNumber, title, description, priority, requested_by, notes]);

      // Add requisition items
      let totalEstimatedCost = 0;
      for (const item of items) {
        const itemId = uuidv4();
        const totalCost = item.quantity_required * (item.estimated_unit_cost || 0);
        totalEstimatedCost += totalCost;

        await database.run(`
          INSERT INTO purchase_requisition_items (
            id, requisition_id, material_id, quantity_required, estimated_unit_cost,
            total_estimated_cost, urgency, required_by_date, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId, requisitionId, item.material_id, item.quantity_required,
          item.estimated_unit_cost, totalCost, item.urgency, item.required_by_date, item.notes
        ]);
      }

      // Update total estimated cost
      await database.run(`
        UPDATE purchase_requisitions 
        SET total_estimated_cost = ? 
        WHERE id = ?
      `, [totalEstimatedCost, requisitionId]);

      await database.run('COMMIT');

      return {
        id: requisitionId,
        requisition_number: requisitionNumber,
        total_estimated_cost: totalEstimatedCost
      };
    } catch (error) {
      await database.run('ROLLBACK');
      console.error('Create purchase requisition error:', error);
      throw error;
    }
  }

  async getPurchaseRequisitions(filters = {}) {
    try {
      let query = `
        SELECT pr.*, 
               u.first_name, u.last_name,
               COUNT(pri.id) as items_count,
               SUM(pri.quantity_required) as total_quantity
        FROM purchase_requisitions pr
        JOIN users u ON pr.requested_by = u.id
        LEFT JOIN purchase_requisition_items pri ON pr.id = pri.requisition_id
        WHERE 1=1
      `;

      const params = [];
      if (filters.status) {
        query += ' AND pr.status = ?';
        params.push(filters.status);
      }
      if (filters.requested_by) {
        query += ' AND pr.requested_by = ?';
        params.push(filters.requested_by);
      }

      query += ' GROUP BY pr.id, u.first_name, u.last_name ORDER BY pr.created_at DESC';

      const requisitions = await database.all(query, params);
      return requisitions;
    } catch (error) {
      console.error('Get purchase requisitions error:', error);
      throw error;
    }
  }

  async approveRequisition(requisitionId, approvedBy) {
    try {
      await database.run(`
        UPDATE purchase_requisitions 
        SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [approvedBy, requisitionId]);

      return { success: true };
    } catch (error) {
      console.error('Approve requisition error:', error);
      throw error;
    }
  }

  /**
   * Purchase Order Management
   */
  async createPurchaseOrder(purchaseOrderData) {
    try {
      const {
        supplier_id, requisition_id, order_date, expected_delivery_date,
        items, shipping_cost, tax_amount, discount_amount, payment_terms,
        shipping_address, notes, created_by
      } = purchaseOrderData;

      await database.run('BEGIN TRANSACTION');

      // Create purchase order
      const purchaseOrderId = uuidv4();
      const poNumber = this.generatePONumber();
      
      let subtotal = 0;
      for (const item of items) {
        subtotal += item.quantity_ordered * item.unit_cost;
      }

      const totalAmount = subtotal + (shipping_cost || 0) + (tax_amount || 0) - (discount_amount || 0);

      await database.run(`
        INSERT INTO purchase_orders (
          id, po_number, supplier_id, requisition_id, order_date, expected_delivery_date,
          subtotal, tax_amount, shipping_cost, discount_amount, total_amount,
          payment_terms, shipping_address, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        purchaseOrderId, poNumber, supplier_id, requisition_id, order_date, expected_delivery_date,
        subtotal, tax_amount, shipping_cost, discount_amount, totalAmount,
        payment_terms, shipping_address, notes, created_by
      ]);

      // Add purchase order items
      for (const item of items) {
        const itemId = uuidv4();
        const totalCost = item.quantity_ordered * item.unit_cost;

        await database.run(`
          INSERT INTO purchase_order_items (
            id, purchase_order_id, material_id, supplier_material_id, quantity_ordered,
            unit_cost, total_cost, expected_delivery_date, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId, purchaseOrderId, item.material_id, item.supplier_material_id,
          item.quantity_ordered, item.unit_cost, totalCost, item.expected_delivery_date, item.notes
        ]);
      }

      // Update requisition status if linked
      if (requisition_id) {
        await database.run(`
          UPDATE purchase_requisitions 
          SET status = 'ordered' 
          WHERE id = ?
        `, [requisition_id]);
      }

      await database.run('COMMIT');

      return {
        id: purchaseOrderId,
        po_number: poNumber,
        total_amount: totalAmount
      };
    } catch (error) {
      await database.run('ROLLBACK');
      console.error('Create purchase order error:', error);
      throw error;
    }
  }

  async getPurchaseOrders(filters = {}) {
    try {
      let query = `
        SELECT po.*, 
               s.name as supplier_name,
               u.first_name, u.last_name,
               COUNT(poi.id) as items_count,
               SUM(poi.quantity_ordered) as total_quantity,
               SUM(poi.quantity_received) as total_received
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        JOIN users u ON po.created_by = u.id
        LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
        WHERE 1=1
      `;

      const params = [];
      if (filters.status) {
        query += ' AND po.status = ?';
        params.push(filters.status);
      }
      if (filters.supplier_id) {
        query += ' AND po.supplier_id = ?';
        params.push(filters.supplier_id);
      }

      query += ' GROUP BY po.id, s.name, u.first_name, u.last_name ORDER BY po.created_at DESC';

      const purchaseOrders = await database.all(query, params);
      return purchaseOrders;
    } catch (error) {
      console.error('Get purchase orders error:', error);
      throw error;
    }
  }

  /**
   * Goods Receipt Management
   */
  async createGoodsReceipt(goodsReceiptData) {
    try {
      const {
        purchase_order_id, delivery_date, received_by, items, notes
      } = goodsReceiptData;

      await database.run('BEGIN TRANSACTION');

      // Create goods receipt note
      const grnId = uuidv4();
      const grnNumber = this.generateGRNNumber();
      
      let totalItems = 0;
      let totalQuantity = 0;
      let totalValue = 0;

      for (const item of items) {
        totalItems++;
        totalQuantity += item.quantity_received;
        totalValue += item.quantity_received * item.unit_cost;
      }

      await database.run(`
        INSERT INTO goods_receipt_notes (
          id, grn_number, purchase_order_id, delivery_date, received_by,
          total_items, total_quantity, total_value, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        grnId, grnNumber, purchase_order_id, delivery_date, received_by,
        totalItems, totalQuantity, totalValue, notes
      ]);

      // Add goods receipt items
      for (const item of items) {
        const itemId = uuidv4();
        const totalValue = item.quantity_received * item.unit_cost;

        await database.run(`
          INSERT INTO goods_receipt_items (
            id, grn_id, purchase_order_item_id, material_id, quantity_received,
            unit_cost, total_value, batch_number, expiry_date, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId, grnId, item.purchase_order_item_id, item.material_id,
          item.quantity_received, item.unit_cost, totalValue,
          item.batch_number, item.expiry_date, item.notes
        ]);

        // Update purchase order item received quantity
        await database.run(`
          UPDATE purchase_order_items 
          SET quantity_received = quantity_received + ?
          WHERE id = ?
        `, [item.quantity_received, item.purchase_order_item_id]);
      }

      await database.run('COMMIT');

      return {
        id: grnId,
        grn_number: grnNumber,
        total_items: totalItems,
        total_quantity: totalQuantity,
        total_value: totalValue
      };
    } catch (error) {
      await database.run('ROLLBACK');
      console.error('Create goods receipt error:', error);
      throw error;
    }
  }

  /**
   * Quality Control Management
   */
  async performQualityInspection(inspectionData) {
    try {
      const {
        grn_item_id, inspector_id, inspection_type, visual_inspection,
        functional_test, lab_test, test_results, defects_found,
        corrective_actions, notes
      } = inspectionData;

      const inspectionId = uuidv4();
      const isApproved = !defects_found || defects_found.trim() === '';

      await database.run(`
        INSERT INTO quality_inspections (
          id, grn_item_id, inspector_id, inspection_date, inspection_type,
          visual_inspection, functional_test, lab_test, test_results,
          compliance_status, defects_found, corrective_actions, is_approved, notes
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        inspectionId, grn_item_id, inspector_id, inspection_type,
        visual_inspection, functional_test, lab_test, test_results,
        isApproved ? 'compliant' : 'non_compliant', defects_found,
        corrective_actions, isApproved, notes
      ]);

      // Update goods receipt item quality status
      await database.run(`
        UPDATE goods_receipt_items 
        SET quality_status = ?
        WHERE id = ?
      `, [isApproved ? 'approved' : 'rejected', grn_item_id]);

      return {
        id: inspectionId,
        is_approved: isApproved,
        compliance_status: isApproved ? 'compliant' : 'non_compliant'
      };
    } catch (error) {
      console.error('Perform quality inspection error:', error);
      throw error;
    }
  }

  /**
   * Supplier Performance Tracking
   */
  async evaluateSupplierPerformance(evaluationData) {
    try {
      const {
        supplier_id, evaluation_period, delivery_on_time_rate,
        quality_acceptance_rate, price_competitiveness, communication_rating,
        issues_count, improvement_areas, recommendations, evaluated_by
      } = evaluationData;

      const evaluationId = uuidv4();
      const overallRating = (
        delivery_on_time_rate * 0.3 +
        quality_acceptance_rate * 0.3 +
        price_competitiveness * 0.2 +
        communication_rating * 0.2
      );

      await database.run(`
        INSERT INTO supplier_performance (
          id, supplier_id, evaluation_period, delivery_on_time_rate,
          quality_acceptance_rate, price_competitiveness, communication_rating,
          overall_rating, issues_count, improvement_areas, recommendations,
          evaluated_by, evaluation_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'))
      `, [
        evaluationId, supplier_id, evaluation_period, delivery_on_time_rate,
        quality_acceptance_rate, price_competitiveness, communication_rating,
        overallRating, issues_count, improvement_areas, recommendations,
        evaluated_by
      ]);

      // Update supplier rating
      await database.run(`
        UPDATE suppliers 
        SET rating = (
          SELECT AVG(overall_rating) 
          FROM supplier_performance 
          WHERE supplier_id = ?
        )
        WHERE id = ?
      `, [supplier_id, supplier_id]);

      return {
        id: evaluationId,
        overall_rating: overallRating
      };
    } catch (error) {
      console.error('Evaluate supplier performance error:', error);
      throw error;
    }
  }

  /**
   * Procurement Analytics and Insights
   */
  async getProcurementAnalytics(period = '30') {
    try {
      // Overall procurement statistics
      const overallStats = await database.get(`
        SELECT 
          COUNT(DISTINCT po.id) as total_orders,
          COUNT(DISTINCT po.supplier_id) as active_suppliers,
          SUM(po.total_amount) as total_spend,
          AVG(po.total_amount) as avg_order_value,
          (SELECT COUNT(*) FROM purchase_requisitions WHERE created_at >= NOW() - INTERVAL '${period} days') as total_requisitions,
          COUNT(DISTINCT grn.id) as total_receipts
        FROM purchase_orders po
        LEFT JOIN goods_receipts grn ON po.id = grn.purchase_order_id
        WHERE po.created_at >= NOW() - INTERVAL '${period} days'
      `);

      // Top suppliers by spend
      const topSuppliers = await database.all(`
        SELECT 
          s.name as supplier_name,
          COUNT(po.id) as order_count,
          SUM(po.total_amount) as total_spend,
          AVG(po.total_amount) as avg_order_value,
          'N/A' as rating
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.created_at >= NOW() - INTERVAL '${period} days'
        GROUP BY s.id, s.name
        ORDER BY total_spend DESC
        LIMIT 10
      `);

      // Material spend analysis
      const materialSpend = await database.all(`
        SELECT 
          rm.name as material_name,
          rm.type as material_type,
          SUM(poi.total_cost) as total_spend,
          SUM(poi.quantity_ordered) as total_quantity,
          AVG(poi.unit_cost) as avg_unit_cost,
          COUNT(DISTINCT po.id) as order_count
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        JOIN raw_materials rm ON poi.material_id = rm.id
        WHERE po.created_at >= NOW() - INTERVAL '${period} days'
        GROUP BY rm.id
        ORDER BY total_spend DESC
        LIMIT 15
      `);

      // Quality metrics (simplified - no quality_inspections table)
      const qualityMetrics = [{
        total_inspections: 0,
        approved_inspections: 0,
        rejected_inspections: 0,
        acceptance_rate: 0
      }];

      // Delivery performance
      const deliveryPerformance = await database.all(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN grn.receipt_date <= po.expected_delivery_date THEN 1 ELSE 0 END) as on_time_deliveries,
          (SUM(CASE WHEN grn.receipt_date <= po.expected_delivery_date THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as on_time_rate
        FROM goods_receipts grn
        JOIN purchase_orders po ON grn.purchase_order_id = po.id
        WHERE grn.created_at >= NOW() - INTERVAL '${period} days'
      `);

      return {
        overall_stats: overallStats,
        top_suppliers: topSuppliers,
        material_spend: materialSpend,
        quality_metrics: qualityMetrics[0] || {},
        delivery_performance: deliveryPerformance[0] || {}
      };
    } catch (error) {
      console.error('Get procurement analytics error:', error);
      throw error;
    }
  }

  /**
   * Inventory Reorder Suggestions
   */
  async getReorderSuggestions() {
    try {
      const suggestions = await database.all(`
        SELECT 
          rm.id,
          rm.name,
          rm.type,
          rm.current_stock,
          rm.reorder_point,
          rm.min_stock_level,
          rm.unit,
          rm.cost_per_unit,
          (rm.reorder_point - rm.current_stock) as suggested_quantity,
          s.name as preferred_supplier,
          sm.lead_time_days,
          sm.minimum_order_quantity,
          sm.standard_cost as supplier_cost
        FROM raw_materials rm
        LEFT JOIN supplier_materials sm ON rm.id = sm.material_id AND sm.is_preferred = true
        LEFT JOIN suppliers s ON sm.supplier_id = s.id
        WHERE rm.current_stock <= rm.reorder_point 
          AND rm.is_active = true
        ORDER BY (rm.reorder_point - rm.current_stock) DESC
      `);

      return suggestions;
    } catch (error) {
      console.error('Get reorder suggestions error:', error);
      throw error;
    }
  }
}

module.exports = new ProcurementService(); 