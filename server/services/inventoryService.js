const database = require('../database/database');
const { v4: uuidv4 } = require('uuid');

class InventoryService {

  /**
   * Get current stock levels for a product
   */
  async getProductStock(productId) {
    try {
      const product = await database.get(`
        SELECT 
          id, name, current_stock, reserved_stock, 
          available_stock, min_stock_level, reorder_point,
          cost_price, price
        FROM products 
        WHERE id = ?
      `, [productId]);

      if (!product) {
        throw new Error('Product not found');
      }

      // Calculate available stock if not set
      if (product.available_stock === null || product.available_stock === undefined) {
        product.available_stock = product.current_stock - product.reserved_stock;
      }

      return product;
    } catch (error) {
      console.error('Get product stock error:', error);
      throw error;
    }
  }

  /**
   * Get stock levels for multiple products
   */
  async getMultipleProductStock(productIds) {
    try {
      const placeholders = productIds.map(() => '?').join(',');
      const products = await database.all(`
        SELECT 
          id, name, current_stock, reserved_stock, 
          available_stock, min_stock_level, reorder_point,
          cost_price, price
        FROM products 
        WHERE id IN (${placeholders})
      `, productIds);

      // Calculate available stock for each product
      products.forEach(product => {
        if (product.available_stock === null || product.available_stock === undefined) {
          product.available_stock = product.current_stock - product.reserved_stock;
        }
      });

      return products;
    } catch (error) {
      console.error('Get multiple product stock error:', error);
      throw error;
    }
  }

  /**
   * Validate stock availability for order items
   */
  async validateStockAvailability(orderItems) {
    try {
      const productIds = orderItems.map(item => item.product_id);
      const products = await this.getMultipleProductStock(productIds);

      const validationResults = [];

      for (const item of orderItems) {
        const product = products.find(p => p.id === item.product_id);

        if (!product) {
          throw new Error(`Product ${item.product_id} not found`);
        }

        const availableStock = product.available_stock || (product.current_stock - product.reserved_stock);

        if (availableStock < item.quantity) {
          validationResults.push({
            product_id: item.product_id,
            product_name: product.name,
            requested: item.quantity,
            available: availableStock,
            sufficient: false,
            message: `Insufficient stock. Available: ${availableStock}, Requested: ${item.quantity}`
          });
        } else {
          validationResults.push({
            product_id: item.product_id,
            product_name: product.name,
            requested: item.quantity,
            available: availableStock,
            sufficient: true,
            message: 'Stock available'
          });
        }
      }

      const allSufficient = validationResults.every(result => result.sufficient);

      return {
        all_sufficient: allSufficient,
        results: validationResults,
        total_requested: orderItems.reduce((sum, item) => sum + item.quantity, 0),
        total_available: validationResults.reduce((sum, result) => sum + result.available, 0)
      };
    } catch (error) {
      console.error('Validate stock availability error:', error);
      throw error;
    }
  }

