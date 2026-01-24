import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Search,
  User,
  CreditCard,
  Package,
  AlertTriangle,
  Scan
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { ordersAPI, productsAPI, customersAPI, discountsAPI } from '../lib/api';
import TranslatedText from './TranslatedText';

import { useTranslation } from '../hooks/useTranslation';

const OrderForm = ({ onOrderCreated, onClose, isFullPage = false, modernPOS = false }) => {
  const { tSync, translateBatch } = useTranslation();

  useEffect(() => {
    // Translate common placeholders and statuses
    const terms = [
      'Search customers...',
      'Search products...',
      'Scan barcode (F2)',
      'Partial Payment (50%)',
      'Complete Payment',
      'Pending',
      'Complete',
      'Walk-in Customer'
    ];
    translateBatch(terms);
  }, []);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('complete'); // 'complete' or 'pending'
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errors, setErrors] = useState({});
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [selectedDiscounts, setSelectedDiscounts] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  // Order summary popup state
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [orderReference, setOrderReference] = useState('');


  // Customer loading state
  const [customersLoading, setCustomersLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

  // Helper function to get payment status display text
  const getPaymentStatusText = (status) => {
    switch (status) {
      case 'pending':
        return tSync('Partial Payment (50%)');
      case 'complete':
        return tSync('Complete Payment');
      default:
        return tSync(status);
    }
  };

  // Helper function to get payment status color
  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-orange-600';
      case 'complete':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  // Mobile detection and warning helper
  function isMobileDevice() {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || '';
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.matchMedia
      ? window.matchMedia('(max-width: 768px)').matches
      : (window.innerWidth || 0) <= 768;
    return /android|iphone|ipad|ipod|opera mini|iemobile|mobile/i.test(ua) || isSmallScreen || isTouch;
  }

  const showWarning = (message) => {
    const onMobile = isMobileDevice();
    if (onMobile) {
      try { window.alert(message); } catch (e) { }
    }
    if (!onMobile) {
      toast(message, {
        icon: '⚠️',
        style: { background: '#FEF3C7', color: '#92400E' }
      });
    }
  };

  // Product sorting state
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10); // Show 10 products per page

  // Define filtered customers and products before useEffect hooks
  const filteredCustomers = customers.filter(customer => {
    if (!customer) return false;

    const searchTerm = customerSearch.toLowerCase();
    const firstName = customer.first_name?.toLowerCase() || '';
    const lastName = customer.last_name?.toLowerCase() || '';
    const email = customer.email?.toLowerCase() || '';
    const phone = customer.phone?.toLowerCase() || '';

    const matches = firstName.includes(searchTerm) ||
      lastName.includes(searchTerm) ||
      email.includes(searchTerm) ||
      phone.includes(searchTerm) ||
      `${firstName} ${lastName}`.includes(searchTerm);

    // Debug logging for customer search
    if (customerSearch && (firstName.includes(searchTerm) || lastName.includes(searchTerm))) {
      console.log(`🔍 Customer search match: "${firstName} ${lastName}" (${email})`);
    }

    return matches;
  });

  const filteredProducts = products.filter(product => {
    const searchTerm = productSearch.toLowerCase();
    const barcodeTerm = barcodeSearch.toLowerCase();

    const matches = (
      product.name?.toLowerCase().includes(searchTerm) ||
      product.sku?.toLowerCase().includes(searchTerm) ||
      product.brand_name?.toLowerCase().includes(searchTerm) ||
      (barcodeTerm && product.barcode?.toLowerCase().includes(barcodeTerm))
    );

    // Debug logging for product search
    if (searchTerm && matches) {
      console.log(`🔍 Product search match: "${product.name}" (${product.sku})`);
    }

    return matches;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'price':
        return ((a.price ?? 0) - (b.price ?? 0)) * dir;
      case 'stock':
        return ((a.stock_quantity ?? 0) - (b.stock_quantity ?? 0)) * dir;
      case 'name':
      default:
        return (a.name ?? '').localeCompare(b.name ?? '') * dir;
    }
  });

  // Pagination calculations
  const totalProducts = sortedProducts.length;
  const totalPages = Math.ceil(totalProducts / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;

  // Show all products when searching, paginate when not searching
  const paginatedProducts = productSearch.trim()
    ? sortedProducts // Show all matching products when searching
    : sortedProducts.slice(startIndex, endIndex); // Normal pagination when not searching

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [productSearch, sortField, sortDirection]);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();

    // Auto-focus barcode input when form opens
    setTimeout(() => {
      document.getElementById('barcode-input')?.focus();
    }, 300);

    // Add keyboard shortcut for barcode scanner (F2 key)
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        document.getElementById('barcode-input')?.focus();
      } else if (e.key === 'F3') {
        e.preventDefault();
        simulateBarcodeScanner();
      } else if (e.key === '/') {
        // Focus product search input with '/'
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          document.getElementById('product-search-input')?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add window focus event to refresh products when returning to the page
  useEffect(() => {
    const handleWindowFocus = () => {
      fetchProducts();
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, []);

  // Fetch available discounts when component mounts
  useEffect(() => {
    fetchAvailableDiscounts();
  }, []);

  // Debug logging for customers state changes
  useEffect(() => {
    console.log(`👥 Customers state updated: ${customers.length} customers loaded`);
    if (customers.length > 0) {
      console.log('📋 Available customers:', customers.map(c => `${c.first_name} ${c.last_name}`).join(', '));
    }
  }, [customers]);

  // Debug logging for customer search
  useEffect(() => {
    if (customerSearch) {
      console.log(`🔍 Customer search term: "${customerSearch}"`);
      console.log(`📊 Filtered customers: ${filteredCustomers.length} matches`);
    }
  }, [customerSearch, filteredCustomers]);

  // Debug logging for product search
  useEffect(() => {
    if (productSearch) {
      console.log(`🔍 Product search term: "${productSearch}"`);
      console.log(`📊 Filtered products: ${filteredProducts.length} matches`);
      console.log(`📦 Total products available: ${products.length}`);
    }
  }, [productSearch, filteredProducts, products]);

  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      console.log('🔍 Fetching customers from database...');

      const response = await customersAPI.getAll();
      console.log('📊 Customers API response:', response);

      // Handle different response formats
      let customerData = [];
      if (response.data && response.data.customers) {
        customerData = response.data.customers;
      } else if (Array.isArray(response.data)) {
        customerData = response.data;
      } else {
        console.warn('⚠️ Unexpected customers response format:', response.data);
        customerData = [];
      }

      console.log(`✅ Loaded ${customerData.length} customers from database`);
      setCustomers(customerData);

      // Log first few customers for debugging
      if (customerData.length > 0) {
        console.log('👥 Sample customers:', customerData.slice(0, 3));
      }

    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // More specific error messages
      if (error.response?.status === 404) {
        toast.error('Customers endpoint not found. Please check server configuration.');
      } else if (error.response?.status === 500) {
        toast.error('Server error while loading customers. Please try again.');
      } else if (error.code === 'NETWORK_ERROR') {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(`Failed to load customers: ${error.message}`);
      }

      // Set empty array to prevent undefined errors
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const response = await productsAPI.getAll({ page: 1, limit: 1000 });
      console.log('📦 Products API response:', response);

      // Handle the response format from the server
      let productData = [];
      if (response.data && response.data.products) {
        productData = response.data.products;
      } else if (Array.isArray(response.data)) {
        productData = response.data;
      } else {
        console.warn('⚠️ Unexpected products response format:', response.data);
        productData = [];
      }

      console.log(`✅ Loaded ${productData.length} products from database`);
      setProducts(productData);

      // Log first few products for debugging
      if (productData.length > 0) {
        console.log('📦 Sample products:', productData.slice(0, 3));
      }

    } catch (error) {
      console.error('❌ Error fetching products:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // More specific error messages
      if (error.response?.status === 404) {
        toast.error('Products endpoint not found. Please check server configuration.');
      } else if (error.response?.status === 500) {
        toast.error('Server error while loading products. Please try again.');
      } else if (error.code === 'NETWORK_ERROR') {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(`Failed to load products: ${error.message}`);
      }

      // Set empty array to prevent undefined errors
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchAvailableDiscounts = async () => {
    try {
      // Fetch discounts based on payment status
      const response = await discountsAPI.getAll({
        params: {
          is_active: true,
          limit: 50,
          payment_status: paymentStatus
        }
      });
      setAvailableDiscounts(response.data.discounts || []);
    } catch (error) {
      console.error('Error fetching available discounts:', error);
      // Gracefully handle discounts API failure - set empty array and continue
      setAvailableDiscounts([]);
      // Don't show error toast to user since discounts are optional for orders

      // Log the specific error for debugging
      if (error.response) {
        console.error('Discounts API error details:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      }
    }
  };

  // Currency formatter
  const formatCurrency = (value, currencyCode = 'RWF') => {
    try {
      const numericValue = Number(value || 0);
      if (currencyCode === 'RWF') {
        return `RWF ${numericValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      }
      return new Intl.NumberFormat('rw-RW', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0
      }).format(numericValue);
    } catch {
      const numeric = Number(value || 0);
      return `RWF ${numeric.toLocaleString()}`;
    }
  };

  // Generate unique order reference
  const generateOrderReference = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const time = Date.now().toString().slice(-6);
    return `UR-${year}${month}${day}-${time}`;
  };

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const time = Date.now().toString().slice(-4);
    return `INV-${year}${month}${day}-${time}`;
  };

  // Generate thermal receipt for printing
  const generateThermalReceipt = () => {
    const invoiceNumber = generateInvoiceNumber();
    const currentOrderRef = orderReference || generateOrderReference();

    const receiptWindow = window.open('', '_blank', 'width=400,height=400');

    receiptWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${invoiceNumber}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: 'Courier New', monospace;
              font-size: 14px;
              line-height: 1.4;
              width: 80mm;
              height: 80mm;
              margin: 0 auto;
              padding: 3mm;
              background: white;
              color: black;
              overflow: hidden;
            }
            .receipt-header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 4px;
              margin-bottom: 4px;
            }
            .store-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 1px;
            }
            .store-info {
              font-size: 11px;
              margin-bottom: 0.5px;
            }
            .receipt-info {
              margin: 4px 0;
              font-size: 12px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 2px;
            }
            .items-section {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 3px 0;
              margin: 3px 0;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 1px;
              font-size: 12px;
            }
            .item-name {
              font-weight: bold;
              margin-bottom: 0.5px;
              font-size: 13px;
            }
            .item-details {
              font-size: 10px;
              color: #666;
            }
            .totals-section {
              margin-top: 4px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 1px;
              font-size: 12px;
            }
            .final-total {
              font-weight: bold;
              font-size: 16px;
              border-top: 2px solid #000;
              padding-top: 2px;
              margin-top: 2px;
            }
            .footer {
              text-align: center;
              margin-top: 4px;
              font-size: 9px;
              border-top: 1px dashed #000;
              padding-top: 2px;
            }
            @media print {
              body { width: 80mm; height: 80mm; margin: 0; padding: 2mm; }
              .receipt-header, .items-section, .totals-section, .footer { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <div class="store-name">URUTIROSE STORE</div>
            <div class="store-info">Your Trusted Shopping Destination</div>
            <div class="store-info">123 Main Street, City Center</div>
            <div class="store-info">Tel: +1 (555) 123-4567</div>
            <div class="store-info">www.urutirose.com</div>
          </div>
          
          <div class="receipt-info">
            <div>{tSync('Receipt #')}: ${invoiceNumber}</div>
            <div>{tSync('Date')}: ${new Date().toLocaleDateString('en-GB')}</div>
            <div>{tSync('Order Ref')}: ${currentOrderRef}</div>
            <div>{tSync('Time')}: ${new Date().toLocaleTimeString('en-GB', { hour12: false })}</div>
            <div>{tSync('Customer')}: ${selectedCustomer ? selectedCustomer.firstName + ' ' + selectedCustomer.lastName : tSync('Guest')}</div>
            <div>{tSync('Payment')}: ${paymentMethod.toUpperCase()}</div>
          </div>
          
          <div class="items-section">
            ${orderItems.map(item => `
              <div class="item-row">
                <div>
                  <div class="item-name">${item.name}</div>
                  <div class="item-details">${item.quantity} x ${formatCurrency(item.price).replace('RWF', '').trim()} RWF</div>
                  ${item.sku ? `<div class="item-details">SKU: ${item.sku}</div>` : ''}
                </div>
                <div style="text-align: right; font-weight: bold;">
                  ${formatCurrency(parseFloat(item.total) || 0).replace('RWF', '').trim()} RWF
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="totals-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(calculateSubtotal()).replace('RWF', '').trim()} RWF</span>
            </div>
            ${discountAmount > 0 ? `
              <div class="total-row" style="color: #666;">
                <span>Discount:</span>
                <span>-${formatCurrency(discountAmount).replace('RWF', '').trim()} RWF</span>
              </div>
            ` : ''}
            <div class="total-row">
              <span>Tax (18%):</span>
              <span>${formatCurrency(calculateTax()).replace('RWF', '').trim()} RWF</span>
            </div>
            <div class="total-row final-total">
              <span>{tSync('TOTAL')}:</span>
              <span>${formatCurrency(calculateTotal()).replace('RWF', '').trim()} RWF</span>
            </div>
            ${paymentStatus === 'pending' ? `
              <div class="total-row" style="margin-top: 8px; color: #666;">
                <span>{tSync('Paid')} (50%):</span>
                <span>${formatCurrency(calculateTotal() * 0.5).replace('RWF', '').trim()} RWF</span>
              </div>
              <div class="total-row" style="color: #666;">
                <span>{tSync('Balance')}:</span>
                <span>${formatCurrency(calculateTotal() * 0.5).replace('RWF', '').trim()} RWF</span>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <div>{tSync('Thank you for shopping with us!')}</div>
            <div>{tSync('Please keep this receipt')}</div>
            <div style="margin-top: 4px;">{tSync('Generated')}: ${new Date().toLocaleString('en-GB')}</div>
          </div>
        </body>
      </html>
    `);

    receiptWindow.document.close();

    // Auto-print after a short delay
    setTimeout(() => {
      receiptWindow.print();
      receiptWindow.close();
    }, 500);
  };

  // Enhanced print function with better styling
  const handlePrint = (contentId) => {
    const printContent = document.getElementById(contentId);
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    const invoiceNumber = generateInvoiceNumber();
    const orderRef = orderReference || generateOrderReference();

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoiceNumber} - URUTIROSE STORE</title>
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: white;
              color: #333;
              line-height: 1.4;
            }
            .invoice-header { 
              background: linear-gradient(135deg, #3b82f6, #1d4ed8); 
              color: white; 
              padding: 30px; 
              border-radius: 12px; 
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .company-info h1 { 
              margin: 0 0 8px 0; 
              font-size: 32px; 
              font-weight: bold;
            }
            .company-info p { 
              margin: 4px 0; 
              opacity: 0.9;
            }
            .invoice-details {
              text-align: right;
              border-left: 3px solid rgba(255,255,255,0.3);
              padding-left: 25px;
            }
            .invoice-details h2 {
              margin: 0 0 15px 0;
              font-size: 28px;
            }
            .invoice-details p {
              margin: 6px 0;
              font-size: 14px;
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 25px; 
              margin-bottom: 30px; 
            }
            .info-box { 
              background: #f8fafc; 
              padding: 20px; 
              border-radius: 10px;
              border: 1px solid #e2e8f0;
            }
            .info-box h4 {
              margin: 0 0 15px 0;
              color: #1e293b;
              font-size: 18px;
              font-weight: 600;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
              padding: 4px 0;
            }
            .info-row:not(:last-child) {
              border-bottom: 1px solid #e2e8f0;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 30px 0;
              background: white;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            th { 
              background: #f1f5f9; 
              padding: 15px 12px; 
              text-align: left; 
              font-weight: 600;
              color: #475569;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            td { 
              padding: 12px; 
              border-bottom: 1px solid #e2e8f0;
            }
            tr:hover { 
              background: #f8fafc; 
            }
            .summary-section { 
              background: #f8fafc; 
              padding: 25px; 
              border-radius: 10px;
              border: 1px solid #e2e8f0;
              margin-top: 30px;
            }
            .summary-section h4 {
              margin: 0 0 20px 0;
              color: #1e293b;
              font-size: 20px;
              font-weight: 600;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin: 12px 0;
              padding: 8px 0;
            }
            .summary-row.total {
              border-top: 2px solid #3b82f6;
              margin-top: 20px;
              padding-top: 15px;
              font-size: 24px;
              font-weight: bold;
              color: #3b82f6;
            }
            .discount-section {
              margin-top: 25px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
            }
            .discount-item {
              background: #ecfdf5;
              border: 1px solid #d1fae5;
              border-radius: 8px;
              padding: 12px;
              margin: 8px 0;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .payment-info {
              background: #fef3c7;
              border: 1px solid #fbbf24;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 12px;
            }
            @media print { 
              body { margin: 0; padding: 15px; }
              .invoice-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .info-box, .summary-section { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .discount-item { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .payment-info { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
          <div class="footer">
            <p>Thank you for your business! • Generated on ${new Date().toLocaleString('en-GB')}</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();

    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Export to PDF function
  const handleExportPDF = async (contentId) => {
    try {
      const printContent = document.getElementById(contentId);
      if (!printContent) return;

      // Create a new window for PDF generation
      const pdfWindow = window.open('', '_blank', 'width=800,height=600');
      const invoiceNumber = generateInvoiceNumber();

      pdfWindow.document.write(`
        <html>
          <head>
            <title>Invoice ${invoiceNumber} - URUTIROSE STORE</title>
            <style>
              * { box-sizing: border-box; }
              body { 
                font-family: 'Arial', sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: white;
                color: #333;
                line-height: 1.4;
              }
              /* Same styles as print but optimized for PDF */
              .invoice-header { 
                background: linear-gradient(135deg, #3b82f6, #1d4ed8); 
                color: white; 
                padding: 30px; 
                border-radius: 12px; 
                margin-bottom: 30px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
              }
              .company-info h1 { margin: 0 0 8px 0; font-size: 32px; font-weight: bold; }
              .company-info p { margin: 4px 0; opacity: 0.9; }
              .invoice-details { text-align: right; border-left: 3px solid rgba(255,255,255,0.3); padding-left: 25px; }
              .invoice-details h2 { margin: 0 0 15px 0; font-size: 28px; }
              .invoice-details p { margin: 6px 0; font-size: 14px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 30px; }
              .info-box { background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; }
              .info-box h4 { margin: 0 0 15px 0; color: #1e293b; font-size: 18px; font-weight: 600; }
              .info-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 4px 0; }
              .info-row:not(:last-child) { border-bottom: 1px solid #e2e8f0; }
              table { width: 100%; border-collapse: collapse; margin: 30px 0; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              th { background: #f1f5f9; padding: 15px 12px; text-align: left; font-weight: 600; color: #475569; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
              td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
              .summary-section { background: #f8fafc; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0; margin-top: 30px; }
              .summary-section h4 { margin: 0 0 20px 0; color: #1e293b; font-size: 20px; font-weight: 600; }
              .summary-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; }
              .summary-row.total { border-top: 2px solid #3b82f6; margin-top: 20px; padding-top: 15px; font-size: 24px; font-weight: bold; color: #3b82f6; }
              .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
            </style>
          </head>
          <body>
            ${printContent.outerHTML}
            <div class="footer">
              <p>Thank you for your business! • Generated on ${new Date().toLocaleString('en-GB')}</p>
              <p>This is a computer-generated invoice and does not require a signature.</p>
            </div>
          </body>
        </html>
      `);
      pdfWindow.document.close();

      // Focus and trigger print dialog (which can save as PDF)
      pdfWindow.focus();
      setTimeout(() => {
        pdfWindow.print();
      }, 500);

      toast.success('PDF export dialog opened. Choose "Save as PDF" in the print dialog.');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF. Please try again.');
    }
  };

  // Check if customer is a walk-in customer
  const isWalkInCustomer = (customer) => {
    if (!customer) return false;
    // Check by name
    if (customer.first_name === 'Walk-in' && customer.last_name === 'Customer') {
      return true;
    }
    // Check by email pattern (walkin*@urutirose.com)
    if (customer.email && customer.email.startsWith('walkin') && customer.email.endsWith('@urutirose.com')) {
      return true;
    }
    return false;
  };

  // Filter discounts to only show eligible ones (recalculates when orderItems or paymentStatus changes)
  const eligibleDiscounts = useMemo(() => {
    // Calculate subtotal directly instead of calling function
    const subtotal = orderItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const now = new Date();

    return availableDiscounts.filter(discount => {
      // Bottle return discounts are always available, regardless of customer
      if (discount.type === 'bottle_return') {
        // Check if discount is active
        if (!discount.is_active) return false;

        // Check date validity
        const startDate = discount.start_date ? new Date(discount.start_date) : null;
        const endDate = discount.end_date ? new Date(discount.end_date) : null;

        if (startDate && now < startDate) return false;
        if (endDate && now > endDate) return false;

        // Check minimum purchase amount
        if (discount.min_purchase_amount && subtotal < discount.min_purchase_amount) {
          return false;
        }

        // Check payment status compatibility
        if (paymentStatus === 'pending' && !discount.allow_partial_payment) {
          return false;
        }

        return true;
      }

      // For other discounts, walk-in customers are not eligible
      if (isWalkInCustomer(selectedCustomer)) {
        return false;
      }

      // Check if discount is active
      if (!discount.is_active) return false;

      // Check date validity
      const startDate = discount.start_date ? new Date(discount.start_date) : null;
      const endDate = discount.end_date ? new Date(discount.end_date) : null;

      if (startDate && now < startDate) return false;
      if (endDate && now > endDate) return false;

      // IMPORTANT: Check if discount applies to any products in the order
      // Parse product_types if it's a string
      let discountProductTypes = [];
      if (discount.product_types) {
        if (typeof discount.product_types === 'string') {
          try {
            discountProductTypes = JSON.parse(discount.product_types);
          } catch (e) {
            console.error('Error parsing discount product_types:', e);
          }
        } else if (Array.isArray(discount.product_types)) {
          discountProductTypes = discount.product_types;
        }
      }

      // If discount has product_types, check if any order item matches
      if (discountProductTypes.length > 0) {
        const hasMatchingProduct = orderItems.some(item => {
          const itemProductType = item.product_type || 'general';
          return discountProductTypes.includes(itemProductType);
        });

        // If no products in order match the discount's product types, discount is not eligible
        if (!hasMatchingProduct) {
          return false;
        }
      }

      // Calculate subtotal of matching products for minimum purchase check
      const matchingItemsSubtotal = orderItems
        .filter(item => {
          if (discountProductTypes.length === 0) return true; // If no product_types specified, include all
          const itemProductType = item.product_type || 'general';
          return discountProductTypes.includes(itemProductType);
        })
        .reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

      // Check minimum purchase amount (only on matching products)
      if (discount.min_purchase_amount && matchingItemsSubtotal < discount.min_purchase_amount) {
        return false;
      }

      // Check payment status compatibility
      if (paymentStatus === 'pending' && !discount.allow_partial_payment) {
        return false;
      }

      return true;
    });
  }, [availableDiscounts, orderItems, paymentStatus, selectedCustomer]);

  const handleDiscountSelection = (discount) => {
    const isSelected = selectedDiscounts.find(d => d.id === discount.id);

    if (isSelected) {
      setSelectedDiscounts(selectedDiscounts.filter(d => d.id !== discount.id));
    } else {
      // Prevent selecting multiple bottle return discounts
      if (discount.type === 'bottle_return') {
        const existingBottleReturn = selectedDiscounts.find(d => d.type === 'bottle_return');
        if (existingBottleReturn) {
          toast.error('Only one bottle return discount can be applied at a time. Please remove the existing bottle return discount first.');
          return;
        }
      }
      setSelectedDiscounts([...selectedDiscounts, discount]);
    }
  };

  const calculateDiscountAmount = () => {
    let totalDiscount = 0;
    const subtotal = calculateSubtotal();

    selectedDiscounts.forEach(discount => {
      // Parse product_types if it's a string
      let discountProductTypes = [];
      if (discount.product_types) {
        if (typeof discount.product_types === 'string') {
          try {
            discountProductTypes = JSON.parse(discount.product_types);
          } catch (e) {
            console.error('Error parsing discount product_types:', e);
          }
        } else if (Array.isArray(discount.product_types)) {
          discountProductTypes = discount.product_types;
        }
      }

      // Filter order items to only include those matching the discount's product types
      const matchingItems = orderItems.filter(item => {
        if (discountProductTypes.length === 0) return true; // If no product_types specified, include all
        const itemProductType = item.product_type || 'general';
        return discountProductTypes.includes(itemProductType);
      });

      // Calculate subtotal of matching items only
      const matchingItemsSubtotal = matchingItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

      // If no matching items, skip this discount
      if (matchingItems.length === 0) {
        return;
      }

      // Check minimum purchase amount requirement (only on matching products)
      if (discount.min_purchase_amount && matchingItemsSubtotal < discount.min_purchase_amount) {
        // Skip this discount if minimum purchase amount not met
        return;
      }

      // Check if discount is currently active (date validation)
      const now = new Date();
      const startDate = discount.start_date ? new Date(discount.start_date) : null;
      const endDate = discount.end_date ? new Date(discount.end_date) : null;

      if (startDate && now < startDate) {
        // Discount hasn't started yet
        return;
      }

      if (endDate && now > endDate) {
        // Discount has expired
        return;
      }

      switch (discount.type) {
        case 'percentage':
          // Apply percentage discount only to matching items
          totalDiscount += matchingItemsSubtotal * (discount.value / 100);
          break;
        case 'fixed_amount':
          // Apply fixed amount discount, capped at matching items subtotal
          totalDiscount += Math.min(discount.value, matchingItemsSubtotal);
          break;
        case 'bottle_return':
          // Fixed amount bottle return calculation
          if (discount.bottle_return_count) {
            const bottleReturnTiers = [
              { bottles: 1, discountAmount: 1000 },
              { bottles: 2, discountAmount: 2000 },
              { bottles: 3, discountAmount: 3000 },
              { bottles: 4, discountAmount: 4000 }
            ];
            const tier = bottleReturnTiers.find(t => t.bottles === discount.bottle_return_count);
            if (tier) {
              // Apply fixed amount discount, capped at matching items subtotal
              totalDiscount += Math.min(tier.discountAmount, matchingItemsSubtotal);
            }
          }
          break;
        default:
          break;
      }
    });

    setDiscountAmount(totalDiscount);
    return totalDiscount;
  };

  // Clear discounts when walk-in customer is selected (except bottle return discounts)
  useEffect(() => {
    if (isWalkInCustomer(selectedCustomer) && selectedDiscounts.length > 0) {
      // Keep bottle return discounts, remove others
      const bottleReturnDiscounts = selectedDiscounts.filter(d => d.type === 'bottle_return');
      const otherDiscounts = selectedDiscounts.filter(d => d.type !== 'bottle_return');

      if (otherDiscounts.length > 0) {
        setSelectedDiscounts(bottleReturnDiscounts);
        // Recalculate discount amount for remaining bottle return discounts
        if (bottleReturnDiscounts.length > 0) {
          // Recalculate manually to avoid dependency issues
          let totalDiscount = 0;
          const subtotal = calculateSubtotal();
          bottleReturnDiscounts.forEach(discount => {
            if (discount.bottle_return_count) {
              const bottleReturnTiers = [
                { bottles: 1, discountAmount: 1000 },
                { bottles: 2, discountAmount: 2000 },
                { bottles: 3, discountAmount: 3000 },
                { bottles: 4, discountAmount: 4000 }
              ];
              const tier = bottleReturnTiers.find(t => t.bottles === discount.bottle_return_count);
              if (tier) {
                totalDiscount += Math.min(tier.discountAmount, subtotal);
              }
            }
          });
          setDiscountAmount(totalDiscount);
        } else {
          setDiscountAmount(0);
        }
      }
    }
  }, [selectedCustomer, selectedDiscounts.length]);

  // Auto-apply discounts when conditions are met
  useEffect(() => {
    // Don't auto-apply for walk-in customers
    if (isWalkInCustomer(selectedCustomer)) {
      return;
    }

    if (selectedCustomer && orderItems.length > 0 && eligibleDiscounts.length > 0) {
      // Find discounts that should auto-apply (from eligible discounts only)
      const autoApplyDiscounts = eligibleDiscounts.filter(discount => {
        // Check if discount has auto_apply enabled
        if (!discount.auto_apply) return false;

        // Check if discount is already selected
        if (selectedDiscounts.find(d => d.id === discount.id)) return false;

        // All conditions already checked by isDiscountEligible - this discount should auto-apply
        return true;
      });

      // Auto-apply eligible discounts
      if (autoApplyDiscounts.length > 0) {
        const newAutoApplied = autoApplyDiscounts.filter(
          discount => {
            // Don't auto-apply if already selected
            if (selectedDiscounts.find(d => d.id === discount.id)) return false;

            // Prevent auto-applying multiple bottle return discounts
            if (discount.type === 'bottle_return') {
              const existingBottleReturn = selectedDiscounts.find(d => d.type === 'bottle_return');
              if (existingBottleReturn) return false;
            }

            return true;
          }
        );
        if (newAutoApplied.length > 0) {
          setSelectedDiscounts(prev => [...prev, ...newAutoApplied]);
          toast.success(`${newAutoApplied.length} discount(s) automatically applied! 🎉`);
        }
      }
    }
  }, [eligibleDiscounts, selectedCustomer, orderItems, paymentStatus, selectedDiscounts]);

  // Update discount amount when selected discounts change
  useEffect(() => {
    calculateDiscountAmount();
  }, [selectedDiscounts, orderItems]);

  // Refetch discounts when payment status changes
  useEffect(() => {
    fetchAvailableDiscounts();
    // Clear selected discounts when switching to partial payment
    if (paymentStatus === 'pending') {
      setSelectedDiscounts([]);
      setDiscountAmount(0);
    }
  }, [paymentStatus]);

  const addProductToOrder = (product, addedViaBarcode = false) => {
    const existingItem = orderItems.find(item => item.product_id === product.id);

    // Get user role to determine which quantity to use
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin';

    // Use shop quantity for cashiers, global quantity for admins
    const availableStock = isAdmin ?
      (product.global_quantity || product.stock_quantity || 0) :
      (product.stock_quantity || 0);

    if (existingItem) {
      // Prevent exceeding available stock
      if (existingItem.quantity >= (existingItem.available_stock ?? 0)) {
        showWarning(`Only ${existingItem.available_stock ?? 0} in stock for ${existingItem.name}`);
        return;
      }
      updateItemQuantity(product.id, existingItem.quantity + 1);
    } else {
      // Prevent adding out-of-stock products
      if (availableStock <= 0) {
        toast.error(`❌ ${product.name} is out of stock`);
        return;
      }
      const newItem = {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: product.price,
        currency: product.currency,
        product_type: product.product_type || 'general',
        quantity: 1,
        available_stock: availableStock,
        total: parseFloat(product.price),
        addedViaBarcode: addedViaBarcode
      };
      setOrderItems([...orderItems, newItem]);
      toast.success(`Added ${product.name} to cart`);
      // Smooth scroll cart into view on add
      try {
        document.getElementById('cart-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch { }
    }
    setProductSearch('');
    setBarcodeSearch('');
  };

  const searchProductByBarcode = async (barcode) => {
    if (!barcode.trim()) return;

    try {
      setIsScanning(true);

      // Find product by barcode
      const product = products.find(p => p.barcode === barcode.trim());

      if (product) {
        if (product.stock_quantity > 0) {
          addProductToOrder(product, true); // Mark as added via barcode

          // Play success sound (if available)
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMUGzOP2fPGcSEHLofN7N2PQAoUXbPn6qhWFQhEmdzyonMgBiuK0ey/ciMUKHfH8N2QQAoUXrTp66hVFApGn+DyvmMUGzOP2fPGcSEHLYfN7N2PQAoUXbPn6qhWFQhEmdzyonMgBiuK0ey/ciMUKHfH8N2QQAoUXrTp66hVFApGn+DyvmMUGzOP2fPGcSEHLYfN7N2PQAoUXbPn6qhWFQhEmdzyonMgBiuK0ey/ciMUKA==');
            audio.volume = 0.3;
            audio.play().catch(() => { }); // Ignore if audio fails
          } catch (e) {
            // Audio not supported, ignore
          }

          toast.success(`✅ Added ${product.name} to order via barcode scan`, {
            icon: '📊',
            duration: 2000
          });
        } else {
          toast.error(`❌ ${product.name} is out of stock`);
        }
      } else {
        toast.error(`❌ No product found with barcode: ${barcode}`);
      }

    } catch (error) {
      console.error('Error searching by barcode:', error);
      toast.error('Failed to search by barcode');
    } finally {
      setIsScanning(false);
    }
  };

  const handleBarcodeInput = (e) => {
    const value = e.target.value;
    setBarcodeSearch(value);

    // Auto-search when barcode is entered (typically 8+ digits)
    if (value.length >= 8 && /^\d+$/.test(value)) {
      searchProductByBarcode(value);
    }
  };

  const handleBarcodeKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchProductByBarcode(barcodeSearch);
    }
  };

  const simulateBarcodeScanner = () => {
    // In a real app, this would integrate with a barcode scanner device
    const mockBarcode = prompt('Enter barcode (or scan with device):');
    if (mockBarcode) {
      setBarcodeSearch(mockBarcode);
      searchProductByBarcode(mockBarcode);
    }
  };

  const updateItemQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItemFromOrder(productId);
      return;
    }

    setOrderItems(items => {
      const currentItem = items.find(i => i.product_id === productId);
      if (!currentItem) return items;

      const maxQty = currentItem.available_stock ?? Infinity;
      let appliedQty = newQuantity;
      if (newQuantity > maxQty) {
        appliedQty = maxQty;
        showWarning(`Cannot exceed stock for ${currentItem.name}. Available: ${maxQty}`);
      }

      return items.map(item => {
        if (item.product_id === productId) {
          return {
            ...item,
            quantity: appliedQty,
            total: parseFloat(item.price) * appliedQty
          };
        }
        return item;
      });
    });
  };

  const removeItemFromOrder = (productId) => {
    setOrderItems(items => items.filter(item => item.product_id !== productId));
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.18; // 18% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() - discountAmount; // Tax not added to total
  };

  const validateOrder = () => {
    const newErrors = {};

    if (orderItems.length === 0) {
      newErrors.items = 'Please add at least one item to the order';
    }

    // Check stock availability
    for (const item of orderItems) {
      if (item.quantity > item.available_stock) {
        newErrors.stock = `Insufficient stock for ${item.name}. Available: ${item.available_stock}`;
        break;
      }
    }

    if (!paymentMethod) {
      newErrors.payment = 'Please select a payment method';
    }

    if (!paymentStatus) {
      newErrors.paymentStatus = 'Please select a payment status';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Function to save order to database
  const saveOrderToDatabase = async () => {
    if (!validateOrder()) {
      toast.error('Please fix validation errors before completing the sale');
      return;
    }

    setLoading(true);

    // Generate order reference if not already set
    if (!orderReference) {
      setOrderReference(generateOrderReference());
    }
    try {
      let customerId = selectedCustomer?.id;

      // If no customer selected, create a default walk-in customer
      if (!customerId) {
        try {
          // Generate unique email and phone with timestamp and random suffix
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          const uniqueEmail = `walkin${timestamp}${randomSuffix}@urutirose.com`;
          const uniquePhone = `WALKIN-${timestamp}-${randomSuffix}`;

          const defaultCustomerData = {
            firstName: 'Walk-in',
            lastName: 'Customer',
            email: uniqueEmail,
            phone: uniquePhone,
            address: 'Store Location',
            city: 'City Center',
            state: 'State',
            postalCode: '12345',
            country: 'Country'
          };

          console.log('Creating default walk-in customer...');
          const customerResponse = await customersAPI.create(defaultCustomerData);
          customerId = customerResponse.data.customer.id;
          console.log('Default customer created with ID:', customerId);

          // Update the selected customer for this session
          setSelectedCustomer(customerResponse.data.customer);

        } catch (customerError) {
          console.error('Failed to create default customer:', customerError);
          // Check if it's a duplicate error and show a more helpful message
          if (customerError.response?.data?.error?.includes('already exists')) {
            toast.error(customerError.response.data.error);
          } else {
            toast.error('Failed to create default customer. Please try again.');
          }
          setLoading(false);
          return;
        }
      }

      // Calculate amounts based on payment status
      const subtotal = calculateSubtotal();
      const tax = calculateTax();
      const total = calculateTotal();

      // For pending orders, customer pays 50%
      const amountToPay = paymentStatus === 'pending' ? total * 0.5 : total;
      const remainingAmount = paymentStatus === 'pending' ? total * 0.5 : 0;

      const orderData = {
        customer_id: customerId,
        items: orderItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        })),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        notes: notes.trim() || null,
        currency: 'RWF',
        subtotal: subtotal,
        tax_amount: tax,
        discount_amount: discountAmount,
        total_amount: total,
        amount_paid: amountToPay,
        remaining_amount: remainingAmount,
        status: paymentStatus === 'pending' ? 'pending' : 'completed',
        discounts: selectedDiscounts.map(discount => ({
          discount_id: discount.id,
          discount_type: discount.type,
          discount_value: discount.value
        }))
      };

      console.log('Saving order to database:', orderData);

      const response = await ordersAPI.create(orderData);

      console.log('Order saved successfully:', response.data);

      toast.success('Order approved and saved to database successfully! 🎉');

      // Generate thermal receipt after successful sale
      setTimeout(() => {
        generateThermalReceipt();
      }, 1000);

      // Reset form after successful sale
      setOrderItems([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setProductSearch('');
      setPaymentMethod('cash');
      setPaymentStatus('complete'); // Reset to default payment status
      setNotes('');
      setErrors({});
      setSelectedDiscounts([]);
      setDiscountAmount(0);
      setShowOrderSummary(false);

      if (onOrderCreated) {
        onOrderCreated(response.data.order);
      }

    } catch (error) {
      console.error('Error saving order to database:', error);
      const errorMessage = error.response?.data?.error || 'Failed to save order to database';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Modern POS layout
  if (modernPOS) {
    return (
      <>
        <div className="flex flex-col xl:flex-row h-full w-full bg-white shadow-sm border border-gray-200 overflow-hidden">
          {/* Left: Product/Customer Search */}
          <div className="w-full xl:w-2/3 p-2 sm:p-3 lg:p-4 flex flex-col gap-3 sm:gap-4 overflow-y-auto bg-gradient-to-br from-gray-50 to-white">
            {/* Customer Selection */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2">
                <label className="block text-sm sm:text-base font-semibold text-gray-700">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 inline mr-2" /><TranslatedText text="Customer (Optional)" />
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {customersLoading ? <TranslatedText text="Loading..." /> : `${customers.length} ${tSync('customers loaded')}`}
                  </span>
                  <button
                    onClick={fetchCustomers}
                    disabled={customersLoading}
                    className="flex items-center text-xs sm:text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                    title="Refresh customers from database"
                  >
                    {customersLoading ? (
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-primary-600 mr-1"></div>
                    ) : (
                      <div className="text-sm sm:text-lg">🔄</div>
                    )}
                    <span className="hidden sm:inline"><TranslatedText text="Refresh" /></span>
                  </button>
                </div>
              </div>

              {selectedCustomer ? (
                <div className="flex items-center justify-between p-3 sm:p-4 bg-primary-50 border border-primary-200 rounded-xl shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary-900 text-sm sm:text-lg truncate">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </p>
                    <p className="text-xs sm:text-sm text-primary-600 truncate">{selectedCustomer.email}</p>
                    <p className="text-xs text-primary-500">
                      {selectedCustomer.loyalty_tier} • {selectedCustomer.loyalty_points} points
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-primary-500 hover:text-primary-700 p-1 sm:p-2 rounded-full bg-primary-100 ml-2 flex-shrink-0"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={tSync("Search customers by name or email...")}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
                  />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearch('')}
                      className="absolute right-2 top-2 sm:top-2.5 text-gray-400 hover:text-gray-600"
                      aria-label="Clear customer search"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  )}
                  {customerSearch && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 sm:max-h-64 overflow-y-auto z-10">
                      {filteredCustomers.map(customer => (
                        <button
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setCustomerSearch('');
                          }}
                          className="w-full text-left p-3 sm:p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="font-semibold text-gray-900 text-sm sm:text-base">
                            {customer.first_name} {customer.last_name}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">{customer.email}</p>
                          <p className="text-xs text-gray-500">
                            {customer.loyalty_tier} • {customer.loyalty_points} points
                          </p>
                        </button>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <p className="p-3 sm:p-4 text-gray-500 text-center text-sm">No customers found</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Product Search & Barcode */}
            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 inline mr-2" /><TranslatedText text="Add Products" />
              </label>
              {/* Barcode Scanner Section */}
              <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <Scan className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    <span className="text-sm sm:text-base font-semibold text-blue-800"><TranslatedText text="Quick Add by Barcode" /></span>
                  </div>
                  <div className="text-xs text-blue-600">
                    <kbd className="px-1 py-0.5 bg-white border border-blue-300 rounded text-xs">F2</kbd> Focus |
                    <kbd className="px-1 py-0.5 bg-white border border-blue-300 rounded text-xs ml-1">F3</kbd> Scan
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 relative">
                    <input
                      id="barcode-input"
                      type="text"
                      placeholder={tSync("Scan or enter barcode...")}
                      value={barcodeSearch}
                      onChange={handleBarcodeInput}
                      onKeyPress={handleBarcodeKeyPress}
                      disabled={isScanning}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    />
                    {isScanning && (
                      <div className="absolute right-2 top-2">
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={simulateBarcodeScanner}
                      disabled={isScanning}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                      title="Activate barcode scanner (F3)"
                    >
                      <Scan className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="ml-1 hidden sm:inline"><TranslatedText text="Scan" /></span>
                    </button>
                    {barcodeSearch && (
                      <button
                        onClick={() => setBarcodeSearch('')}
                        className="px-2 py-2 text-gray-400 hover:text-gray-600"
                        title="Clear barcode"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  💡 <TranslatedText text="Tip" />: <TranslatedText text="Products are automatically added when a valid barcode is scanned or entered" />
                </p>
              </div>
              {/* Regular Product Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  id="product-search-input"
                  type="text"
                  placeholder={tSync("Search products by name, SKU, or brand")}
                  aria-label="Search products"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-10 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch('')}
                    className="absolute right-2 top-2 sm:top-2.5 text-gray-400 hover:text-gray-600"
                    aria-label="Clear product search"
                    title="Clear"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                )}
                {(productSearch || barcodeSearch) && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto z-10">
                    {sortedProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addProductToOrder(product)}
                        disabled={product.stock_quantity <= 0}
                        className="w-full text-left p-3 sm:p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{product.name}</p>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {product.sku} • {product.brand_name}
                              {product.barcode && (
                                <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                                  📊 {product.barcode}
                                </span>
                              )}
                            </p>
                            <p className="text-sm font-semibold text-primary-600">
                              {formatCurrency(product.price, product.currency)}
                            </p>
                          </div>
                          <div className="text-right sm:text-left">
                            <p className={`text-xs sm:text-sm ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Stock: {product.stock_quantity}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {sortedProducts.length === 0 && (
                      <p className="p-3 sm:p-4 text-gray-500 text-center text-sm"><TranslatedText text="No products found" /></p>
                    )}
                  </div>
                )}
              </div>

              {/* Product Cards Grid */}
              <div className="mb-4 hidden sm:block">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900"><TranslatedText text="All Available Products" /></h3>
                  <div className="flex items-center gap-2">
                    <label htmlFor="sortField" className="text-xs text-gray-500"><TranslatedText text="Sort by" /></label>
                    <select
                      id="sortField"
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value)}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                    >
                      <option value="name"><TranslatedText text="Name" /></option>
                      <option value="price"><TranslatedText text="Price" /></option>
                      <option value="stock"><TranslatedText text="Stock" /></option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                      title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                      aria-label="Toggle sort direction"
                    >
                      {sortDirection === 'asc' ? '⬆︎' : '⬇︎'}
                    </button>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {productSearch.trim()
                        ? `${totalProducts} ${tSync('matching products')}`
                        : `${totalProducts} ${tSync('products')} • ${tSync('Page')} ${currentPage} ${tSync('of')} ${totalPages}`
                      }
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                  {paginatedProducts.map(product => (
                    <div
                      key={product.id}
                      className={`relative bg-white border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${product.stock_quantity <= 0
                        ? 'border-red-200 opacity-60'
                        : 'border-gray-200 hover:border-primary-300'
                        }`}
                    >
                      {product.stock_quantity > 0 && product.stock_quantity <= 20 && (
                        <div className="absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Low stock ({product.stock_quantity})
                        </div>
                      )}
                      <div className="p-3 sm:p-4">
                        {/* Product Header */}
                        <div className="mb-3">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 line-clamp-2">
                            {product.name}
                          </h4>
                          <p className="text-xs text-gray-500 mb-2">
                            {product.sku} • {product.brand_name}
                          </p>
                          {product.barcode && (
                            <div className="flex items-center text-xs text-gray-400 mb-2">
                              <span className="mr-1">📊</span>
                              <span className="font-mono">{product.barcode}</span>
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between items-center">
                            <span className="text-lg sm:text-xl font-bold text-primary-600">
                              {formatCurrency(product.price, product.currency)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Stock:</span>
                            {(() => {
                              const user = JSON.parse(localStorage.getItem('user') || '{}');
                              const isAdmin = user.role === 'admin';
                              const displayQuantity = isAdmin ?
                                (product.global_quantity || product.stock_quantity || 0) :
                                (product.stock_quantity || 0);
                              const stockLabel = isAdmin ? 'Global' : 'Shop';

                              return (
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${displayQuantity > 10
                                  ? 'bg-green-100 text-green-800'
                                  : displayQuantity > 0
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                  }`}>
                                  {displayQuantity} ({stockLabel})
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Add to Cart Button */}
                        <div className="flex gap-2">
                          {(() => {
                            const user = JSON.parse(localStorage.getItem('user') || '{}');
                            const isAdmin = user.role === 'admin';
                            const availableStock = isAdmin ?
                              (product.global_quantity || product.stock_quantity || 0) :
                              (product.stock_quantity || 0);

                            return (
                              <button
                                onClick={() => addProductToOrder(product)}
                                disabled={availableStock <= 0}
                                className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center ${availableStock <= 0
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-md transform hover:scale-105'
                                  }`}
                              >
                                {availableStock <= 0 ? (
                                  <>
                                    <X className="h-4 w-4 mr-1" />
                                    Out of Stock
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add to Cart
                                  </>
                                )}
                              </button>
                            );
                          })()}
                          {(() => {
                            const user = JSON.parse(localStorage.getItem('user') || '{}');
                            const isAdmin = user.role === 'admin';
                            const availableStock = isAdmin ?
                              (product.global_quantity || product.stock_quantity || 0) :
                              (product.stock_quantity || 0);

                            return availableStock > 0 && (
                              <button
                                type="button"
                                onClick={() => addProductToOrder({ ...product, quantity: 1 })}
                                className="px-3 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200"
                                title="Quick add 1"
                                aria-label={`Quick add one ${product.name}`}
                              >
                                +1
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls - Only show when not searching */}
                {totalPages > 1 && !productSearch.trim() && (
                  <div className="flex items-center justify-between mt-6 px-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>

                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg ${currentPage === pageNum
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                                }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <span className="px-2 py-2 text-gray-500">...</span>
                            <button
                              onClick={() => setCurrentPage(totalPages)}
                              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700"
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    <div className="text-sm text-gray-500">
                      Showing {startIndex + 1}-{Math.min(endIndex, totalProducts)} of {totalProducts} products
                    </div>
                  </div>
                )}

                {sortedProducts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-lg font-medium"><TranslatedText text="No products available" /></p>
                    <p className="text-sm"><TranslatedText text="Products will appear here once they are added to the system" /></p>
                  </div>
                )}
              </div>
            </div>

            {/* Error messages */}
            {errors.items && (
              <div className="flex items-center text-red-600 text-sm sm:text-base">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                {errors.items}
              </div>
            )}
            {errors.stock && (
              <div className="flex items-center text-red-600 text-sm sm:text-base">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                {errors.stock}
              </div>
            )}
          </div>

          {/* Right: Cart & Summary (Sticky) */}
          <div id="cart-container" className="w-full xl:w-1/3 p-2 sm:p-3 lg:p-4 flex flex-col gap-3 sm:gap-4 bg-gradient-to-br from-slate-50 to-gray-100 border-t xl:border-t-0 xl:border-l border-gray-200 h-full relative">
            {/* Sticky Cart */}
            <div className="flex-1 overflow-y-auto">
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                <TranslatedText text="Cart" /> ({orderItems.length})
              </label>
              <div className="border border-gray-200 rounded-xl max-h-48 sm:max-h-64 overflow-y-auto bg-white shadow-sm">
                {orderItems.length === 0 ? (
                  <div className="p-4 sm:p-6 text-center text-gray-500">
                    <Package className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm sm:text-base"><TranslatedText text="No items added yet" /></p>
                    <p className="text-xs sm:text-sm"><TranslatedText text="Search for products to add them to the order" /></p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {orderItems.map(item => (
                      <div key={item.product_id} className="p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-semibold text-gray-900 truncate text-sm sm:text-base">{item.name}</p>
                            {item.addedViaBarcode && (
                              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                <Scan className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />Scanned
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {item.sku}
                            {item.barcode && (
                              <span className="ml-2 text-xs text-gray-500">📊 {item.barcode}</span>
                            )}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500">{formatCurrency(item.price, 'RWF')} each</p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end space-x-2 sm:ml-4">
                          <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <button
                                onClick={() => updateItemQuantity(item.product_id, item.quantity - 1)}
                                className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 bg-gray-100 rounded-full"
                              >
                                <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                              <input
                                type={item.product_type === 'perfume' ? 'text' : 'number'}
                                min="1"
                                max={item.available_stock || 999}
                                value={item.quantity}
                                onChange={(e) => {
                                  if (item.product_type === 'perfume') {
                                    // For perfume, allow direct typing of any value
                                    const inputValue = e.target.value;
                                    // Allow empty string for typing, but validate on blur
                                    if (inputValue === '' || inputValue === '0') {
                                      // Allow empty or zero for typing, will be validated on blur
                                      return;
                                    }
                                    const numericValue = parseInt(inputValue) || 0;
                                    if (numericValue >= 1 && numericValue <= (item.available_stock || 999)) {
                                      updateItemQuantity(item.product_id, numericValue);
                                    }
                                  } else {
                                    // For non-perfume products, use normal number input
                                    const newQuantity = parseInt(e.target.value) || 1;
                                    if (newQuantity >= 1 && newQuantity <= (item.available_stock || 999)) {
                                      updateItemQuantity(item.product_id, newQuantity);
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  if (item.product_type === 'perfume') {
                                    const inputValue = e.target.value;
                                    const numericValue = parseInt(inputValue) || 1;
                                    if (numericValue < 1) {
                                      updateItemQuantity(item.product_id, 1);
                                    } else if (numericValue > (item.available_stock || 999)) {
                                      updateItemQuantity(item.product_id, item.available_stock || 999);
                                    } else {
                                      updateItemQuantity(item.product_id, numericValue);
                                    }
                                  } else {
                                    const newQuantity = parseInt(e.target.value) || 1;
                                    if (newQuantity < 1) {
                                      updateItemQuantity(item.product_id, 1);
                                    } else if (newQuantity > (item.available_stock || 999)) {
                                      updateItemQuantity(item.product_id, item.available_stock || 999);
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  }
                                }}
                                placeholder={item.product_type === 'perfume' ? ' Type quantity...' : ''}
                                className={`w-8 sm:w-12 text-center font-semibold text-sm sm:text-lg border border-gray-300 rounded px-1 py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${item.product_type === 'perfume' ? 'bg-yellow-50' : ''
                                  }`}
                              />
                              <button
                                onClick={() => updateItemQuantity(item.product_id, item.quantity + 1)}
                                disabled={item.quantity >= item.available_stock}
                                className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                            </div>

                            {/* Quick quantity buttons for perfume products */}
                            {item.product_type === 'perfume' && (
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500 mr-2">Quick:</span>
                                <button
                                  onClick={() => updateItemQuantity(item.product_id, 30)}
                                  className={`px-2 py-1 text-xs rounded ${item.quantity === 30
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    }`}
                                >
                                  30
                                </button>
                                <button
                                  onClick={() => updateItemQuantity(item.product_id, 50)}
                                  className={`px-2 py-1 text-xs rounded ${item.quantity === 50
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    }`}
                                >
                                  50
                                </button>
                                <button
                                  onClick={() => updateItemQuantity(item.product_id, 100)}
                                  className={`px-2 py-1 text-xs rounded ${item.quantity === 100
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    }`}
                                >
                                  100
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 sm:w-20 text-right">
                              <p className="font-semibold text-sm sm:text-base">{formatCurrency(parseFloat(item.total) || 0, 'RWF')}</p>
                            </div>
                            <button
                              onClick={() => removeItemFromOrder(item.product_id)}
                              className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 bg-red-50 rounded-full"
                            >
                              <X className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Order Summary */}
            {orderItems.length > 0 && (
              <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-base sm:text-lg"><TranslatedText text="Order Summary" /></h3>
                <div className="space-y-1.5 sm:space-y-2 text-sm sm:text-base">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(calculateSubtotal(), 'RWF')}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(discountAmount, 'RWF')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax (18%):</span>
                    <span>{formatCurrency(calculateTax(), 'RWF')}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 sm:pt-3 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateTotal(), 'RWF')}</span>
                  </div>
                </div>

                {/* Discount Section - Show if customer selected OR if bottle return discounts available */}
                {((selectedCustomer && eligibleDiscounts.length > 0) || eligibleDiscounts.some(d => d.type === 'bottle_return')) && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base">Available Discounts</h4>
                      <button
                        onClick={() => setShowDiscountModal(true)}
                        className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View All ({eligibleDiscounts.length})
                      </button>
                    </div>
                    <div className="space-y-2">
                      {eligibleDiscounts.slice(0, 2).map((discount) => (
                        <div
                          key={discount.id}
                          className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border cursor-pointer transition-colors ${selectedDiscounts.find(d => d.id === discount.id)
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                          onClick={() => handleDiscountSelection(discount)}
                        >
                          <div className="flex items-center">
                            <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 mr-2 sm:mr-3 ${selectedDiscounts.find(d => d.id === discount.id)
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-gray-300'
                              }`}>
                              {selectedDiscounts.find(d => d.id === discount.id) && (
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full m-0.5"></div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-xs sm:text-sm">{discount.name}</div>
                              <div className="text-xs text-gray-500">{discount.description}</div>
                            </div>
                          </div>
                          <div className="text-xs sm:text-sm font-medium text-primary-600">
                            {discount.type === 'percentage' && `${discount.value}%`}
                            {discount.type === 'fixed_amount' && formatCurrency(discount.value, 'RWF')}
                            {discount.type === 'bottle_return' && `${discount.bottle_return_count} bottles`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Payment Method */}
            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 inline mr-2" /><TranslatedText text="Payment Method" />
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="cash"><TranslatedText text="Cash" /></option>
                <option value="card"><TranslatedText text="Card" /></option>
                <option value="momo"><TranslatedText text="Momo" /></option>
                <option value="mobile_money"><TranslatedText text="Mobile Money" /></option>
              </select>
              {errors.payment && (
                <p className="text-red-600 text-sm sm:text-base mt-1">{errors.payment}</p>
              )}
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 inline mr-2" /><TranslatedText text="Payment Status" />
              </label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentStatus"
                    value="complete"
                    checked={paymentStatus === 'complete'}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm sm:text-base font-medium text-gray-900"><TranslatedText text="Complete Payment" /></span>
                    <p className="text-xs text-gray-500"><TranslatedText text="Customer pays full amount, product removed from stock" /></p>
                  </div>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentStatus"
                    value="pending"
                    checked={paymentStatus === 'pending'}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm sm:text-base font-medium text-gray-900"><TranslatedText text="Partial Payment (Reservation)" /></span>
                    <p className="text-xs text-gray-500"><TranslatedText text="Customer pays 50%, product reserved until full payment" /></p>
                  </div>
                </label>
              </div>
              {errors.paymentStatus && (
                <p className="text-red-600 text-sm sm:text-base mt-1">{errors.paymentStatus}</p>
              )}
            </div>
            {/* Notes */}
            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2"><TranslatedText text="Notes (Optional)" /></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={tSync("Add any special instructions or notes...")}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            {/* Sale Button */}
            <div className="sticky bottom-0 bg-gradient-to-br from-slate-50 to-gray-100 pt-2">
              <button
                onClick={() => setShowOrderSummary(true)}
                disabled={orderItems.length === 0}
                className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-base sm:text-lg font-bold hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                <TranslatedText text="Complete Sale" />
                <span className="ml-2 hidden sm:inline text-green-100 text-xs font-normal">(Enter)</span>
              </button>
            </div>
          </div>

        </div>

        {/* Discount Selection Modal */}
        {showDiscountModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Select Discounts" /></h3>
                  {paymentStatus === 'pending' && (
                    <p className="text-sm text-orange-600 mt-1">
                      ⚠️ <TranslatedText text="Limited discounts available for partial payments" />
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowDiscountModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                {eligibleDiscounts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    {paymentStatus === 'pending' ? (
                      <div>
                        <p className="text-gray-500 mb-2"><TranslatedText text="No discounts available for partial payments" /></p>
                        <p className="text-sm text-orange-600">
                          <TranslatedText text="Complete the full payment to access all available discounts" />
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500"><TranslatedText text="No discounts available for this customer" /></p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {eligibleDiscounts.map((discount) => {
                      const subtotal = calculateSubtotal();
                      const isSelected = selectedDiscounts.find(d => d.id === discount.id);

                      return (
                        <div
                          key={discount.id}
                          className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${isSelected
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                          onClick={() => handleDiscountSelection(discount)}
                        >
                          <div className="flex items-center">
                            <div className={`w-5 h-5 rounded-full border-2 mr-4 ${isSelected
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-gray-300'
                              }`}>
                              {isSelected && (
                                <div className="w-2.5 h-2.5 bg-white rounded-full m-0.5"></div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{discount.name}</div>
                              <div className="text-sm text-gray-500">{discount.description}</div>
                              <div className="text-xs mt-1">
                                {discount.min_purchase_amount && (
                                  <span className="text-green-600">
                                    <TranslatedText text="Min purchase" />: RWF {discount.min_purchase_amount.toLocaleString()}
                                  </span>
                                )}
                                {discount.usage_limit && (
                                  <span className="text-gray-400 ml-2">• <TranslatedText text="Usage limit" />: {discount.usage_limit}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-primary-600">
                              {discount.type === 'percentage' && `${discount.value}%`}
                              {discount.type === 'fixed_amount' && `RWF ${discount.value.toLocaleString()}`}
                              {discount.type === 'bottle_return' && `${discount.bottle_return_count} bottles`}
                            </div>
                            <div className="text-xs text-gray-500">
                              {discount.type === 'percentage' && tSync("Save up to RWF {{amount}}", { amount: (calculateSubtotal() * discount.value / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) })}
                              {discount.type === 'fixed_amount' && tSync("Save RWF {{amount}}", { amount: Math.min(discount.value, calculateSubtotal()).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) })}
                              {discount.type === 'bottle_return' && <TranslatedText text="Eco-friendly discount" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => setShowDiscountModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  <TranslatedText text="Close" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary Popup Modal */}
        {showOrderSummary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
              {/* Store Information Header */}
              <div className="bg-primary-600 border-b-2 border-primary-700 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-white"><TranslatedText text="URUTIROSE STORE" /></h1>
                    <p className="text-primary-100 mt-1">Your Trusted Shopping Destination</p>
                    <div className="mt-3 text-sm text-primary-100 space-y-1">
                      <p>📍 123 Main Street, City Center, Country</p>
                      <p>📞 +1 (555) 123-4567 | 📧 info@urutirose.com</p>
                      <p>🌐 www.urutirose.com</p>
                    </div>
                  </div>
                  <div className="text-right border-l-2 border-primary-500 pl-6">
                    <div className="text-2xl font-bold text-white">INVOICE</div>
                    <div className="mt-2 text-sm text-primary-100 space-y-1">
                      <p><span className="font-medium"><TranslatedText text="Invoice" /> #:</span> {generateInvoiceNumber()}</p>
                      <p><span className="font-medium"><TranslatedText text="Order Ref" />:</span> {orderReference || generateOrderReference()}</p>
                      <p><span className="font-medium"><TranslatedText text="Date" />:</span> {new Date().toLocaleDateString('en-GB')}</p>
                      <p><span className="font-medium"><TranslatedText text="Time" />:</span> {new Date().toLocaleTimeString('en-GB', { hour12: false })}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Content */}
              <div className="p-6" id="invoice-content">
                {/* Invoice Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 text-lg"><TranslatedText text="Customer Information" /></h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600"><TranslatedText text="Name" />:</span>
                        <span className="font-medium">
                          {selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : <TranslatedText text="Guest Customer" />}
                        </span>
                      </div>
                      {selectedCustomer && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-medium">{selectedCustomer.email}</span>
                          </div>
                          {selectedCustomer.phone && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Phone:</span>
                              <span className="font-medium">{selectedCustomer.phone}</span>
                            </div>
                          )}
                          {selectedCustomer.address && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Address:</span>
                              <span className="font-medium max-w-xs text-right">{selectedCustomer.address}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600"><TranslatedText text="Payment Method" />:</span>
                        <span className="font-medium capitalize">{paymentMethod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600"><TranslatedText text="Payment Status" />:</span>
                        <span className={`font-medium capitalize ${paymentStatus === 'pending' ? 'text-orange-600' : 'text-green-600'
                          }`}>
                          {paymentStatus === 'pending' ? <TranslatedText text="Partial Payment (50%)" /> : <TranslatedText text="Complete Payment" />}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 text-lg"><TranslatedText text="Order Information" /></h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600"><TranslatedText text="Items" />:</span>
                        <span className="font-medium">{orderItems.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600"><TranslatedText text="Total Items" />:</span>
                        <span className="font-medium">{orderItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600"><TranslatedText text="Subtotal" />:</span>
                        <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600"><TranslatedText text="Discounts" />:</span>
                          <span className="font-medium text-green-600">-{formatCurrency(discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600"><TranslatedText text="Tax (18%)" />:</span>
                        <span className="font-medium">{formatCurrency(calculateTax())}</span>
                      </div>
                      <div className="flex justify-between font-medium text-primary-600">
                        <span><TranslatedText text="Total" />:</span>
                        <span>{formatCurrency(calculateTotal())}</span>
                      </div>
                      {notes && (
                        <div className="flex justify-between">
                          <span className="text-gray-600"><TranslatedText text="Notes" />:</span>
                          <span className="font-medium max-w-xs text-right">{notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Invoice Items Table */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 text-lg"><TranslatedText text="Order Items" /></h4>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><TranslatedText text="Item" /></th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"><TranslatedText text="Qty" /></th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"><TranslatedText text="Price" /></th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"><TranslatedText text="Total" /></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {orderItems.map(item => (
                          <tr key={item.product_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900">{item.name}</p>
                                <p className="text-xs text-gray-500">SKU: {item.sku || item.product_sku || 'N/A'}</p>
                                {item.barcode && (
                                  <p className="text-xs text-gray-500">📊 {item.barcode}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">{item.quantity} unit</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600">{formatCurrency(item.price)}</td>
                            <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(parseFloat(item.total) || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 text-lg"><TranslatedText text="Financial Summary" /></h4>

                  <div className="space-y-3">
                    <div className="flex justify-between text-base">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-base text-green-600">
                        <span><TranslatedText text="Discount" />:</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base">
                      <span className="text-gray-600"><TranslatedText text="Tax (18%)" />:</span>
                      <span className="font-medium">{formatCurrency(calculateTax())}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-3 mt-4">
                      <div className="flex justify-between text-xl font-bold text-primary-600">
                        <span><TranslatedText text="Total" />:</span>
                        <span>{formatCurrency(calculateTotal())}</span>
                      </div>
                      {paymentStatus === 'pending' && (
                        <>
                          <div className="flex justify-between text-base text-orange-600 mt-3">
                            <span><TranslatedText text="Amount to Pay (50%)" />:</span>
                            <span className="font-bold">{formatCurrency(calculateTotal() * 0.5)}</span>
                          </div>
                          <div className="flex justify-between text-base text-gray-600">
                            <span><TranslatedText text="Remaining Balance" />:</span>
                            <span className="font-medium">{formatCurrency(calculateTotal() * 0.5)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Discount Summary */}
                  {selectedDiscounts.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h5 className="font-medium text-gray-900 mb-3"><TranslatedText text="Applied Discounts" /></h5>
                      <div className="space-y-2">
                        {selectedDiscounts.map((discount) => (
                          <div key={discount.id} className="flex justify-between items-center p-2 bg-green-50 rounded-lg border border-green-200">
                            <div>
                              <p className="font-medium text-sm text-green-800">{discount.name}</p>
                              <p className="text-xs text-green-600">{discount.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-green-800">
                                {discount.type === 'percentage' && `${discount.value}%`}
                                {discount.type === 'fixed_amount' && `$${discount.value}`}
                                {discount.type === 'bottle_return' && `${discount.bottle_return_count} bottles`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Footer Actions */}
              <div className="flex justify-between items-center gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint('invoice-content')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    title="Print Invoice"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <TranslatedText text="Print" />
                  </button>
                  <button
                    onClick={() => handleExportPDF('invoice-content')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                    title="Export as PDF"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowOrderSummary(false)}
                    className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    <TranslatedText text="Close" />
                  </button>
                  <button
                    onClick={() => saveOrderToDatabase()}
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <TranslatedText text="Saving Order..." />
                      </>
                    ) : (
                      <TranslatedText text="Complete Sale" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </>
    );
  }

  // Fallback: legacy/modal layout
  return (
    <div className={isFullPage
      ? "max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6"
      : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
    }>
      <div className={isFullPage
        ? "bg-white rounded-lg shadow-sm border border-gray-200"
        : "bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"
      }>

        <div className="p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column - Customer & Products */}
          <div className="space-y-6">
            {/* Customer Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <label className="block text-sm font-medium text-gray-700">
                    <User className="h-4 w-4 inline mr-1" />
                    <TranslatedText text="Customer (Optional)" />
                  </label>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {customersLoading ? <TranslatedText text="Loading..." /> : tSync("{{count}} customers", { count: customers.length })}
                  </span>
                </div>
                <button
                  onClick={fetchCustomers}
                  disabled={customersLoading}
                  className="flex items-center text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50"
                  title="Refresh customers from database"
                >
                  {customersLoading ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600 mr-1"></div>
                  ) : (
                    <div className="text-sm">🔄</div>
                  )}
                  <TranslatedText text="Refresh" />
                </button>
              </div>

              {selectedCustomer ? (
                <div className="flex items-center justify-between p-3 bg-primary-50 border border-primary-200 rounded-lg">
                  <div>
                    <p className="font-medium text-primary-900">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </p>
                    <p className="text-sm text-primary-600">{selectedCustomer.email}</p>
                    <p className="text-xs text-primary-500">
                      {selectedCustomer.loyalty_tier} • {selectedCustomer.loyalty_points} points
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-primary-500 hover:text-primary-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={tSync("Search customers by name or email...")}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />

                  {customerSearch && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 sm:max-h-64 overflow-y-auto z-10">
                      {filteredCustomers.map(customer => (
                        <button
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setCustomerSearch('');
                          }}
                          className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="font-medium text-gray-900">
                            {customer.first_name} {customer.last_name}
                          </p>
                          <p className="text-sm text-gray-600">{customer.email}</p>
                          <p className="text-xs text-gray-500">
                            {customer.loyalty_tier} • {customer.loyalty_points} points
                          </p>
                        </button>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <p className="p-3 text-gray-500 text-center"><TranslatedText text="No customers found" /></p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Product Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Package className="h-4 w-4 inline mr-1" />
                <TranslatedText text="Add Products" />
              </label>

              {/* Barcode Scanner Section */}
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Scan className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800"><TranslatedText text="Quick Add by Barcode" /></span>
                  </div>
                  <div className="text-xs text-blue-600">
                    <kbd className="px-1 py-0.5 bg-white border border-blue-300 rounded text-xs">F2</kbd> <TranslatedText text="Focus" /> |
                    <kbd className="px-1 py-0.5 bg-white border border-blue-300 rounded text-xs ml-1">F3</kbd> <TranslatedText text="Scan" />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      id="barcode-input"
                      type="text"
                      placeholder={tSync("Scan or enter barcode...")}
                      value={barcodeSearch}
                      onChange={handleBarcodeInput}
                      onKeyPress={handleBarcodeKeyPress}
                      disabled={isScanning}
                      className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    {isScanning && (
                      <div className="absolute right-2 top-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={simulateBarcodeScanner}
                    disabled={isScanning}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                    title="Activate barcode scanner (F3)"
                  >
                    <Scan className="h-4 w-4" />
                  </button>

                  {barcodeSearch && (
                    <button
                      onClick={() => setBarcodeSearch('')}
                      className="px-2 py-2 text-gray-400 hover:text-gray-600"
                      title="Clear barcode"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-blue-600 mt-1">
                  💡 <TranslatedText text="Tip: Products are automatically added when a valid barcode is scanned or entered" />
                </p>
              </div>


              {/* Regular Product Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  id="product-search-input"
                  type="text"
                  placeholder={tSync("Search products by name, SKU, or brand")}
                  aria-label="Search products"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-10 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch('')}
                    className="absolute right-2 top-2 sm:top-2.5 text-gray-400 hover:text-gray-600"
                    aria-label="Clear product search"
                    title="Clear"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                )}
                {(productSearch || barcodeSearch) && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto z-10">
                    {sortedProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addProductToOrder(product)}
                        disabled={product.stock_quantity <= 0}
                        className="w-full text-left p-3 sm:p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{product.name}</p>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {product.sku} • {product.brand_name}
                              {product.barcode && (
                                <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                                  📊 {product.barcode}
                                </span>
                              )}
                            </p>
                            <p className="text-sm font-semibold text-primary-600">
                              ${product.price} {product.currency}
                            </p>
                          </div>
                          <div className="text-right sm:text-left">
                            <p className={`text-xs sm:text-sm ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Stock: {product.stock_quantity}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {sortedProducts.length === 0 && (
                      <p className="p-3 sm:p-4 text-gray-500 text-center text-sm"><TranslatedText text="No products found" /></p>
                    )}
                  </div>
                )}
              </div>

              {/* Product Cards Grid */}
              <div className="mb-4 hidden sm:block">
                <div className="flex items-center justify-between mb-3 sticky top-0 z-10 bg-gradient-to-br from-gray-50 to-white py-2">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900"><TranslatedText text="All Available Products" /></h3>
                  <div className="flex items-center gap-2">
                    <label htmlFor="sortField" className="text-xs text-gray-500"><TranslatedText text="Sort by" /></label>
                    <select
                      id="sortField"
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value)}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                    >
                      <option value="name"><TranslatedText text="Name" /></option>
                      <option value="price"><TranslatedText text="Price" /></option>
                      <option value="stock"><TranslatedText text="Stock" /></option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                      title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                      aria-label="Toggle sort direction"
                    >
                      {sortDirection === 'asc' ? '⬆︎' : '⬇︎'}
                    </button>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full" title="Total filtered products">
                      {sortedProducts.length} <TranslatedText text="products" />
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3" aria-live="polite">
                  {productsLoading && Array.from({ length: 8 }).map((_, i) => (
                    <div key={`skeleton-${i}`} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2 mb-4"></div>
                      <div className="h-24 bg-gray-50 rounded mb-4"></div>
                      <div className="flex gap-2">
                        <div className="h-8 bg-gray-200 rounded w-full"></div>
                        <div className="h-8 bg-gray-100 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                  {!productsLoading && sortedProducts.map(product => (
                    <div
                      key={product.id}
                      className={`relative bg-white border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${product.stock_quantity <= 0
                        ? 'border-red-200 opacity-60'
                        : 'border-gray-200 hover:border-primary-300'
                        }`}
                    >
                      {product.stock_quantity > 0 && product.stock_quantity <= 20 && (
                        <div className="absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          <TranslatedText text="Low stock" /> ({product.stock_quantity})
                        </div>
                      )}
                      <div className="p-3 sm:p-4">
                        {/* Product Header */}
                        <div className="mb-3">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 line-clamp-2">
                            {product.name}
                          </h4>
                          <p className="text-xs text-gray-500 mb-2">
                            {product.sku} • {product.brand_name}
                          </p>
                          {product.barcode && (
                            <div className="flex items-center text-xs text-gray-400 mb-2">
                              <span className="mr-1">📊</span>
                              <span className="font-mono">{product.barcode}</span>
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between items-center">
                            <span className="text-lg sm:text-xl font-bold text-primary-600">
                              ${product.price}
                            </span>
                            <span className="text-xs text-gray-500">{product.currency}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Stock:</span>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${product.stock_quantity > 10
                              ? 'bg-green-100 text-green-800'
                              : product.stock_quantity > 0
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                              }`}>
                              {product.stock_quantity} <TranslatedText text="available" />
                            </span>
                          </div>
                        </div>

                        {/* Add to Cart Button */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => addProductToOrder(product)}
                            disabled={product.stock_quantity <= 0}
                            className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center ${product.stock_quantity <= 0
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-md transform hover:scale-105'
                              }`}
                          >
                            {product.stock_quantity <= 0 ? (
                              <>
                                <X className="h-4 w-4 mr-1" />
                                <TranslatedText text="Out of Stock" />
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-1" />
                                <TranslatedText text="Add to Cart" />
                              </>
                            )}
                          </button>
                          {product.stock_quantity > 0 && (
                            <button
                              type="button"
                              onClick={() => addProductToOrder({ ...product, quantity: 1 })}
                              className="px-3 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200"
                              title="Quick add 1"
                              aria-label={`Quick add one ${product.name}`}
                            >
                              +1
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {sortedProducts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-lg font-medium"><TranslatedText text="No products available" /></p>
                    <p className="text-sm"><TranslatedText text="Products will appear here once they are added to the system" /></p>
                  </div>
                )}
              </div>
            </div>

            {errors.items && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {errors.items}
              </div>
            )}

            {errors.stock && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {errors.stock}
              </div>
            )}
          </div>

          {/* Right Column - Order Items & Summary */}
          <div className="space-y-6">
            {/* Order Items */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TranslatedText text="Order Items" /> ({orderItems.length})
              </label>

              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                {orderItems.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p><TranslatedText text="No items added yet" /></p>
                    <p className="text-sm"><TranslatedText text="Search for products to add them to the order" /></p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {orderItems.map(item => (
                      <div key={item.product_id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-gray-900 truncate">{item.name}</p>
                              {item.addedViaBarcode && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  <Scan className="h-3 w-3 mr-1" />
                                  Scanned
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {item.sku}
                              {item.barcode && (
                                <span className="ml-2 text-xs text-gray-500">
                                  📊 {item.barcode}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatCurrency(item.price)} each
                            </p>
                          </div>

                          <div className="flex flex-col space-y-2 ml-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateItemQuantity(item.product_id, item.quantity - 1)}
                                className="p-1 text-gray-500 hover:text-gray-700"
                              >
                                <Minus className="h-4 w-4" />
                              </button>

                              <input
                                type={item.product_type === 'perfume' ? 'text' : 'number'}
                                min="1"
                                max={item.available_stock || 999}
                                value={item.quantity}
                                onChange={(e) => {
                                  if (item.product_type === 'perfume') {
                                    // For perfume, allow direct typing of any value
                                    const inputValue = e.target.value;
                                    // Allow empty string for typing, but validate on blur
                                    if (inputValue === '' || inputValue === '0') {
                                      // Allow empty or zero for typing, will be validated on blur
                                      return;
                                    }
                                    const numericValue = parseInt(inputValue) || 0;
                                    if (numericValue >= 1 && numericValue <= (item.available_stock || 999)) {
                                      updateItemQuantity(item.product_id, numericValue);
                                    }
                                  } else {
                                    // For non-perfume products, use normal number input
                                    const newQuantity = parseInt(e.target.value) || 1;
                                    if (newQuantity >= 1 && newQuantity <= (item.available_stock || 999)) {
                                      updateItemQuantity(item.product_id, newQuantity);
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  if (item.product_type === 'perfume') {
                                    const inputValue = e.target.value;
                                    const numericValue = parseInt(inputValue) || 1;
                                    if (numericValue < 1) {
                                      updateItemQuantity(item.product_id, 1);
                                    } else if (numericValue > (item.available_stock || 999)) {
                                      updateItemQuantity(item.product_id, item.available_stock || 999);
                                    } else {
                                      updateItemQuantity(item.product_id, numericValue);
                                    }
                                  } else {
                                    const newQuantity = parseInt(e.target.value) || 1;
                                    if (newQuantity < 1) {
                                      updateItemQuantity(item.product_id, 1);
                                    } else if (newQuantity > (item.available_stock || 999)) {
                                      updateItemQuantity(item.product_id, item.available_stock || 999);
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  }
                                }}
                                placeholder={item.product_type === 'perfume' ? ' Type quantity...' : ''}
                                className={`w-12 text-center font-medium border border-gray-300 rounded px-1 py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${item.product_type === 'perfume' ? 'bg-yellow-50' : ''
                                  }`}
                              />

                              <button
                                onClick={() => updateItemQuantity(item.product_id, item.quantity + 1)}
                                disabled={item.quantity >= item.available_stock}
                                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Plus className="h-4 w-4" />
                              </button>

                              <div className="w-20 text-right">
                                <p className="font-medium">${(parseFloat(item.total) || 0).toFixed(2)}</p>
                              </div>

                              <button
                                onClick={() => removeItemFromOrder(item.product_id)}
                                className="p-1 text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Quick quantity buttons for perfume products */}
                            {item.product_type === 'perfume' && (
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500 mr-1">Quick:</span>
                                <button
                                  onClick={() => updateItemQuantity(item.product_id, 30)}
                                  className={`px-1 py-0.5 text-xs rounded ${item.quantity === 30
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    }`}
                                >
                                  30
                                </button>
                                <button
                                  onClick={() => updateItemQuantity(item.product_id, 50)}
                                  className={`px-1 py-0.5 text-xs rounded ${item.quantity === 50
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    }`}
                                >
                                  50
                                </button>
                                <button
                                  onClick={() => updateItemQuantity(item.product_id, 100)}
                                  className={`px-1 py-0.5 text-xs rounded ${item.quantity === 100
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    }`}
                                >
                                  100
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {item.quantity > item.available_stock && (
                          <p className="text-xs text-red-600 mt-1">
                            <TranslatedText text="Insufficient stock! Available" />: {item.available_stock}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            {orderItems.length > 0 && (
              <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-base sm:text-lg"><TranslatedText text="Order Summary" /></h3>
                <div className="space-y-1.5 sm:space-y-2 text-sm sm:text-base">
                  <div className="flex justify-between">
                    <span><TranslatedText text="Subtotal" />:</span>
                    <span>{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span><TranslatedText text="Tax (18%)" />:</span>
                    <span>{formatCurrency(calculateTax())}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 sm:pt-3 flex justify-between font-semibold">
                    <span><TranslatedText text="Total" />:</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>

                {/* Discount Section */}
                {selectedCustomer && eligibleDiscounts.length > 0 && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base"><TranslatedText text="Available Discounts" /></h4>
                      <button
                        onClick={() => setShowDiscountModal(true)}
                        className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <TranslatedText text="View All" /> ({eligibleDiscounts.length})
                      </button>
                    </div>
                    <div className="space-y-2">
                      {eligibleDiscounts.slice(0, 2).map((discount) => (
                        <div
                          key={discount.id}
                          className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border cursor-pointer transition-colors ${selectedDiscounts.find(d => d.id === discount.id)
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                          onClick={() => handleDiscountSelection(discount)}
                        >
                          <div className="flex items-center">
                            <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 mr-2 sm:mr-3 ${selectedDiscounts.find(d => d.id === discount.id)
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-gray-300'
                              }`}>
                              {selectedDiscounts.find(d => d.id === discount.id) && (
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full m-0.5"></div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-xs sm:text-sm">{discount.name}</div>
                              <div className="text-xs text-gray-500">{discount.description}</div>
                            </div>
                          </div>
                          <div className="text-xs sm:text-sm font-medium text-primary-600">
                            {discount.type === 'percentage' && `${discount.value}%`}
                            {discount.type === 'fixed_amount' && `$${discount.value}`}
                            {discount.type === 'bottle_return' && `${discount.bottle_return_count} bottles`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="h-4 w-4 inline mr-1" />
                <TranslatedText text="Payment Method" />
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="cash"><TranslatedText text="Cash" /></option>
                <option value="card"><TranslatedText text="Credit Card" /></option>
                <option value="debit"><TranslatedText text="Debit Card" /></option>
                <option value="mobile"><TranslatedText text="Mobile Payment" /></option>
                <option value="bank_transfer"><TranslatedText text="Bank Transfer" /></option>
              </select>
              {errors.payment && (
                <p className="text-red-600 text-sm sm:text-base mt-1">{errors.payment}</p>
              )}
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                <TranslatedText text="Payment Status" />
              </label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentStatus"
                    value="complete"
                    checked={paymentStatus === 'complete'}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm sm:text-base font-medium text-gray-900"><TranslatedText text="Complete Payment" /></span>
                    <p className="text-xs text-gray-500"><TranslatedText text="Customer pays full amount, product removed from stock" /></p>
                  </div>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentStatus"
                    value="pending"
                    checked={paymentStatus === 'pending'}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm sm:text-base font-medium text-gray-900"><TranslatedText text="Partial Payment (Reservation)" /></span>
                    <p className="text-xs text-gray-500"><TranslatedText text="Customer pays 50%, product reserved until full payment" /></p>
                  </div>
                </label>
              </div>
              {errors.paymentStatus && (
                <p className="text-red-600 text-sm sm:text-base mt-1">{errors.paymentStatus}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                <TranslatedText text="Notes (Optional)" />
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={tSync("Add any special instructions or notes...")}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            {/* Sale Button */}
            <div className="sticky bottom-0 bg-gradient-to-br from-slate-50 to-gray-100 pt-2">
              <button
                onClick={() => {
                  if (!orderReference) {
                    setOrderReference(generateOrderReference());
                  }
                  setShowOrderSummary(true);
                }}
                disabled={orderItems.length === 0}
                className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-base sm:text-lg font-bold hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                <TranslatedText text="Complete Sale" />
                <span className="ml-2 hidden sm:inline text-green-100 text-xs font-normal">(Enter)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Order Summary Popup Modal for Legacy Layout */}
      {showOrderSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] overflow-y-auto">
            {/* Store Information Header */}
            <div className="bg-primary-600 border-b-2 border-primary-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white"><TranslatedText text="URUTIROSE STORE" /></h1>
                  <p className="text-primary-100 mt-1"><TranslatedText text="Your Trusted Shopping Destination" /></p>
                  <div className="mt-3 text-sm text-primary-100 space-y-1">
                    <p>📍 123 Main Street, City Center, Country</p>
                    <p>📞 +1 (555) 123-4567 | 📧 info@urutirose.com</p>
                    <p>🌐 www.urutirose.com</p>
                  </div>
                </div>
                <div className="text-right border-l-2 border-primary-500 pl-6">
                  <div className="text-2xl font-bold text-white">INVOICE</div>
                  <div className="mt-2 text-sm text-primary-100 space-y-1">
                    <p><span className="font-medium"><TranslatedText text="Invoice" /> #:</span> {generateInvoiceNumber()}</p>
                    <p><span className="font-medium"><TranslatedText text="Order Ref" />:</span> {orderReference || generateOrderReference()}</p>
                    <p><span className="font-medium"><TranslatedText text="Date" />:</span> {new Date().toLocaleDateString('en-GB')}</p>
                    <p><span className="font-medium"><TranslatedText text="Time" />:</span> {new Date().toLocaleTimeString('en-GB', { hour12: false })}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Content */}
            <div className="p-6" id="invoice-content-legacy">
              {/* Invoice Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 text-lg"><TranslatedText text="Customer Information" /></h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600"><TranslatedText text="Name" />:</span>
                      <span className="font-medium">
                        {selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : <TranslatedText text="Guest Customer" />}
                      </span>
                    </div>
                    {selectedCustomer && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium">{selectedCustomer.email}</span>
                        </div>
                        {selectedCustomer.phone && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Phone:</span>
                            <span className="font-medium">{selectedCustomer.phone}</span>
                          </div>
                        )}
                        {selectedCustomer.address && (
                          <div className="flex justify-between">
                            <span className="text-gray-600"><TranslatedText text="Address" />:</span>
                            <span className="font-medium max-w-xs text-right">{selectedCustomer.address}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600"><TranslatedText text="Payment Method" />:</span>
                      <span className="font-medium capitalize">{paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600"><TranslatedText text="Payment Status" />:</span>
                      <span className={`font-medium capitalize ${paymentStatus === 'pending' ? 'text-orange-600' : 'text-green-600'
                        }`}>
                        {paymentStatus === 'pending' ? <TranslatedText text="Partial Payment (50%)" /> : <TranslatedText text="Complete Payment" />}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 text-lg"><TranslatedText text="Order Information" /></h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600"><TranslatedText text="Items" />:</span>
                      <span className="font-medium">{orderItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600"><TranslatedText text="Total Items" />:</span>
                      <span className="font-medium">{orderItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600"><TranslatedText text="Subtotal" />:</span>
                      <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600"><TranslatedText text="Discounts" />:</span>
                        <span className="font-medium text-green-600">-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600"><TranslatedText text="Tax (18%)" />:</span>
                      <span className="font-medium">{formatCurrency(calculateTax())}</span>
                    </div>
                    <div className="flex justify-between font-medium text-primary-600">
                      <span><TranslatedText text="Total" />:</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                    {notes && (
                      <div className="flex justify-between">
                        <span className="text-gray-600"><TranslatedText text="Notes" />:</span>
                        <span className="font-medium max-w-xs text-right">{notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Items Table */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3 text-lg"><TranslatedText text="Order Items" /></h4>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><TranslatedText text="Item" /></th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"><TranslatedText text="Qty" /></th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"><TranslatedText text="Price" /></th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"><TranslatedText text="Total" /></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {orderItems.map(item => (
                        <tr key={item.product_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-500">SKU: {item.sku || item.product_sku || 'N/A'}</p>
                              {item.barcode && (
                                <p className="text-xs text-gray-500">📊 {item.barcode}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">{item.quantity} unit</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">{formatCurrency(item.price)}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(parseFloat(item.total) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 text-lg"><TranslatedText text="Financial Summary" /></h4>

                <div className="space-y-3">
                  <div className="flex justify-between text-base">
                    <span className="text-gray-600"><TranslatedText text="Subtotal" />:</span>
                    <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-base text-green-600">
                      <span><TranslatedText text="Discount" />:</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base">
                    <span className="text-gray-600"><TranslatedText text="Tax (18%)" />:</span>
                    <span className="font-medium">{formatCurrency(calculateTax())}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-3 mt-4">
                    <div className="flex justify-between text-xl font-bold text-primary-600">
                      <span><TranslatedText text="Total" />:</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                    {paymentStatus === 'pending' && (
                      <>
                        <div className="flex justify-between text-base text-orange-600 mt-3">
                          <span><TranslatedText text="Amount to Pay (50%)" />:</span>
                          <span className="font-bold">{formatCurrency(calculateTotal() * 0.5)}</span>
                        </div>
                        <div className="flex justify-between text-base text-gray-600">
                          <span><TranslatedText text="Remaining Balance" />:</span>
                          <span className="font-medium">{formatCurrency(calculateTotal() * 0.5)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Discount Summary */}
                {selectedDiscounts.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h5 className="font-medium text-gray-900 mb-3"><TranslatedText text="Applied Discounts" /></h5>
                    <div className="space-y-2">
                      {selectedDiscounts.map((discount) => (
                        <div key={discount.id} className="flex justify-between items-center p-2 bg-green-50 rounded-lg border border-green-200">
                          <div>
                            <p className="font-medium text-sm text-green-800">{discount.name}</p>
                            <p className="text-xs text-green-600">{discount.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-800">
                              {discount.type === 'percentage' && `${discount.value}%`}
                              {discount.type === 'fixed_amount' && `$${discount.value}`}
                              {discount.type === 'bottle_return' && `${discount.bottle_return_count} bottles`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Footer Actions */}
            <div className="flex justify-between items-center gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint('invoice-content-legacy')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  title="Print Invoice"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <TranslatedText text="Print" />
                </button>
                <button
                  onClick={() => handleExportPDF('invoice-content-legacy')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  title="Export as PDF"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowOrderSummary(false)}
                  className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  <TranslatedText text="Close" />
                </button>
                <button
                  onClick={() => saveOrderToDatabase()}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      <TranslatedText text="Saving Order..." />
                    </>
                  ) : (
                    <TranslatedText text="Approve Order & Complete Sale" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderForm;
