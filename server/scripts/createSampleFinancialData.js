const database = require('../database/database');
const moment = require('moment');

async function createSampleFinancialData() {
  try {
    console.log('🔄 Creating sample financial data...');

    // Create sample journal entries for the current month
    const currentDate = moment().format('YYYY-MM-DD');
    const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
    
    // Sample transactions for a perfume business
    const sampleTransactions = [
      // 1. Initial capital investment
      {
        entry_date: startOfMonth,
        description: 'Initial capital investment',
        reference: 'CAP-001',
        status: 'posted',
        lines: [
          { account_code: '1002', debit_amount: 50000, credit_amount: 0, description: 'Bank Account' },
          { account_code: '3101', debit_amount: 0, credit_amount: 50000, description: 'Capital' }
        ]
      },
      
      // 2. Purchase of raw materials
      {
        entry_date: moment().subtract(25, 'days').format('YYYY-MM-DD'),
        description: 'Purchase of raw materials for perfume production',
        reference: 'PUR-001',
        status: 'posted',
        lines: [
          { account_code: '1301', debit_amount: 15000, credit_amount: 0, description: 'Raw Materials' },
          { account_code: '1002', debit_amount: 0, credit_amount: 15000, description: 'Bank Account' }
        ]
      },
      
      // 3. Purchase of packaging materials
      {
        entry_date: moment().subtract(20, 'days').format('YYYY-MM-DD'),
        description: 'Purchase of packaging materials',
        reference: 'PUR-002',
        status: 'posted',
        lines: [
          { account_code: '5102', debit_amount: 5000, credit_amount: 0, description: 'Packaging Materials' },
          { account_code: '1002', debit_amount: 0, credit_amount: 5000, description: 'Bank Account' }
        ]
      },
      
      // 4. Production wages
      {
        entry_date: moment().subtract(15, 'days').format('YYYY-MM-DD'),
        description: 'Production wages for perfume manufacturing',
        reference: 'PAY-001',
        status: 'posted',
        lines: [
          { account_code: '5201', debit_amount: 8000, credit_amount: 0, description: 'Production Wages' },
          { account_code: '1002', debit_amount: 0, credit_amount: 8000, description: 'Bank Account' }
        ]
      },
      
      // 5. Factory rent
      {
        entry_date: moment().subtract(10, 'days').format('YYYY-MM-DD'),
        description: 'Factory rent for the month',
        reference: 'EXP-001',
        status: 'posted',
        lines: [
          { account_code: '5301', debit_amount: 3000, credit_amount: 0, description: 'Factory Rent' },
          { account_code: '1002', debit_amount: 0, credit_amount: 3000, description: 'Bank Account' }
        ]
      },
      
      // 6. Office rent
      {
        entry_date: moment().subtract(8, 'days').format('YYYY-MM-DD'),
        description: 'Office rent for the month',
        reference: 'EXP-002',
        status: 'posted',
        lines: [
          { account_code: '6201', debit_amount: 2000, credit_amount: 0, description: 'Office Rent' },
          { account_code: '1002', debit_amount: 0, credit_amount: 2000, description: 'Bank Account' }
        ]
      },
      
      // 7. Sales revenue
      {
        entry_date: moment().subtract(5, 'days').format('YYYY-MM-DD'),
        description: 'Perfume sales revenue',
        reference: 'SAL-001',
        status: 'posted',
        lines: [
          { account_code: '1001', debit_amount: 25000, credit_amount: 0, description: 'Cash on Hand' },
          { account_code: '4101', debit_amount: 0, credit_amount: 25000, description: 'Product Sales' }
        ]
      },
      
      // 8. More sales revenue
      {
        entry_date: moment().subtract(3, 'days').format('YYYY-MM-DD'),
        description: 'Additional perfume sales',
        reference: 'SAL-002',
        status: 'posted',
        lines: [
          { account_code: '1001', debit_amount: 18000, credit_amount: 0, description: 'Cash on Hand' },
          { account_code: '4101', debit_amount: 0, credit_amount: 18000, description: 'Product Sales' }
        ]
      },
      
      // 9. Marketing expenses
      {
        entry_date: moment().subtract(2, 'days').format('YYYY-MM-DD'),
        description: 'Marketing and advertising expenses',
        reference: 'EXP-003',
        status: 'posted',
        lines: [
          { account_code: '6101', debit_amount: 2000, credit_amount: 0, description: 'Advertising' },
          { account_code: '1002', debit_amount: 0, credit_amount: 2000, description: 'Bank Account' }
        ]
      },
      
      // 10. Office supplies
      {
        entry_date: moment().subtract(1, 'days').format('YYYY-MM-DD'),
        description: 'Office supplies purchase',
        reference: 'EXP-004',
        status: 'posted',
        lines: [
          { account_code: '6202', debit_amount: 500, credit_amount: 0, description: 'Office Supplies' },
          { account_code: '1002', debit_amount: 0, credit_amount: 500, description: 'Bank Account' }
        ]
      }
    ];

    // Insert journal entries
    for (let i = 0; i < sampleTransactions.length; i++) {
      const transaction = sampleTransactions[i];
      const entryId = `JE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const entryNumber = `${transaction.reference}-${String(i + 1).padStart(3, '0')}`;
      
      // Calculate totals
      const totalDebit = transaction.lines.reduce((sum, line) => sum + line.debit_amount, 0);
      const totalCredit = transaction.lines.reduce((sum, line) => sum + line.credit_amount, 0);
      
      // Insert journal entry
      await database.run(`
        INSERT INTO gl_journal_entries (id, entry_number, entry_date, reference_type, reference_id, description, total_debit, total_credit, status, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [entryId, entryNumber, transaction.entry_date, 'manual', transaction.reference, transaction.description, totalDebit, totalCredit, transaction.status, 'system', moment().toISOString()]);

      // Insert journal entry lines
      for (let j = 0; j < transaction.lines.length; j++) {
        const line = transaction.lines[j];
        const lineId = `JEL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        await database.run(`
          INSERT INTO gl_journal_entry_lines (id, journal_entry_id, gl_account_id, debit_amount, credit_amount, description, line_number, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [lineId, entryId, line.account_code, line.debit_amount, line.credit_amount, line.description, j + 1, moment().toISOString()]);
      }
    }

    console.log('✅ Sample financial data created successfully!');
    console.log(`📊 Created ${sampleTransactions.length} journal entries with sample transactions`);
    console.log('💰 Sample data includes:');
    console.log('   - Initial capital investment: $50,000');
    console.log('   - Raw materials purchase: $15,000');
    console.log('   - Production wages: $8,000');
    console.log('   - Factory & office rent: $5,000');
    console.log('   - Sales revenue: $43,000');
    console.log('   - Marketing & supplies: $2,500');
    console.log('');
    console.log('🎯 You can now view financial reports in the Expenses page!');

  } catch (error) {
    console.error('❌ Error creating sample financial data:', error);
  }
}

// Run the script
createSampleFinancialData().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
