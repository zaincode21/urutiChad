const express = require('express');
const invoiceService = require('../services/invoiceService');
const database = require('../database/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Generate and download invoice PDF
router.get('/:orderId/invoice', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const result = await invoiceService.generateInvoicePDF(orderId);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.pdf.length);
    
    res.send(result.pdf);
  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate invoice',
      details: error.message 
    });
  }
});

// Generate and download receipt PDF
router.get('/:orderId/receipt', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const result = await invoiceService.generateReceiptPDF(orderId);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.pdf.length);
    
    res.send(result.pdf);
  } catch (error) {
    console.error('Receipt generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate receipt',
      details: error.message 
    });
  }
});

// Preview invoice (returns HTML for preview)
router.get('/:orderId/preview', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Fetch order data
    const order = await database.get(`
      SELECT 
        o.*,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.state,
        c.country
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `, [orderId]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Fetch order items
    const items = await database.all(`
      SELECT 
        oi.*,
        p.name as product_name,
        p.sku,
        p.image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    // Generate HTML
    const html = await invoiceService.generateInvoiceHTML(order, items);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Invoice preview error:', error);
    res.status(500).json({ 
      error: 'Failed to generate invoice preview',
      details: error.message 
    });
  }
});

// Print invoice (opens in new window for printing)
router.get('/:orderId/print', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(`🖨️ Generating print invoice for order: ${orderId}`);
    
    // Fetch order data
    const order = await database.get(`
      SELECT 
        o.*,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.state,
        c.country
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `, [orderId]);

    if (!order) {
      console.error(`❌ Order not found: ${orderId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log(`✅ Order found: ${order.order_number} for customer: ${order.first_name || 'Guest'}`);

    // Fetch order items
    const items = await database.all(`
      SELECT 
        oi.*,
        p.name as product_name,
        p.sku,
        p.image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    console.log(`✅ Found ${items.length} items for order`);

    // Generate HTML with print-specific styles
    const html = await invoiceService.generateInvoiceHTML(order, items);
    console.log(`✅ Invoice HTML generated successfully`);
    
    // Enhanced print HTML with better print styles and error handling
    const printHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Print Invoice - ${order.order_number}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
          }
          
          @media screen {
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              background: #f5f5f5; 
            }
            .print-button { 
              display: block; 
              margin: 20px 0; 
              padding: 10px 20px; 
              background: #009688; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer; 
            }
            .print-button:hover { background: #00796b; }
          }
          
          .invoice-container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 800px;
            margin: 0 auto;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #009688;
          }
          
          .print-header h1 {
            color: #009688;
            margin: 0;
            font-size: 28px;
          }
          
          .print-header p {
            color: #666;
            margin: 5px 0;
          }
        </style>
        <script>
          function printInvoice() {
            try {
              window.print();
              // Auto-close after printing (optional)
              setTimeout(function() {
                if (window.opener) {
                  window.close();
                }
              }, 2000);
            } catch (error) {
              console.error('Print error:', error);
              alert('Print failed. Please try using Ctrl+P or Cmd+P');
            }
          }
          
          function closeWindow() {
            if (window.opener) {
              window.close();
            } else {
              window.history.back();
            }
          }
          
          // Auto-print on load (optional)
          window.onload = function() {
            // Uncomment the line below to auto-print
            // printInvoice();
          };
        </script>
      </head>
      <body>
        <div class="print-header no-print">
          <h1>Invoice Ready for Printing</h1>
          <p>Order: ${order.order_number} | Customer: ${order.first_name ? order.first_name + ' ' + order.last_name : 'Guest'}</p>
          <button class="print-button" onclick="printInvoice()">🖨️ Print Invoice</button>
          <button class="print-button" onclick="closeWindow()" style="background: #666; margin-left: 10px;">❌ Close</button>
        </div>
        
        <div class="invoice-container">
          ${html}
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 30px; color: #666;">
          <p>💡 Tip: Use Ctrl+P (Windows) or Cmd+P (Mac) to print</p>
        </div>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(printHtml);
  } catch (error) {
    console.error('Invoice print error:', error);
    res.status(500).json({ 
      error: 'Failed to generate invoice for printing',
      details: error.message 
    });
  }
});

// Export invoice as XML (UN/CEFACT standard)
router.get('/:orderId/export/xml', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Fetch order data
    const order = await database.get(`
      SELECT 
        o.*,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.state,
        c.country,
        c.postal_code
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [orderId]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Fetch order items
    const items = await database.all(`
      SELECT 
        oi.*,
        p.name as product_name,
        p.sku,
        p.description
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [orderId]);

    // Generate XML
    const result = await invoiceService.generateInvoiceXML(order, items);
    
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    
    res.send(result.xml);
  } catch (error) {
    console.error('XML export error:', error);
    res.status(500).json({ 
      error: 'Failed to export invoice as XML',
      details: error.message 
    });
  }
});

// Export invoice as JSON (EN 16931 standard)
router.get('/:orderId/export/json', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Fetch order data
    const order = await database.get(`
      SELECT 
        o.*,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.state,
        c.country,
        c.postal_code
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [orderId]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Fetch order items
    const items = await database.all(`
      SELECT 
        oi.*,
        p.name as product_name,
        p.sku,
        p.description
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [orderId]);

    // Generate JSON
    const result = await invoiceService.generateInvoiceJSON(order, items);
    
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    
    res.send(result.json);
  } catch (error) {
    console.error('JSON export error:', error);
    res.status(500).json({ 
      error: 'Failed to export invoice as JSON',
      details: error.message 
    });
  }
});

module.exports = router; 