  /**
   * Reserve stock for an order
   */
  async reserveStock(orderId, orderItems, withinTransaction = false) {
    try {
      // Start transaction only if not already within one
      if (!withinTransaction) {
        await database.run('BEGIN TRANSACTION');
      }

      // Validate stock availability first
      const validation = await this.validateStockAvailability(orderItems);
      if (!validation.all_sufficient) {
        throw new Error('Insufficient stock for some items');
      }

      const reservations = [];

      for (const item of orderItems) {
        // Update product reserved stock
        await database.run(`
          UPDATE products 
          SET reserved_stock = reserved_stock + ?,
              available_stock = current_stock - (reserved_stock + ?),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [item.quantity, item.quantity, item.product_id]);

        // Create stock reservation record
        const reservationId = uuidv4();
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 24); // 24 hour expiry

        await database.run(`
          INSERT INTO stock_reservations (
            id, order_id, product_id, quantity_reserved, 
            reservation_date, expiry_date, status
          ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 'active')
        `, [reservationId, orderId, item.product_id, item.quantity, expiryDate.toISOString()]);

        // Create inventory transaction for reservation
        await this.createInventoryTransaction({
          product_id: item.product_id,
          transaction_type: 'reservation',
          quantity: item.quantity,
          reference_id: orderId,
          reference_type: 'order',
          notes: `Stock reserved for order ${orderId}`
        });

        reservations.push({
          id: reservationId,
          product_id: item.product_id,
          quantity: item.quantity,
          expiry_date: expiryDate
        });
      }

      // Commit transaction only if we started it
      if (!withinTransaction) {
        await database.run('COMMIT');
      }

      return {
        success: true,
        order_id: orderId,
        reservations: reservations,
        total_reserved: orderItems.reduce((sum, item) => sum + item.quantity, 0)
      };

    } catch (error) {
      // Rollback transaction only if we started it
      if (!withinTransaction) {
        await database.run('ROLLBACK');
      }
      console.error('Reserve stock error:', error);
      throw error;
    }
  }

  /**
   * Release reserved stock for an order
   */
  async releaseReservedStock(orderId) {
    try {
      // Start transaction
      await database.run('BEGIN TRANSACTION');

      // Get all reservations for the order
      const reservations = await database.all(`
        SELECT * FROM stock_reservations 
        WHERE order_id = ? AND status = 'active'
      `, [orderId]);

      if (reservations.length === 0) {
        return { success: true, message: 'No active reservations found' };
      }

      for (const reservation of reservations) {
        // Update product reserved stock
        await database.run(`
          UPDATE products 
          SET reserved_stock = reserved_stock - ?,
              available_stock = current_stock - (reserved_stock - ?),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [reservation.quantity_reserved, reservation.quantity_reserved, reservation.product_id]);

        // Mark reservation as released
        await database.run(`
          UPDATE stock_reservations 
          SET status = 'released', 
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [reservation.id]);

        // Create inventory transaction for release
        await this.createInventoryTransaction({
          product_id: reservation.product_id,
          transaction_type: 'release',
          quantity: reservation.quantity_reserved,
          reference_id: orderId,
          reference_type: 'order',
          notes: `Stock reservation released for order ${orderId}`
        });
      }

      // Commit transaction
      await database.run('COMMIT');

      return {
        success: true,
        order_id: orderId,
        reservations_released: reservations.length,
        total_released: reservations.reduce((sum, r) => sum + r.quantity_reserved, 0)
      };

    } catch (error) {
      // Rollback transaction on error
      await database.run('ROLLBACK');
      console.error('Release reserved stock error:', error);
      throw error;
    }
  }

  /**
   * Fulfill order and update actual inventory
   */
  async fulfillOrder(orderId, withinTransaction = false) {
    try {
      // Start transaction only if not already within one
      if (!withinTransaction) {
        await database.run('BEGIN TRANSACTION');
      }

      // Get order items
      const orderItems = await database.all(`
        SELECT oi.*, p.name as product_name, p.current_stock, p.reserved_stock
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [orderId]);

      if (orderItems.length === 0) {
        throw new Error('No items found for order');
      }

      const fulfillmentResults = [];

      for (const item of orderItems) {
        // Update actual stock levels
        const newCurrentStock = item.current_stock - item.quantity;
        const newReservedStock = item.reserved_stock - item.quantity;
        const newAvailableStock = newCurrentStock - newReservedStock;

        await database.run(`
          UPDATE products 
          SET current_stock = ?,
              reserved_stock = ?,
              available_stock = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [newCurrentStock, newReservedStock, newAvailableStock, item.product_id]);

        // Mark reservation as fulfilled
        await database.run(`
          UPDATE stock_reservations 
          SET status = 'fulfilled', 
              updated_at = CURRENT_TIMESTAMP
          WHERE order_id = ? AND product_id = ?
        `, [orderId, item.product_id]);

        // Create inventory transaction for sale
        await this.createInventoryTransaction({
          product_id: item.product_id,
          transaction_type: 'sale',
          quantity: item.quantity,
          previous_stock: item.current_stock,
          new_stock: newCurrentStock,
          reference_id: orderId,
          reference_type: 'order',
          notes: `Order fulfilled for order ${orderId}`
        });

        fulfillmentResults.push({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          previous_stock: item.current_stock,
          new_stock: newCurrentStock
        });
      }

      // Commit transaction only if we started it
      if (!withinTransaction) {
        await database.run('COMMIT');
      }

      return {
        success: true,
        order_id: orderId,
        items_fulfilled: fulfillmentResults.length,
        total_quantity: fulfillmentResults.reduce((sum, item) => sum + item.quantity, 0),
        fulfillment_details: fulfillmentResults
      };

    } catch (error) {
      // Rollback transaction only if we started it
      if (!withinTransaction) {
        await database.run('ROLLBACK');
      }
      console.error('Fulfill order error:', error);
      throw error;
    }
  }

  /**
   * Create inventory transaction record
   */
  async createInventoryTransaction(transactionData) {
    try {
      const {
        product_id,
        transaction_type,
        quantity,
        previous_stock = null,
        new_stock = null,
        unit_cost = null,
        total_value = null,
        reference_id = null,
        reference_type = null,
        notes = null
      } = transactionData;

      const transactionId = uuidv4();

      await database.run(`
        INSERT INTO inventory_transactions (
          id, product_id, transaction_type, quantity, 
          previous_stock, new_stock, unit_cost, total_value,
          reference_id, reference_type, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        transactionId, product_id, transaction_type, quantity,
        previous_stock, new_stock, unit_cost, total_value,
        reference_id, reference_type, notes
      ]);

      return {
        success: true,
        transaction_id: transactionId
      };

    } catch (error) {
      console.error('Create inventory transaction error:', error);
      throw error;
    }
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts() {
    try {
      const lowStockProducts = await database.all(`
        SELECT 
          id, name, current_stock, reserved_stock, available_stock,
          min_stock_level, reorder_point, cost_price
        FROM products 
        WHERE available_stock <= min_stock_level 
        AND is_active = 1
        ORDER BY (available_stock / min_stock_level) ASC
      `);

      return lowStockProducts.map(product => ({
        ...product,
        alert_level: product.available_stock <= product.reorder_point ? 'critical' : 'warning',
        days_remaining: product.available_stock > 0 ?
          Math.floor(product.available_stock / (product.available_stock / 30)) : 0
      }));

    } catch (error) {
      console.error('Get low stock alerts error:', error);
      throw error;
    }
  }

  /**
   * Get inventory summary statistics
   */
  async getInventorySummary() {
    try {
      const summary = await database.get(`
        SELECT 
          COUNT(*) as total_products,
          SUM(current_stock) as total_current_stock,
          SUM(reserved_stock) as total_reserved_stock,
          SUM(available_stock) as total_available_stock,
          SUM(CASE WHEN available_stock <= min_stock_level THEN 1 ELSE 0 END) as low_stock_count,
          SUM(CASE WHEN available_stock <= reorder_point THEN 1 ELSE 0 END) as critical_stock_count
        FROM products 
        WHERE is_active = 1
      `);

      // Get recent transactions
      const recentTransactions = await database.all(`
        SELECT 
          it.transaction_type,
          COUNT(*) as count,
          SUM(it.quantity) as total_quantity
        FROM inventory_transactions it
        WHERE it.created_at >= datetime('now', '-7 days')
        GROUP BY it.transaction_type
        ORDER BY count DESC
      `);

      return {
        summary,
        recent_activity: recentTransactions,
        last_updated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Get inventory summary error:', error);
      throw error;
    }
  }

  /**
   * Clean up expired reservations
   */
  async cleanupExpiredReservations() {
    try {
      // Start transaction
      await database.run('BEGIN TRANSACTION');

      // Get expired reservations
      const expiredReservations = await database.all(`
        SELECT * FROM stock_reservations 
        WHERE expiry_date < CURRENT_TIMESTAMP 
        AND status = 'active'
      `);

      if (expiredReservations.length === 0) {
        return { success: true, message: 'No expired reservations found' };
      }

      let totalReleased = 0;

      for (const reservation of expiredReservations) {
        // Update product reserved stock
        await database.run(`
          UPDATE products 
          SET reserved_stock = reserved_stock - ?,
              available_stock = current_stock - (reserved_stock - ?),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [reservation.quantity_reserved, reservation.quantity_reserved, reservation.product_id]);

        // Mark reservation as expired
        await database.run(`
          UPDATE stock_reservations 
          SET status = 'expired', 
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [reservation.id]);

        // Create inventory transaction for expiry
        await this.createInventoryTransaction({
          product_id: reservation.product_id,
          transaction_type: 'expiry',
          quantity: reservation.quantity_reserved,
          reference_id: reservation.order_id,
          reference_type: 'order',
          notes: `Stock reservation expired for order ${reservation.order_id}`
        });

        totalReleased += reservation.quantity_reserved;
      }

      // Commit transaction
      await database.run('COMMIT');

      return {
        success: true,
        reservations_cleaned: expiredReservations.length,
        total_stock_released: totalReleased
      };

    } catch (error) {
      // Rollback transaction on error
      await database.run('ROLLBACK');
      console.error('Cleanup expired reservations error:', error);
      throw error;
    }
  }

  /**
   * Get inventory transaction history
   */
  async getTransactionHistory(productId = null, limit = 100) {
    try {
      let query = `
        SELECT 
          it.*,
          p.name as product_name,
          p.sku
        FROM inventory_transactions it
        JOIN products p ON it.product_id = p.id
      `;

      const params = [];

      if (productId) {
        query += ` WHERE it.product_id = ?`;
        params.push(productId);
      }

      query += ` ORDER BY it.created_at DESC LIMIT ?`;
      params.push(limit);

      const transactions = await database.all(query, params);

      return transactions;

    } catch (error) {
      console.error('Get transaction history error:', error);
      throw error;
    }
  }

  /**
   * Update product stock levels (for manual adjustments)
   */
  async updateProductStock(productId, adjustmentData) {
    try {
      const {
        adjustment_type, // 'add', 'subtract', 'set'
        quantity,
        reason,
        reference_id = null,
        reference_type = null
      } = adjustmentData;

      // Start transaction
      await database.run('BEGIN TRANSACTION');

      // Get current product stock
      const product = await this.getProductStock(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      let newCurrentStock;
      let newAvailableStock;

      switch (adjustment_type) {
        case 'add':
          newCurrentStock = product.current_stock + quantity;
          newAvailableStock = product.available_stock + quantity;
          break;
        case 'subtract':
          if (product.available_stock < quantity) {
            throw new Error('Insufficient available stock for adjustment');
          }
          newCurrentStock = product.current_stock - quantity;
          newAvailableStock = product.available_stock - quantity;
          break;
        case 'set':
          newCurrentStock = quantity;
          newAvailableStock = quantity - product.reserved_stock;
          break;
        default:
          throw new Error('Invalid adjustment type');
      }

      // Update product stock
      await database.run(`
        UPDATE products 
        SET current_stock = ?,
            available_stock = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newCurrentStock, newAvailableStock, productId]);

      // Create inventory transaction
      await this.createInventoryTransaction({
        product_id: productId,
        transaction_type: 'adjustment',
        quantity: Math.abs(quantity),
        previous_stock: product.current_stock,
        new_stock: newCurrentStock,
        reference_id,
        reference_type,
        notes: `Manual stock adjustment: ${reason}`
      });

      // Commit transaction
      await database.run('COMMIT');

      return {
        success: true,
        product_id: productId,
        adjustment_type,
        quantity,
        previous_stock: product.current_stock,
        new_stock: newCurrentStock,
        reason
      };

    } catch (error) {
      // Rollback transaction on error
      await database.run('ROLLBACK');
      console.error('Update product stock error:', error);
      throw error;
    }
  }
}

module.exports = new InventoryService(); 