const jsreport = require('jsreport-core')();

// Initialize jsreport with required extensions
jsreport.use(require('jsreport-handlebars')());
jsreport.use(require('jsreport-chrome-pdf')());

// Disable Excel support due to compatibility issues with current Puppeteer version
const xlsxSupported = false;
console.log('⚠️ Excel export disabled due to compatibility issues with jsreport-html-to-xlsx and current Puppeteer version');

class ReportService {
  constructor() {
    this.initialized = false;
    this.xlsxSupported = xlsxSupported;
  }

  async init() {
    if (!this.initialized) {
      try {
        await jsreport.init();
        this.initialized = true;
        console.log('✅ JSReport initialized successfully');
        if (!this.xlsxSupported) {
          console.log('⚠️ Excel export not available due to compatibility issues');
        }
      } catch (error) {
        console.error('❌ JSReport initialization error:', error);
        throw error;
      }
    }
  }

  isExcelSupported() {
    return this.xlsxSupported;
  }

  async generateIncomeReportPDF(reportData, options = {}) {
    try {
      await this.init();

      const {
        summary,
        orders,
        expenses,
        date_range,
        shop_name = 'All Shops'
      } = reportData;

      // Format currency helper
      const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-RW', {
          style: 'currency',
          currency: 'RWF',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount || 0);
      };

