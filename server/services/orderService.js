const database = require('../database/database');
const inventoryService = require('./inventoryService');
const PointsCalculator = require('./pointsCalculator');
const { v4: uuidv4 } = require('uuid');

class OrderService {

  /**
   * Create a new order with inventory validation
   */
  async createOrder(orderData, userId) {
    try {
      const {
        customer_id,
        items,
        payment_method,
        payment_status = 'complete',
        notes = '',
        amount_paid = 0,
        remaining_amount = 0,
        shop_id = null
      } = orderData;

      // Start transaction
      await database.run('BEGIN');

      // Get user's shop_id if not provided
      let userShopId = shop_id;
      if (!userShopId) {
        const user = await database.get('SELECT shop_id FROM users WHERE id = $1', [userId]);
        userShopId = user?.shop_id;
      }

      // Stock validation (check if products exist and have sufficient stock)
      for (const item of items) {
        if (item.is_atelier_item) {
          // If it's a service item, skip material/stock validation
          if (item.is_service) continue;

          // Atelier item (Raw Material)
          const material = await database.get(`
            SELECT id, name, cost_per_unit, current_stock FROM raw_materials WHERE id = $1
          `, [item.product_id]);

          if (!material) {
            throw new Error(`Material ${item.product_id} not found`);
          }

          if (material.current_stock < item.quantity) {
            throw new Error(`Insufficient stock for material ${material.name}. Available: ${material.current_stock}, Requested: ${item.quantity}`);
          }
        } else {
          // Regular Product
          const product = await database.get(`
            SELECT id, name, price, cost_price, stock_quantity FROM products WHERE id = $1
          `, [item.product_id]);

          if (!product) {
            throw new Error(`Product ${item.product_id} not found`);
          }

          // If user has a shop_id, check shop-specific inventory
          if (userShopId) {
            const shopInventory = await database.get(`
              SELECT quantity FROM shop_inventory 
              WHERE shop_id = $1 AND product_id = $2
            `, [userShopId, item.product_id]);

            if (!shopInventory) {
              throw new Error(`Product ${product.name} is not assigned to your shop`);
            }

            if (shopInventory.quantity < item.quantity) {
              throw new Error(`Insufficient shop stock for ${product.name}. Available: ${shopInventory.quantity}, Requested: ${item.quantity}`);
            }
          } else {
            // For admin users or users without shop, check global stock
            if (product.stock_quantity < item.quantity) {
              throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}`);
            }
          }
        }
      }

      // Create order
      const orderId = uuidv4();
      const orderNumber = `ORD-${Date.now()}`;

      // Calculate subtotal first
      let subtotal = 0;
      for (const item of items) {
        if (item.is_atelier_item) {
          // For atelier items, use the selling price provided or calculate from cost
          // Assuming selling price logic is handled by frontend or simple markup here
          // Ideally, should fetch price from somewhere. For now, trusting frontend or DB cost * markup

          let price = 0;
          if (item.is_service) {
            price = item.price || item.unit_price || 0;
          } else {
            const material = await database.get('SELECT cost_per_unit FROM raw_materials WHERE id = $1', [item.product_id]);
            // Use provided price or default markup
            price = item.unit_price || (material ? material.cost_per_unit * 1.5 : 0);
          }
          subtotal += price * item.quantity;
        } else {
          const product = await database.get(`
            SELECT price, cost_price FROM products WHERE id = $1
            `, [item.product_id]);
          subtotal += product.price * item.quantity;
        }
      }

      await database.run(`
        INSERT INTO orders (
          id, order_number, customer_id, shop_id, status, payment_status,
          payment_method, notes, created_by, created_at, subtotal, total_amount,
          amount_paid, remaining_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10, $11, $12, $13)
      `, [
        orderId, orderNumber, customer_id, userShopId,
        payment_status === 'pending' ? 'pending' : 'completed',
        payment_status, payment_method, notes, userId, subtotal, subtotal,
        amount_paid, remaining_amount
      ]);

      // Create order items
      for (const item of items) {
        let productIdToUse = item.product_id;
        let unitPrice = 0;

        if (item.is_atelier_item) {
          if (item.is_service) {
            // Handle Service Item (Labor Cost)
            unitPrice = item.price || item.unit_price;

            // Check if Service Product exists or create it
            const serviceSku = 'SERVICE-TAILORING';
            const existingService = await database.get("SELECT id FROM products WHERE sku = $1", [serviceSku]);

            if (existingService) {
              productIdToUse = existingService.id;
            } else {
              // Create Service Product
              productIdToUse = item.product_id; // Using the placeholder or generate new one
              // Actually better to generate a consistent one or use the placeholder if it's a valid UUID
              // Let's generate a new UUID if we are creating it, to be safe, unless placeholder is used
              if (productIdToUse === '00000000-0000-0000-0000-000000000000') {
                productIdToUse = uuidv4();
              }

              await database.run(`
                      INSERT INTO products (
                          id, name, sku, description, price, cost_price, 
                          category_id, stock_quantity, product_type, is_active
                      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                   `, [
                productIdToUse,
                item.name || 'Tailoring Service',
                serviceSku,
                'Custom Tailoring Labor Cost',
                unitPrice,
                0, // No cost price for labor? Or maybe hourly rate?
                null,
                0,
                'service',
                true
              ]);
            }
          } else {
            // Handle Material Item
            const material = await database.get('SELECT * FROM raw_materials WHERE id = $1', [item.product_id]);
            if (!material) throw new Error(`Material not found: ${item.product_id}`);

            unitPrice = item.unit_price || (material.cost_per_unit * 1.5);

            // Check if wrapper product exists
            const existingWrapper = await database.get(
              "SELECT id FROM products WHERE sku = $1",
              [`MAT-${material.id.substring(0, 8)}`]
            );

            if (existingWrapper) {
              productIdToUse = existingWrapper.id;
            } else {
              // Create wrapper product
              productIdToUse = uuidv4();
              await database.run(`
                        INSERT INTO products (
                            id, name, sku, description, price, cost_price, 
                            category_id, stock_quantity, product_type, is_active
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     `, [
                productIdToUse,
                material.name,
                `MAT-${material.id.substring(0, 8)}`,
                `Atelier Material: ${material.type}`,
                unitPrice,
                material.cost_per_unit,
                null, // No category for now
                0, // Virtual stock
                'atelier_material',
                true
              ]);
            }
          }
        } else {
          const product = await database.get(`
            SELECT price, cost_price FROM products WHERE id = $1
            `, [item.product_id]);
          if (!product) throw new Error(`Product not found: ${item.product_id}`);
          unitPrice = product.price;
        }

        const itemTotal = unitPrice * item.quantity;

        // Ensure we pass a valid product_id to the foreign key constraint
        await database.run(`
          INSERT INTO order_items (
            id, order_id, product_id, quantity, 
            unit_price, total_price, is_atelier_item
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          uuidv4(), orderId, productIdToUse, item.quantity,
          unitPrice, itemTotal, item.is_atelier_item || false
        ]);
      }

      // Handle stock updates
      console.log(`📦 Processing stock updates for order ${orderId} with ${items.length} items`);
      for (const item of items) {
        console.log(`📦 Processing item: ${item.product_id}, is_atelier: ${item.is_atelier_item}, quantity: ${item.quantity}`);
        if (item.is_atelier_item) {
          // ALWAYS deduct from Raw Materials for atelier orders
          // Fabric is cut/allocated immediately when order is placed
          console.log(`✂️ Deducting ${item.quantity} from raw material ${item.product_id}`);
          const result = await database.run(`
                UPDATE raw_materials
                SET current_stock = current_stock - $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [item.quantity, item.product_id]);
          console.log(`✅ Raw material update result:`, result);
        } else if (payment_status !== 'pending') {
          // For standard retail items, only reduce stock if payment is NOT pending (completed/paid)
          console.log(`🛍️ Deducting retail stock for product ${item.product_id}`);
          if (userShopId) {
            // Reduce shop-specific inventory
            await database.run(`
              UPDATE shop_inventory 
              SET quantity = quantity - $1,
                  last_updated = CURRENT_TIMESTAMP
              WHERE shop_id = $2 AND product_id = $3
              `, [item.quantity, userShopId, item.product_id]);

            // Also reduce global stock for tracking
            await database.run(`
              UPDATE products 
              SET stock_quantity = stock_quantity - $1,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
              `, [item.quantity, item.product_id]);
          } else {
            // For admin users or users without shop, reduce global stock only
            await database.run(`
              UPDATE products 
              SET stock_quantity = stock_quantity - $1,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
              `, [item.quantity, item.product_id]);
          }
        } else {
          // For pending retail orders, we might want to reserve stock (future implementation)
          console.log(`📦 Pending retail item ${item.product_id}: Stock not deducted yet`);
        }
      }

      // Award loyalty points for the purchase
      await this.awardPurchasePoints(orderId, customer_id, subtotal);

      // Update customer total spent
      await this.updateCustomerSpending(customer_id, subtotal);

      // Commit transaction
      await database.run('COMMIT');

      return {
        success: true,
        order_id: orderId,
        order_number: orderNumber,
        status: payment_status === 'pending' ? 'pending' : 'completed',
        payment_status: payment_status,
        total_amount: subtotal,
        amount_paid: amount_paid,
        remaining_amount: remaining_amount,
        items_count: items.length,
        stock_updated: payment_status !== 'pending'
      };

    } catch (error) {
      // Rollback transaction on error
      await database.run('ROLLBACK');
      console.error('Create order error:', error);
      throw error;
    }
  }

  /**
   * Confirm an order
   */
  async confirmOrder(orderId, confirmedBy) {
    try {
      // Start transaction
      await database.run('BEGIN');

      // Get order details
      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'pending') {
        throw new Error(`Order cannot be confirmed. Current status: ${order.status}`);
      }

      // Validate stock is still available
      const orderItems = await this.getOrderItems(orderId);
      const stockValidation = await inventoryService.validateStockAvailability(orderItems);
      if (!stockValidation.all_sufficient) {
        throw new Error('Insufficient stock for some items');
      }

      // Update order status
      await database.run(`
        UPDATE orders 
        SET status = 'confirmed', 
            confirmed_at = CURRENT_TIMESTAMP,
            confirmed_by = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [confirmedBy, orderId]);

      // Extend reservation expiry (if needed)
      await this.extendReservationExpiry(orderId);

      // Commit transaction
      await database.run('COMMIT');

      return {
        success: true,
        order_id: orderId,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        stock_confirmed: true
      };

    } catch (error) {
      // Rollback transaction on error
      await database.run('ROLLBACK');
      console.error('Confirm order error:', error);
      throw error;
    }
  }

  /**
   * Process order for fulfillment
   */
  async processFulfillment(orderId, processedBy) {
    try {
      // Start transaction
      await database.run('BEGIN');

      // Get order details
      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'confirmed') {
        throw new Error(`Order cannot be processed. Current status: ${order.status}`);
      }

      // Update order status
      await database.run(`
        UPDATE orders 
        SET status = 'processing', 
            processing_at = CURRENT_TIMESTAMP,
            processed_by = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [processedBy, orderId]);

      // Generate picking list
      const pickingList = await this.generatePickingList(orderId);

      // Commit transaction
      await database.run('COMMIT');

      return {
        success: true,
        order_id: orderId,
        status: 'processing',
        processing_at: new Date().toISOString(),
        picking_list: pickingList
      };

    } catch (error) {
      // Rollback transaction on error
      await database.run('ROLLBACK');
      console.error('Process fulfillment error:', error);
      throw error;
    }
  }

  /**
   * Complete order fulfillment
   */
  async completeFulfillment(orderId, trackingNumber, fulfilledBy) {
    try {
      // Start transaction
      await database.run('BEGIN');

      // Get order details
      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'processing') {
        throw new Error(`Order cannot be fulfilled. Current status: ${order.status}`);
      }

      // Update order status
      await database.run(`
        UPDATE orders 
        SET status = 'fulfilled', 
            fulfilled_at = CURRENT_TIMESTAMP,
            tracking_number = $1,
            fulfilled_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [trackingNumber, fulfilledBy, orderId]);

      // Fulfill order in inventory system
      await inventoryService.fulfillOrder(orderId, true);

      // Send confirmation (placeholder for email service)
      // await emailService.sendFulfillmentConfirmation(orderId);

      // Commit transaction
      await database.run('COMMIT');

      return {
        success: true,
        order_id: orderId,
        status: 'fulfilled',
        fulfilled_at: new Date().toISOString(),
        tracking_number: trackingNumber,
        inventory_updated: true
      };

    } catch (error) {
      // Rollback transaction on error
      await database.run('ROLLBACK');
      console.error('Complete fulfillment error:', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId, cancelledBy, reason = '') {
    try {
      // Start transaction
      await database.run('BEGIN');

      // Get order details
      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (['fulfilled', 'cancelled'].includes(order.status)) {
        throw new Error(`Order cannot be cancelled. Current status: ${order.status}`);
      }

      // Update order status
      await database.run(`
        UPDATE orders 
        SET status = 'cancelled', 
            cancelled_at = CURRENT_TIMESTAMP,
            cancelled_by = $1,
            cancellation_reason = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [cancelledBy, reason, orderId]);

      // Release reserved stock
      await inventoryService.releaseReservedStock(orderId);

      // Commit transaction
      await database.run('COMMIT');

      return {
        success: true,
        order_id: orderId,
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        stock_released: true
      };

    } catch (error) {
      // Rollback transaction on error
      await database.run('ROLLBACK');
      console.error('Cancel order error:', error);
      throw error;
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId) {
    try {
      const order = await database.get(`
        SELECT 
          o.*,
          c.first_name, c.last_name, c.email, c.phone,
          s.name as shop_name, s.address as shop_address
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        LEFT JOIN shops s ON o.shop_id = s.id
        WHERE o.id = $1
      `, [orderId]);

      if (!order) {
        return null;
      }

      // Parse JSON fields
      if (order.shipping_address) {
        order.shipping_address = JSON.parse(order.shipping_address);
      }
      if (order.billing_address) {
        order.billing_address = JSON.parse(order.billing_address);
      }

      // Fetch order items
      try {
        const items = await database.all(`
          SELECT 
            oi.*,
            p.name as product_name, p.sku, p.image_url
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = $1
          ORDER BY oi.created_at
        `, [orderId]);

        order.items = items;
      } catch (error) {
        console.error(`Error fetching items for order ${orderId}:`, error);
        order.items = [];
      }

      return order;
    } catch (error) {
      console.error('Get order error:', error);
      throw error;
    }
  }

  /**
   * Get order items
   */
  async getOrderItems(orderId) {
    try {
      const items = await database.all(`
        SELECT 
          oi.*,
          p.name as product_name, p.sku, p.image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
        ORDER BY oi.created_at
      `, [orderId]);

      return items;
    } catch (error) {
      console.error('Get order items error:', error);
      throw error;
    }
  }

  /**
   * Get orders with filters and pagination
   */
  async getOrders(filters = {}) {
    try {
      // Get total count first
      let countQuery = `
        SELECT COUNT(*) as total
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        LEFT JOIN shops s ON o.shop_id = s.id
        WHERE 1=1
      `;

      const countParams = [];

      if (filters.status) {
        countQuery += ` AND o.status = $${countParams.length + 1}`;
        countParams.push(filters.status);
      }

      if (filters.customer_id) {
        countQuery += ` AND o.customer_id = $${countParams.length + 1}`;
        countParams.push(filters.customer_id);
      }

      if (filters.shop_id) {
        countQuery += ` AND o.shop_id = $${countParams.length + 1}`;
        countParams.push(filters.shop_id);
      }

      if (filters.date_from) {
        countQuery += ` AND o.created_at >= $${countParams.length + 1}`;
        countParams.push(filters.date_from);
      }

      if (filters.date_to) {
        countQuery += ` AND o.created_at <= $${countParams.length + 1}`;
        countParams.push(filters.date_to);
      }

      if (filters.created_by) {
        countQuery += ` AND o.created_by = $${countParams.length + 1}`;
        countParams.push(filters.created_by);
      }

      if (filters.unit) {
        countQuery += ` AND EXISTS (
          SELECT 1 FROM order_items oi 
          WHERE oi.order_id = o.id AND oi.quantity = $${countParams.length + 1}
        )`;
        countParams.push(parseInt(filters.unit));
      }

      // Add atelier filter
      if (filters.is_atelier === 'true') {
        countQuery += ` AND EXISTS (
          SELECT 1 FROM order_items oi 
          WHERE oi.order_id = o.id AND oi.is_atelier_item = true
        )`;
      } else if (filters.is_atelier === 'false') {
        countQuery += ` AND NOT EXISTS (
          SELECT 1 FROM order_items oi 
          WHERE oi.order_id = o.id AND oi.is_atelier_item = true
        )`;
      }

      const countResult = await database.get(countQuery, countParams);
      const total = countResult.total;

      // Get orders with pagination
      let query = `
        SELECT 
          o.*,
          c.first_name, c.last_name, c.email,
          s.name as shop_name, s.address as shop_address,
          (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count,
          (
            SELECT COALESCE(SUM(oi.total_price), 0) 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = o.id AND p.product_type = 'service'
          ) as labor_cost
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        LEFT JOIN shops s ON o.shop_id = s.id
        WHERE 1=1
      `;

      const params = [];

      if (filters.status) {
        query += ` AND o.status = $${params.length + 1}`;
        params.push(filters.status);
      }

      if (filters.customer_id) {
        query += ` AND o.customer_id = $${params.length + 1}`;
        params.push(filters.customer_id);
      }

      if (filters.shop_id) {
        query += ` AND o.shop_id = $${params.length + 1}`;
        params.push(filters.shop_id);
      }

      if (filters.date_from) {
        query += ` AND o.created_at >= $${params.length + 1}`;
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        query += ` AND o.created_at <= $${params.length + 1}`;
        params.push(filters.date_to);
      }

      if (filters.created_by) {
        query += ` AND o.created_by = $${params.length + 1}`;
        params.push(filters.created_by);
      }

      if (filters.unit) {
        query += ` AND EXISTS (
          SELECT 1 FROM order_items oi 
          WHERE oi.order_id = o.id AND oi.quantity = $${params.length + 1}
        )`;
        params.push(parseInt(filters.unit));
      }

      // Add atelier filter
      if (filters.is_atelier === 'true') {
        query += ` AND EXISTS (
          SELECT 1 FROM order_items oi 
          WHERE oi.order_id = o.id AND oi.is_atelier_item = true
        )`;
      } else if (filters.is_atelier === 'false') {
        query += ` AND NOT EXISTS (
          SELECT 1 FROM order_items oi 
          WHERE oi.order_id = o.id AND oi.is_atelier_item = true
        )`;
      }

      query += ` ORDER BY o.created_at DESC`;

      // Add pagination
      const limit = parseInt(filters.limit) || 20;
      const offset = ((parseInt(filters.page) || 1) - 1) * limit;
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const orders = await database.all(query, params);

      // Get order items for each order
      for (let order of orders) {
        try {
          const items = await database.all(`
            SELECT 
              oi.*,
              p.name as product_name, p.sku, p.image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1
            ORDER BY oi.created_at
          `, [order.id]);

          order.items = items;
        } catch (error) {
          console.error(`Error fetching items for order ${order.id}:`, error);
          order.items = [];
        }
      }

      // Parse JSON fields for each order
      orders.forEach(order => {
        if (order.shipping_address) {
          try {
            order.shipping_address = JSON.parse(order.shipping_address);
          } catch (e) {
            order.shipping_address = null;
          }
        }
        if (order.billing_address) {
          try {
            order.billing_address = JSON.parse(order.billing_address);
          } catch (e) {
            order.billing_address = null;
          }
        }
      });

      // Calculate pagination info
      const totalPages = Math.ceil(total / limit);
      const currentPage = parseInt(filters.page) || 1;

      return {
        orders,
        pagination: {
          total,
          page: currentPage,
          totalPages,
          limit
        }
      };
    } catch (error) {
      console.error('Get orders error:', error);
      throw error;
    }
  }

  /**
   * Generate picking list for order
   */
  async generatePickingList(orderId) {
    try {
      const items = await this.getOrderItems(orderId);

      const pickingList = items.map(item => ({
        product_id: item.product_id,
        product_name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        location: 'Main Warehouse', // This could be enhanced with actual location data
        picked: false,
        picked_by: null,
        picked_at: null
      }));

      return pickingList;
    } catch (error) {
      console.error('Generate picking list error:', error);
      throw error;
    }
  }

  /**
   * Extend reservation expiry for an order
   */
  async extendReservationExpiry(orderId) {
    try {
      const newExpiryDate = new Date();
      newExpiryDate.setHours(newExpiryDate.getHours() + 48); // Extend by 48 hours

      await database.run(`
        UPDATE stock_reservations 
        SET expiry_date = $1, updated_at = CURRENT_TIMESTAMP
        WHERE order_id = $2 AND status = 'active'
      `, [newExpiryDate.toISOString(), orderId]);

      return {
        success: true,
        order_id: orderId,
        new_expiry_date: newExpiryDate.toISOString()
      };
    } catch (error) {
      console.error('Extend reservation expiry error:', error);
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats(filters = {}) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_orders,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_orders,
          SUM(CASE WHEN status = 'fulfilled' THEN 1 ELSE 0 END) as fulfilled_orders,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
          SUM(total_amount) as total_revenue
        FROM orders
        WHERE 1=1
      `;

      const params = [];

      if (filters.date_from) {
        query += ` AND created_at >= $${params.length + 1}`;
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        query += ` AND created_at <= $${params.length + 1}`;
        params.push(filters.date_to);
      }

      const stats = await database.get(query, params);

      // Get recent order trends
      const recentTrends = await database.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as order_count,
          SUM(total_amount) as daily_revenue
        FROM orders
        WHERE created_at >= datetime('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `);

      return {
        summary: stats,
        recent_trends: recentTrends,
        last_updated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Get order stats error:', error);
      throw error;
    }
  }

  /**
   * Get order overview statistics for dashboard
   */
  async getOrderOverviewStats(period = 30, user = null) {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - period);
      const dateFromStr = dateFrom.toISOString().split('T')[0];

      // Add user filter for cashiers
      const userFilter = user?.role === 'cashier' ? `AND created_by = '${user.id}'` : '';

      // Get total orders and revenue for the period
      const overviewStats = await database.get(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as avg_order_value,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders
        FROM orders
        WHERE created_at >= $1 ${userFilter}
      `, [dateFromStr]);

      // Handle null values
      return {
        total_orders: overviewStats.total_orders || 0,
        total_revenue: overviewStats.total_revenue || 0,
        avg_order_value: overviewStats.avg_order_value || 0,
        completed_orders: overviewStats.completed_orders || 0
      };

    } catch (error) {
      console.error('Get order overview stats error:', error);
      throw error;
    }
  }

  /**
   * Award loyalty points for a purchase
   */
  async awardPurchasePoints(orderId, customerId, orderAmount) {
    try {
      // Get customer current loyalty info
      const customer = await database.get(`
        SELECT loyalty_points, loyalty_tier FROM customers WHERE id = $1
      `, [customerId]);

      if (!customer) {
        console.log(`Customer ${customerId} not found for points calculation`);
        return;
      }

      // Use PointsCalculator to calculate points
      const finalPoints = PointsCalculator.calculatePurchasePoints(orderAmount, customer.loyalty_tier);

      if (finalPoints > 0) {
        // Add loyalty transaction
        const transactionId = require('uuid').v4();
        await database.run(`
          INSERT INTO loyalty_transactions (
            id, customer_id, transaction_type, points, description, order_id
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [transactionId, customerId, 'earned', finalPoints, `Purchase reward: $${orderAmount.toFixed(2)} order`, orderId]);

        // Update customer points and tier
        const newTotalPoints = customer.loyalty_points + finalPoints;
        const newTier = PointsCalculator.calculateLoyaltyTier(newTotalPoints);

        await database.run(`
          UPDATE customers 
          SET loyalty_points = $1, loyalty_tier = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [newTotalPoints, newTier, customerId]);

        console.log(`Awarded ${finalPoints} points to customer ${customerId} for $${orderAmount} order`);
      }
    } catch (error) {
      console.error('Error awarding purchase points:', error);
      // Don't throw error - points failure shouldn't break the order
    }
  }



  /**
   * Update order status
   */
  async updateOrderStatus(orderId, newStatus, updatedBy, notes = '') {
    try {
      // Start transaction
      await database.run('BEGIN');

      // Get order details
      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Validate status transition
      const validTransitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['processing', 'cancelled'],
        'processing': ['fulfilled', 'cancelled'],
        'fulfilled': ['completed', 'cancelled'],
        'completed': [], // Terminal state
        'cancelled': []  // Terminal state
      };

      const currentStatus = order.status;
      const allowedTransitions = validTransitions[currentStatus] || [];

      if (!allowedTransitions.includes(newStatus)) {
        throw new Error(`Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions.join(', ')}`);
      }

      // Update order status
      await database.run(`
        UPDATE orders 
        SET status = $1, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newStatus, orderId]);

      // Add status change log if notes provided
      if (notes) {
        const logId = require('uuid').v4();
        await database.run(`
          INSERT INTO order_status_logs (
            id, order_id, status_from, status_to, notes, changed_by, changed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        `, [logId, orderId, currentStatus, newStatus, notes, updatedBy]);
      }

      // Handle special cases for certain status changes
      if (newStatus === 'cancelled' && currentStatus === 'pending') {
        // Release reserved stock for cancelled pending orders
        await this.releaseReservedStock(orderId);
      }

      // Commit transaction
      await database.run('COMMIT');

      return {
        success: true,
        order_id: orderId,
        status: newStatus,
        previous_status: currentStatus,
        updated_at: new Date().toISOString()
      };

    } catch (error) {
      // Rollback transaction on error
      await database.run('ROLLBACK');
      console.error('Update order status error:', error);
      throw error;
    }
  }

  /**
   * Release reserved stock for cancelled orders
   */
  async releaseReservedStock(orderId) {
    try {
      // Get order items
      const orderItems = await this.getOrderItems(orderId);

      // For pending orders, stock was reserved but not reduced
      // So we don't need to add it back, just log the release
      console.log(`Released reserved stock for cancelled order ${orderId}`);

    } catch (error) {
      console.error('Error releasing reserved stock:', error);
      // Don't throw error - stock release failure shouldn't break status update
    }
  }

  /**
   * Update customer total spent and purchase count
   */
  async updateCustomerSpending(customerId, orderAmount) {
    try {
      await database.run(`
        UPDATE customers 
        SET total_spent = total_spent + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [orderAmount, customerId]);

      console.log(`Updated customer ${customerId} total spent by $${orderAmount}`);
    } catch (error) {
      console.error('Error updating customer spending:', error);
      // Don't throw error - spending update failure shouldn't break the order
    }
  }

  /**
   * Delete an order completely (admin only)
   * This will release any reserved stock and remove the order from the system
   */
  async deleteOrder(orderId, deletedBy) {
    try {
      // Start transaction
      await database.run('BEGIN');

      // Check if order exists
      const order = await database.get(`
        SELECT id, status, customer_id, total_amount, shop_id FROM orders WHERE id = $1
      `, [orderId]);

      if (!order) {
        throw new Error('Order not found');
      }

      // Check if order can be deleted (only pending/confirmed orders can be deleted)
      if (!['pending', 'confirmed'].includes(order.status)) {
        throw new Error('Only pending or confirmed orders can be deleted');
      }

      // Release any reserved stock
      await this.releaseReservedStock(orderId);

      // Delete order items
      await database.run('DELETE FROM order_items WHERE order_id = $1', [orderId]);

      // Delete the order
      await database.run('DELETE FROM orders WHERE id = $1', [orderId]);

      // Commit transaction
      await database.run('COMMIT');

      console.log(`Order ${orderId} deleted by user ${deletedBy}`);

      return {
        success: true,
        message: 'Order deleted successfully',
        order_id: orderId,
        stock_released: true
      };
    } catch (error) {
      // Rollback transaction
      await database.run('ROLLBACK');
      throw error;
    }
  }
}

module.exports = new OrderService();
