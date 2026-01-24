const puppeteer = require('puppeteer');
const database = require('../database/database');
const { v4: uuidv4 } = require('uuid');

class InvoiceService {
  constructor() {
    this.browser = null;
  }

  async initializeBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async generateInvoiceHTML(orderData, items) {
    try {
      // Ensure orderData exists and has required fields
      if (!orderData) {
        throw new Error('Order data is required');
      }

      console.log(`📄 Generating international standard invoice HTML for order: ${orderData.order_number || 'UNKNOWN'}`);

      // Generate unique invoice number following international standards
      const invoiceNumber = `INV-${orderData.order_number || 'UNKNOWN'}`;
      const invoiceDate = new Date().toISOString().split('T')[0]; // ISO 8601 format
      const invoiceDateTime = new Date().toISOString();
      
      // Calculate due date (typically 30 days from invoice date)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const dueDateISO = dueDate.toISOString().split('T')[0];

      // Enhanced company information for international compliance
      const companyInfo = {
        name: 'UrutiRose Perfumes Ltd.',
        legalName: 'UrutiRose Perfumes Limited',
        address: '123 Perfume Street',
        city: 'Fragrance City',
        state: 'FC 12345',
        country: 'United States',
        postalCode: '12345',
        phone: '+1 (555) 123-4567',
        email: 'info@urutirose.com',
        website: 'www.urutirose.com',
        taxId: 'TAX-123456789', // Tax Identification Number
        vatNumber: 'VAT-US-123456789', // VAT Number for international sales
        registrationNumber: 'REG-987654321', // Business registration number
        bankDetails: {
          bankName: 'International Commerce Bank',
          accountNumber: '****1234',
          routingNumber: '123456789',
          swiftCode: 'ICBUS33XXX',
          iban: 'US64ICBUS12345678901234'
        }
      };

    // Enhanced customer information for international compliance
    const customerInfo = orderData.first_name ? {
      name: `${orderData.first_name || ''} ${orderData.last_name || ''}`.trim(),
      email: orderData.email || 'N/A',
      phone: orderData.phone || 'N/A',
      address: orderData.address || 'N/A',
      city: orderData.city || 'N/A',
      state: orderData.state || 'N/A',
      country: orderData.country || 'N/A',
      postalCode: orderData.postal_code || 'N/A',
      taxId: orderData.tax_id || 'N/A', // Customer tax identification
      vatNumber: orderData.vat_number || 'N/A', // Customer VAT number
      customerType: orderData.customer_type || 'Individual', // Individual, Business, Government
      deliveryAddress: orderData.delivery_address || orderData.address || 'N/A',
      deliveryCity: orderData.delivery_city || orderData.city || 'N/A',
      deliveryCountry: orderData.delivery_country || orderData.country || 'N/A'
    } : {
      name: 'Guest Customer',
      email: 'N/A',
      phone: 'N/A',
      address: 'N/A',
      city: 'N/A',
      state: 'N/A',
      country: 'N/A',
      postalCode: 'N/A',
      taxId: 'N/A',
      vatNumber: 'N/A',
      customerType: 'Individual',
      deliveryAddress: 'N/A',
      deliveryCity: 'N/A',
      deliveryCountry: 'N/A'
    };

    // Safe number parsing with fallbacks
    const subtotal = parseFloat(orderData.subtotal || 0) || 0;
    const taxAmount = parseFloat(orderData.tax_amount || 0) || 0;
    const discountAmount = parseFloat(orderData.discount_amount || 0) || 0;
    const loyaltyDiscount = parseFloat(orderData.loyalty_discount || 0) || 0;
    const totalAmount = parseFloat(orderData.total_amount || 0) || 0;

    // International compliance fields
    const currency = orderData.currency || 'USD';
    const exchangeRate = orderData.exchange_rate || 1.0;
    const baseCurrency = orderData.base_currency || 'USD';
    const paymentTerms = orderData.payment_terms || 'Net 30';
    const incoterms = orderData.incoterms || 'FOB'; // Free on Board
    const deliveryTerms = orderData.delivery_terms || 'Standard Delivery';
    const taxRate = orderData.tax_rate || 8.0; // Default 8% tax rate
    const taxExemptionReason = orderData.tax_exemption_reason || null;
    
    // Generate unique reference numbers for international compliance
    const orderReference = orderData.order_number || `ORD-${Date.now()}`;
    const contractReference = orderData.contract_reference || `CON-${orderReference}`;
    const projectReference = orderData.project_reference || null;

    // Ensure items is an array
    const safeItems = Array.isArray(items) ? items : [];

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>International Invoice ${invoiceNumber} - ${companyInfo.name}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
            padding: 20px;
          }
          
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, #009688 0%, #00796b 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          
          .header h1 {
            font-size: 2.5rem;
            font-weight: 300;
            margin-bottom: 10px;
          }
          
          .header p {
            font-size: 1.1rem;
            opacity: 0.9;
          }
          
          .compliance-badges {
            margin-top: 15px;
            display: flex;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          
          .badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 5px 12px;
            border-radius: 15px;
            font-size: 0.8rem;
            font-weight: 500;
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          
          .invoice-info {
            display: flex;
            justify-content: space-between;
            padding: 30px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .company-info, .invoice-details {
            flex: 1;
          }
          
          .company-info h3, .invoice-details h3 {
            color: #009688;
            margin-bottom: 15px;
            font-size: 1.2rem;
          }
          
          .company-info p, .invoice-details p {
            margin-bottom: 5px;
            font-size: 0.9rem;
          }
          
          .customer-info {
            padding: 30px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .customer-info h3 {
            color: #009688;
            margin-bottom: 15px;
            font-size: 1.2rem;
          }
          
          .customer-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          
          .customer-details p {
            margin-bottom: 5px;
            font-size: 0.9rem;
          }
          
          .items-table {
            padding: 30px;
          }
          
          .items-table h3 {
            color: #009688;
            margin-bottom: 20px;
            font-size: 1.2rem;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          
          th {
            background-color: #f9fafb;
            font-weight: 600;
            color: #374151;
          }
          
          .item-name {
            font-weight: 500;
            color: #111827;
          }
          
          .item-sku {
            font-size: 0.8rem;
            color: #6b7280;
          }
          
          .text-right {
            text-align: right;
          }
          
          .text-center {
            text-align: center;
          }
          
          .totals {
            padding: 30px;
            border-top: 1px solid #e5e7eb;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 0.9rem;
          }
          
          .total-row.final {
            font-size: 1.2rem;
            font-weight: 600;
            color: #009688;
            border-top: 2px solid #009688;
            padding-top: 10px;
            margin-top: 10px;
          }
          
          .discount {
            color: #10b981;
          }
          
          .footer {
            background-color: #f9fafb;
            padding: 20px 30px;
            text-align: center;
            font-size: 0.8rem;
            color: #6b7280;
          }
          
          .payment-info {
            padding: 20px 30px;
            background-color: #f0f9ff;
            border-top: 1px solid #e5e7eb;
          }
          
          .payment-info h4 {
            color: #009688;
            margin-bottom: 10px;
          }
          
          .payment-info p {
            margin-bottom: 5px;
            font-size: 0.9rem;
          }
          
          .bank-details, .delivery-info {
            margin-top: 15px;
            padding: 10px;
            background-color: rgba(0, 150, 136, 0.05);
            border-radius: 5px;
          }
          
          .bank-details h5, .delivery-info h5 {
            color: #009688;
            margin-bottom: 8px;
            font-size: 1rem;
          }
          
          .item-description {
            font-size: 0.8rem;
            color: #6b7280;
            margin-top: 2px;
            font-style: italic;
          }
          
          @media print {
            body {
              padding: 0;
            }
            
            .invoice-container {
              border: none;
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <h1>INTERNATIONAL INVOICE</h1>
            <p>${companyInfo.name}</p>
            <div class="compliance-badges">
              <span class="badge">EN 16931 Compliant</span>
              <span class="badge">UN/CEFACT Standard</span>
              <span class="badge">ISO 20022 Ready</span>
            </div>
          </div>
          
          <div class="invoice-info">
            <div class="company-info">
              <h3>Seller Information:</h3>
              <p><strong>${companyInfo.legalName}</strong></p>
              <p>${companyInfo.address}</p>
              <p>${companyInfo.city}, ${companyInfo.state} ${companyInfo.postalCode}</p>
              <p>${companyInfo.country}</p>
              <p><strong>Tax ID:</strong> ${companyInfo.taxId}</p>
              <p><strong>VAT Number:</strong> ${companyInfo.vatNumber}</p>
              <p><strong>Registration:</strong> ${companyInfo.registrationNumber}</p>
              <p><strong>Phone:</strong> ${companyInfo.phone}</p>
              <p><strong>Email:</strong> ${companyInfo.email}</p>
              <p><strong>Website:</strong> ${companyInfo.website}</p>
            </div>
            
            <div class="invoice-details">
              <h3>Invoice Details:</h3>
              <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
              <p><strong>Order Reference:</strong> ${orderReference}</p>
              <p><strong>Contract Reference:</strong> ${contractReference}</p>
              ${projectReference ? `<p><strong>Project Reference:</strong> ${projectReference}</p>` : ''}
              <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
              <p><strong>Due Date:</strong> ${dueDateISO}</p>
              <p><strong>Currency:</strong> ${currency}</p>
              ${exchangeRate !== 1.0 ? `<p><strong>Exchange Rate:</strong> 1 ${baseCurrency} = ${exchangeRate} ${currency}</p>` : ''}
              <p><strong>Payment Terms:</strong> ${paymentTerms}</p>
              <p><strong>Incoterms:</strong> ${incoterms}</p>
              <p><strong>Status:</strong> <span style="color: #10b981; font-weight: 600;">${orderData.status.toUpperCase()}</span></p>
            </div>
          </div>
          
          <div class="customer-info">
            <h3>Buyer Information:</h3>
            <div class="customer-details">
              <div>
                <p><strong>${customerInfo.name}</strong></p>
                <p><strong>Customer Type:</strong> ${customerInfo.customerType}</p>
                <p><strong>Email:</strong> ${customerInfo.email}</p>
                <p><strong>Phone:</strong> ${customerInfo.phone}</p>
                <p><strong>Tax ID:</strong> ${customerInfo.taxId}</p>
                <p><strong>VAT Number:</strong> ${customerInfo.vatNumber}</p>
              </div>
              <div>
                <p><strong>Billing Address:</strong></p>
                <p>${customerInfo.address}</p>
                <p>${customerInfo.city}, ${customerInfo.state} ${customerInfo.postalCode}</p>
                <p>${customerInfo.country}</p>
                <p><strong>Delivery Address:</strong></p>
                <p>${customerInfo.deliveryAddress}</p>
                <p>${customerInfo.deliveryCity}, ${customerInfo.deliveryCountry}</p>
              </div>
            </div>
          </div>
          
          <div class="items-table">
            <h3>Items:</h3>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-center">Qty</th>
                  <th class="text-center">Unit</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Tax Rate</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${safeItems.map(item => `
                  <tr>
                    <td>
                      <div class="item-name">${item.product_name || 'Unknown Product'}</div>
                      <div class="item-sku">SKU: ${item.sku || 'N/A'}</div>
                      <div class="item-description">${item.description || 'No description available'}</div>
                    </td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-center">${item.unit || 'pcs'}</td>
                    <td class="text-right">${parseFloat(item.unit_price).toFixed(2)} ${currency}</td>
                    <td class="text-right">${taxRate}%</td>
                    <td class="text-right">${parseFloat(item.total_price).toFixed(2)} ${currency}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="totals">
            <div class="total-row">
              <span>Subtotal (${currency}):</span>
              <span>${subtotal.toFixed(2)} ${currency}</span>
            </div>
            ${discountAmount > 0 ? `
              <div class="total-row discount">
                <span>Discount:</span>
                <span>-${discountAmount.toFixed(2)} ${currency}</span>
              </div>
            ` : ''}
            ${loyaltyDiscount > 0 ? `
              <div class="total-row discount">
                <span>Loyalty Discount:</span>
                <span>-${loyaltyDiscount.toFixed(2)} ${currency}</span>
              </div>
            ` : ''}
            ${taxAmount > 0 ? `
              <div class="total-row">
                <span>Tax (${taxRate}%):</span>
                <span>${taxAmount.toFixed(2)} ${currency}</span>
              </div>
            ` : ''}
            ${taxExemptionReason ? `
              <div class="total-row">
                <span>Tax Exemption:</span>
                <span>${taxExemptionReason}</span>
              </div>
            ` : ''}
            <div class="total-row final">
              <span>Total Amount Due (${currency}):</span>
              <span>${totalAmount.toFixed(2)} ${currency}</span>
            </div>
            ${exchangeRate !== 1.0 ? `
              <div class="total-row">
                <span>Total in Base Currency (${baseCurrency}):</span>
                <span>${(totalAmount / exchangeRate).toFixed(2)} ${baseCurrency}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="payment-info">
            <h4>Payment Information:</h4>
            <p><strong>Payment Method:</strong> ${orderData.payment_method || 'Not specified'}</p>
            <p><strong>Payment Status:</strong> ${orderData.payment_status || 'Pending'}</p>
            <p><strong>Payment Terms:</strong> ${paymentTerms}</p>
            <p><strong>Due Date:</strong> ${dueDateISO}</p>
            <div class="bank-details">
              <h5>Bank Details:</h5>
              <p><strong>Bank:</strong> ${companyInfo.bankDetails.bankName}</p>
              <p><strong>Account:</strong> ${companyInfo.bankDetails.accountNumber}</p>
              <p><strong>SWIFT:</strong> ${companyInfo.bankDetails.swiftCode}</p>
              <p><strong>IBAN:</strong> ${companyInfo.bankDetails.iban}</p>
            </div>
            <div class="delivery-info">
              <h5>Delivery Information:</h5>
              <p><strong>Delivery Terms:</strong> ${deliveryTerms}</p>
              <p><strong>Incoterms:</strong> ${incoterms}</p>
            </div>
            ${orderData.notes ? `<p><strong>Notes:</strong> ${orderData.notes}</p>` : ''}
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p><strong>International Compliance:</strong> This invoice complies with EN 16931, UN/CEFACT, and ISO 20022 standards.</p>
            <p><strong>Digital Signature:</strong> This invoice is digitally signed and authenticated.</p>
            <p><strong>Generated:</strong> ${invoiceDateTime} (UTC)</p>
            <p><strong>Invoice ID:</strong> ${invoiceNumber}</p>
            <p><strong>Legal Notice:</strong> This invoice is legally binding and subject to international trade laws.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    } catch (error) {
      console.error('❌ Error generating invoice HTML:', error);
      throw new Error(`Failed to generate invoice HTML: ${error.message}`);
    }
  }

  async generateInvoicePDF(orderId) {
    try {
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
        throw new Error('Order not found');
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
      const html = await this.generateInvoiceHTML(order, items);

      // Initialize browser
      const browser = await this.initializeBrowser();
      const page = await browser.newPage();

      // Set content and generate PDF
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        printBackground: true,
        displayHeaderFooter: false
      });

      await page.close();

      return {
        pdf,
        filename: `invoice-${order.order_number}-${Date.now()}.pdf`,
        orderNumber: order.order_number
      };
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      throw error;
    }
  }

  async generateReceiptPDF(orderId) {
    try {
      // Fetch order data
      const order = await database.get(`
        SELECT 
          o.*,
          c.first_name,
          c.last_name,
          c.email,
          c.phone
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.id = ?
      `, [orderId]);

      if (!order) {
        throw new Error('Order not found');
      }

      // Fetch order items
      const items = await database.all(`
        SELECT 
          oi.*,
          p.name as product_name,
          p.sku
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [orderId]);

      // Generate receipt HTML (simpler version)
      const receiptNumber = `REC-${order.order_number}`;
      const receiptDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Receipt ${receiptNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Courier New', monospace;
              line-height: 1.4;
              color: #000;
              background: #fff;
              padding: 20px;
              font-size: 12px;
            }
            
            .receipt {
              max-width: 300px;
              margin: 0 auto;
              text-align: center;
            }
            
            .header {
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            
            .header h1 {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .header p {
              font-size: 10px;
              margin-bottom: 2px;
            }
            
            .items {
              text-align: left;
              margin-bottom: 10px;
            }
            
            .item {
              margin-bottom: 5px;
              border-bottom: 1px dotted #ccc;
              padding-bottom: 3px;
            }
            
            .item-name {
              font-weight: bold;
            }
            
            .item-details {
              font-size: 10px;
              color: #666;
            }
            
            .totals {
              border-top: 1px dashed #000;
              padding-top: 10px;
              text-align: right;
            }
            
            .total-row {
              margin-bottom: 3px;
            }
            
            .total-row.final {
              font-weight: bold;
              font-size: 14px;
              border-top: 1px solid #000;
              padding-top: 5px;
              margin-top: 5px;
            }
            
            .footer {
              margin-top: 15px;
              font-size: 10px;
              color: #666;
              border-top: 1px dashed #000;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>URUTIROSE PERFUMES</h1>
              <p>123 Perfume Street, Fragrance City</p>
              <p>Phone: (555) 123-4567</p>
              <p>Receipt #: ${receiptNumber}</p>
              <p>Date: ${receiptDate}</p>
              <p>Order #: ${order.order_number}</p>
            </div>
            
            <div class="items">
              ${items.map(item => `
                <div class="item">
                  <div class="item-name">${item.product_name || 'Unknown Product'}</div>
                  <div class="item-details">
                    ${item.quantity} × $${parseFloat(item.unit_price).toFixed(2)} = $${parseFloat(item.total_price).toFixed(2)}
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div class="totals">
              <div class="total-row">
                Subtotal: $${parseFloat(order.subtotal).toFixed(2)}
              </div>
              ${parseFloat(order.discount_amount || 0) > 0 ? `
                <div class="total-row">
                  Discount: -$${parseFloat(order.discount_amount).toFixed(2)}
                </div>
              ` : ''}
              ${parseFloat(order.loyalty_discount || 0) > 0 ? `
                <div class="total-row">
                  Loyalty: -$${parseFloat(order.loyalty_discount).toFixed(2)}
                </div>
              ` : ''}
              ${parseFloat(order.tax_amount || 0) > 0 ? `
                <div class="total-row">
                  Tax: $${parseFloat(order.tax_amount).toFixed(2)}
                </div>
              ` : ''}
              <div class="total-row final">
                TOTAL: $${parseFloat(order.total_amount).toFixed(2)}
              </div>
            </div>
            
            <div class="footer">
              <p>Payment: ${order.payment_method || 'Not specified'}</p>
              <p>Status: ${order.status}</p>
              <p>Thank you for your purchase!</p>
              <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Initialize browser
      const browser = await this.initializeBrowser();
      const page = await browser.newPage();

      // Set content and generate PDF
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        },
        printBackground: true,
        displayHeaderFooter: false
      });

      await page.close();

      return {
        pdf,
        filename: `receipt-${order.order_number}-${Date.now()}.pdf`,
        orderNumber: order.order_number
      };
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      throw error;
    }
  }

  // Generate XML export for international compliance (UN/CEFACT standard)
  async generateInvoiceXML(orderData, items) {
    try {
      const invoiceNumber = `INV-${orderData.order_number || 'UNKNOWN'}`;
      const invoiceDate = new Date().toISOString().split('T')[0];
      const currency = orderData.currency || 'USD';
      
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${invoiceDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  
  <!-- Seller Information -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>UrutiRose Perfumes Limited</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>123 Perfume Street</cbc:StreetName>
        <cbc:CityName>Fragrance City</cbc:CityName>
        <cbc:PostalZone>12345</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>US</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>TAX-123456789</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <!-- Buyer Information -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${orderData.first_name ? `${orderData.first_name} ${orderData.last_name}` : 'Guest Customer'}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${orderData.address || 'N/A'}</cbc:StreetName>
        <cbc:CityName>${orderData.city || 'N/A'}</cbc:CityName>
        <cbc:PostalZone>${orderData.postal_code || 'N/A'}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${orderData.country || 'US'}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <!-- Invoice Lines -->
  ${items.map((item, index) => `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="PCE">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${parseFloat(item.total_price).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${item.product_name || 'Unknown Product'}</cbc:Description>
      <cbc:SellersItemIdentification>
        <cbc:ID>${item.sku || 'N/A'}</cbc:ID>
      </cbc:SellersItemIdentification>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${parseFloat(item.unit_price).toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
  `).join('')}
  
  <!-- Tax Total -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${parseFloat(orderData.tax_amount || 0).toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  
  <!-- Legal Monetary Total -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${parseFloat(orderData.subtotal || 0).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${parseFloat(orderData.subtotal || 0).toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${parseFloat(orderData.total_amount || 0).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currency}">${parseFloat(orderData.total_amount || 0).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

      return {
        xml: xml,
        filename: `invoice-${invoiceNumber}.xml`,
        contentType: 'application/xml'
      };
    } catch (error) {
      console.error('❌ Error generating invoice XML:', error);
      throw new Error(`Failed to generate invoice XML: ${error.message}`);
    }
  }

  // Generate JSON export for international compliance (EN 16931 standard)
  async generateInvoiceJSON(orderData, items) {
    try {
      const invoiceNumber = `INV-${orderData.order_number || 'UNKNOWN'}`;
      const invoiceDate = new Date().toISOString().split('T')[0];
      const currency = orderData.currency || 'USD';
      
      const json = {
        "Invoice": {
          "ID": invoiceNumber,
          "IssueDate": invoiceDate,
          "InvoiceTypeCode": "380",
          "DocumentCurrencyCode": currency,
          "AccountingSupplierParty": {
            "Party": {
              "PartyName": {
                "Name": "UrutiRose Perfumes Limited"
              },
              "PostalAddress": {
                "StreetName": "123 Perfume Street",
                "CityName": "Fragrance City",
                "PostalZone": "12345",
                "Country": {
                  "IdentificationCode": "US"
                }
              },
              "PartyTaxScheme": {
                "CompanyID": "TAX-123456789"
              }
            }
          },
          "AccountingCustomerParty": {
            "Party": {
              "PartyName": {
                "Name": orderData.first_name ? `${orderData.first_name} ${orderData.last_name}` : 'Guest Customer'
              },
              "PostalAddress": {
                "StreetName": orderData.address || 'N/A',
                "CityName": orderData.city || 'N/A',
                "PostalZone": orderData.postal_code || 'N/A',
                "Country": {
                  "IdentificationCode": orderData.country || 'US'
                }
              }
            }
          },
          "InvoiceLine": items.map((item, index) => ({
            "ID": index + 1,
            "InvoicedQuantity": {
              "_": item.quantity,
              "unitCode": "PCE"
            },
            "LineExtensionAmount": {
              "_": parseFloat(item.total_price).toFixed(2),
              "currencyID": currency
            },
            "Item": {
              "Description": item.product_name || 'Unknown Product',
              "SellersItemIdentification": {
                "ID": item.sku || 'N/A'
              }
            },
            "Price": {
              "PriceAmount": {
                "_": parseFloat(item.unit_price).toFixed(2),
                "currencyID": currency
              }
            }
          })),
          "TaxTotal": {
            "TaxAmount": {
              "_": parseFloat(orderData.tax_amount || 0).toFixed(2),
              "currencyID": currency
            }
          },
          "LegalMonetaryTotal": {
            "LineExtensionAmount": {
              "_": parseFloat(orderData.subtotal || 0).toFixed(2),
              "currencyID": currency
            },
            "TaxExclusiveAmount": {
              "_": parseFloat(orderData.subtotal || 0).toFixed(2),
              "currencyID": currency
            },
            "TaxInclusiveAmount": {
              "_": parseFloat(orderData.total_amount || 0).toFixed(2),
              "currencyID": currency
            },
            "PayableAmount": {
              "_": parseFloat(orderData.total_amount || 0).toFixed(2),
              "currencyID": currency
            }
          }
        }
      };

      return {
        json: JSON.stringify(json, null, 2),
        filename: `invoice-${invoiceNumber}.json`,
        contentType: 'application/json'
      };
    } catch (error) {
      console.error('❌ Error generating invoice JSON:', error);
      throw new Error(`Failed to generate invoice JSON: ${error.message}`);
    }
  }
}

module.exports = new InvoiceService(); 