      // Format date helper
      const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      };

      // Prepare template data
      const templateData = {
        title: 'Income Report',
        company: 'Urutirose Perfumes',
        period: `${formatDate(date_range.start_date)} - ${formatDate(date_range.end_date)}`,
        shop: shop_name,
        generated_date: formatDate(new Date().toISOString()),
        summary: {
          ...summary,
          total_revenue_formatted: formatCurrency(summary.total_revenue),
          total_cogs_formatted: formatCurrency(summary.total_cogs),
          gross_profit_formatted: formatCurrency(summary.gross_profit),
          total_expenses_formatted: formatCurrency(summary.total_expenses),
          net_profit_formatted: formatCurrency(summary.net_profit),
          profit_margin_formatted: `${summary.profit_margin?.toFixed(2) || 0}%`,
          cogs_percentage: summary.total_revenue > 0 
            ? `${((summary.total_cogs / summary.total_revenue) * 100).toFixed(1)}%`
            : '0%'
        },
        orders: orders.map(order => ({
          ...order,
          created_at_formatted: formatDate(order.created_at),
          total_amount_formatted: formatCurrency(order.total_amount),
          product_names: order.product_names || 'No products',
          categories: order.categories || 'No categories'
        })),
        expenses: expenses.map(expense => ({
          ...expense,
          expense_date_formatted: formatDate(expense.expense_date),
          amount_formatted: formatCurrency(expense.amount)
        })),
        has_orders: orders.length > 0,
        has_expenses: expenses.length > 0
      };

      // Simplified HTML template for testing
      const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { font-size: 24px; font-weight: bold; color: #1e40af; }
        .report-title { font-size: 20px; color: #374151; }
        .summary { margin: 20px 0; }
        .summary-item { margin: 10px 0; padding: 10px; background: #f9f9f9; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">{{company}}</div>
        <div class="report-title">{{title}}</div>
        <div>Period: {{period}} | Shop: {{shop}}</div>
    </div>

    <div class="summary">
        <h2>Financial Summary</h2>
        <div class="summary-item">Total Revenue: {{summary.total_revenue_formatted}}</div>
        <div class="summary-item">Cost of Goods: {{summary.total_cogs_formatted}}</div>
        <div class="summary-item">Total Expenses: {{summary.total_expenses_formatted}}</div>
        <div class="summary-item">Net Profit: {{summary.net_profit_formatted}} ({{summary.profit_margin_formatted}})</div>
    </div>

    {{#if has_orders}}
    <h2>Orders ({{orders.length}})</h2>
    <table>
        <tr>
            <th>Date</th>
            <th>Products</th>
            <th>Shop</th>
            <th>Amount</th>
            <th>Status</th>
        </tr>
        {{#each orders}}
        <tr>
            <td>{{created_at_formatted}}</td>
            <td>{{product_names}}</td>
            <td>{{shop_name}}</td>
            <td>{{total_amount_formatted}}</td>
            <td>{{status}}</td>
        </tr>
        {{/each}}
    </table>
    {{/if}}

    {{#if has_expenses}}
    <h2>Expenses ({{expenses.length}})</h2>
    <table>
        <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
        </tr>
        {{#each expenses}}
        <tr>
            <td>{{expense_date_formatted}}</td>
            <td>{{category}}</td>
            <td>{{description}}</td>
            <td>{{amount_formatted}}</td>
        </tr>
        {{/each}}
    </table>
    {{/if}}
</body>
</html>`;

      const result = await jsreport.render({
        template: {
          content: htmlTemplate,
          engine: 'handlebars',
          recipe: 'chrome-pdf',
          chrome: {
            format: 'A4',
            margin: {
              top: '1cm',
              right: '1cm',
              bottom: '1cm',
              left: '1cm'
            }
          }
        },
        data: templateData
      });

      // Ensure we return a proper Node.js Buffer
      return Buffer.from(result.content);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw new Error(`Failed to generate PDF report: ${error.message}`);
    }
  }

  async generateIncomeReportExcel(reportData, options = {}) {
    try {
      await this.init();

      // Check if Excel support is available
      if (!xlsxSupported) {
        throw new Error('Excel export is not available due to compatibility issues. Please use PDF export instead.');
      }

      const {
        summary,
        orders,
        expenses,
        date_range,
        shop_name = 'All Shops'
      } = reportData;

      // Format currency helper
      const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-RW', {
          style: 'currency',
          currency: 'RWF',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount || 0);
      };

      // Format date helper
      const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      };

      const templateData = {
        title: 'Income Report',
        company: 'Urutirose Perfumes',
        period: `${formatDate(date_range.start_date)} - ${formatDate(date_range.end_date)}`,
        shop: shop_name,
        generated_date: formatDate(new Date().toISOString()),
        summary: {
          ...summary,
          total_revenue_formatted: formatCurrency(summary.total_revenue),
          total_cogs_formatted: formatCurrency(summary.total_cogs),
          gross_profit_formatted: formatCurrency(summary.gross_profit),
          total_expenses_formatted: formatCurrency(summary.total_expenses),
          net_profit_formatted: formatCurrency(summary.net_profit),
          profit_margin_formatted: `${summary.profit_margin?.toFixed(2) || 0}%`,
          cogs_percentage: summary.total_revenue > 0 
            ? `${((summary.total_cogs / summary.total_revenue) * 100).toFixed(1)}%`
            : '0%'
        },
        orders: orders.map(order => ({
          ...order,
          created_at_formatted: formatDate(order.created_at),
          total_amount_formatted: formatCurrency(order.total_amount),
          product_names: order.product_names || 'No products',
          categories: order.categories || 'No categories'
        })),
        expenses: expenses.map(expense => ({
          ...expense,
          expense_date_formatted: formatDate(expense.expense_date),
          amount_formatted: formatCurrency(expense.amount)
        }))
      };

      const htmlTemplate = `
<table>
    <tr><td colspan="6"><h1>{{company}} - {{title}}</h1></td></tr>
    <tr><td colspan="6">Period: {{period}} | Shop: {{shop}} | Generated: {{generated_date}}</td></tr>
    <tr><td colspan="6"></td></tr>
    
    <tr><td colspan="6"><h2>Summary</h2></td></tr>
    <tr><td>Total Revenue</td><td>{{summary.total_revenue_formatted}}</td><td>{{summary.total_orders}} orders</td></tr>
    <tr><td>Cost of Goods</td><td>{{summary.total_cogs_formatted}}</td><td>{{summary.cogs_percentage}} of revenue</td></tr>
    <tr><td>Total Expenses</td><td>{{summary.total_expenses_formatted}}</td><td>{{expenses.length}} expense entries</td></tr>
    <tr><td>Net Profit</td><td>{{summary.net_profit_formatted}}</td><td>{{summary.profit_margin_formatted}} margin</td></tr>
    <tr><td colspan="6"></td></tr>
    
    <tr><td colspan="6"><h2>Orders</h2></td></tr>
    <tr><td><b>Date</b></td><td><b>Products</b></td><td><b>Categories</b></td><td><b>Shop</b></td><td><b>Amount</b></td><td><b>Status</b></td></tr>
    {{#each orders}}
    <tr>
        <td>{{created_at_formatted}}</td>
        <td>{{product_names}}</td>
        <td>{{categories}}</td>
        <td>{{shop_name}}</td>
        <td>{{total_amount_formatted}}</td>
        <td>{{status}}</td>
    </tr>
    {{/each}}
    <tr><td colspan="6"></td></tr>
    
    <tr><td colspan="6"><h2>Expenses</h2></td></tr>
    <tr><td><b>Date</b></td><td><b>Category</b></td><td><b>Description</b></td><td><b>Shop</b></td><td><b>Amount</b></td></tr>
    {{#each expenses}}
    <tr>
        <td>{{expense_date_formatted}}</td>
        <td>{{category}}</td>
        <td>{{description}}</td>
        <td>{{shop_name}}</td>
        <td>{{amount_formatted}}</td>
    </tr>
    {{/each}}
</table>`;

      const result = await jsreport.render({
        template: {
          content: htmlTemplate,
          engine: 'handlebars',
          recipe: 'html-to-xlsx'
        },
        data: templateData
      });

      return result.content;
    } catch (error) {
      console.error('Error generating Excel report:', error);
      throw new Error(`Failed to generate Excel report: ${error.message}`);
    }
  }
}

module.exports = new ReportService();