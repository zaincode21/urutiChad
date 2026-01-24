const database = require('../database/database');
const emailService = require('./emailService');

class BirthdayAnniversaryService {
  constructor() {
    this.db = database.db;
  }

  /**
   * Get customers with birthdays today
   */
  async getCustomersWithBirthdayToday() {
    return new Promise((resolve, reject) => {
      const today = new Date();
      const month = today.getMonth() + 1; // getMonth() returns 0-11
      const day = today.getDate();
      
      const query = `
        SELECT id, first_name, last_name, email, birthday, loyalty_tier, total_spent
        FROM customers 
        WHERE is_active = 1 
        AND email IS NOT NULL 
        AND email != ''
        AND strftime('%m', birthday) = ? 
        AND strftime('%d', birthday) = ?
      `;
      
      this.db.all(query, [
        month.toString().padStart(2, '0'),
        day.toString().padStart(2, '0')
      ], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Get customers with anniversary today
   */
  async getCustomersWithAnniversaryToday() {
    return new Promise((resolve, reject) => {
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      
      const query = `
        SELECT id, first_name, last_name, email, anniversary_date, loyalty_tier, total_spent
        FROM customers 
        WHERE is_active = 1 
        AND email IS NOT NULL 
        AND email != ''
        AND strftime('%m', anniversary_date) = ? 
        AND strftime('%d', anniversary_date) = ?
      `;
      
      this.db.all(query, [
        month.toString().padStart(2, '0'),
        day.toString().padStart(2, '0')
      ], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Send birthday emails to all customers with birthdays today
   */
  async sendBirthdayEmails() {
    try {
      console.log('🎂 Checking for customers with birthdays today...');
      
      const customers = await this.getCustomersWithBirthdayToday();
      
      if (customers.length === 0) {
        console.log('📅 No customers have birthdays today');
        return { success: true, emailsSent: 0, message: 'No birthdays today' };
      }

      console.log(`🎉 Found ${customers.length} customer(s) with birthdays today`);
      
      let successCount = 0;
      let failureCount = 0;
      
      for (const customer of customers) {
        try {
          const result = await emailService.sendBirthdayEmail(customer);
          
          if (result.success) {
            successCount++;
            console.log(`✅ Birthday email sent to ${customer.first_name} ${customer.last_name} (${customer.email})`);
            
            // Log the email sent
            await this.logEmailSent(customer.id, 'birthday', 'success');
          } else {
            failureCount++;
            console.error(`❌ Failed to send birthday email to ${customer.email}: ${result.error}`);
            await this.logEmailSent(customer.id, 'birthday', 'failed', result.error);
          }
        } catch (error) {
          failureCount++;
          console.error(`❌ Error sending birthday email to ${customer.email}:`, error);
          await this.logEmailSent(customer.id, 'birthday', 'failed', error.message);
        }
      }

      const summary = {
        success: true,
        emailsSent: successCount,
        emailsFailed: failureCount,
        totalCustomers: customers.length,
        message: `Birthday emails processed: ${successCount} sent, ${failureCount} failed`
      };

      console.log(`📊 Birthday email summary: ${summary.message}`);
      return summary;

    } catch (error) {
      console.error('❌ Error in sendBirthdayEmails:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send anniversary emails to all customers with anniversaries today
   */
  async sendAnniversaryEmails() {
    try {
      console.log('💝 Checking for customers with anniversaries today...');
      
      const customers = await this.getCustomersWithAnniversaryToday();
      
      if (customers.length === 0) {
        console.log('📅 No customers have anniversaries today');
        return { success: true, emailsSent: 0, message: 'No anniversaries today' };
      }

      console.log(`🎊 Found ${customers.length} customer(s) with anniversaries today`);
      
      let successCount = 0;
      let failureCount = 0;
      
      for (const customer of customers) {
        try {
          const result = await emailService.sendAnniversaryEmail(customer);
          
          if (result.success) {
            successCount++;
            console.log(`✅ Anniversary email sent to ${customer.first_name} ${customer.last_name} (${customer.email})`);
            
            // Log the email sent
            await this.logEmailSent(customer.id, 'anniversary', 'success');
          } else {
            failureCount++;
            console.error(`❌ Failed to send anniversary email to ${customer.email}: ${result.error}`);
            await this.logEmailSent(customer.id, 'anniversary', 'failed', result.error);
          }
        } catch (error) {
          failureCount++;
          console.error(`❌ Error sending anniversary email to ${customer.email}:`, error);
          await this.logEmailSent(customer.id, 'anniversary', 'failed', error.message);
        }
      }

      const summary = {
        success: true,
        emailsSent: successCount,
        emailsFailed: failureCount,
        totalCustomers: customers.length,
        message: `Anniversary emails processed: ${successCount} sent, ${failureCount} failed`
      };

      console.log(`📊 Anniversary email summary: ${summary.message}`);
      return summary;

    } catch (error) {
      console.error('❌ Error in sendAnniversaryEmails:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send all birthday and anniversary emails for today
   */
  async sendAllSpecialDayEmails() {
    try {
      console.log('🚀 Starting daily birthday and anniversary email process...');
      
      const birthdayResult = await this.sendBirthdayEmails();
      const anniversaryResult = await this.sendAnniversaryEmails();
      
      const totalEmailsSent = (birthdayResult.emailsSent || 0) + (anniversaryResult.emailsSent || 0);
      const totalEmailsFailed = (birthdayResult.emailsFailed || 0) + (anniversaryResult.emailsFailed || 0);
      
      const summary = {
        success: true,
        totalEmailsSent,
        totalEmailsFailed,
        birthday: birthdayResult,
        anniversary: anniversaryResult,
        message: `Daily email process completed: ${totalEmailsSent} sent, ${totalEmailsFailed} failed`
      };

      console.log(`📊 Daily email process summary: ${summary.message}`);
      return summary;

    } catch (error) {
      console.error('❌ Error in sendAllSpecialDayEmails:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log email sent to database
   */
  async logEmailSent(customerId, emailType, status, error = null) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO email_logs (customer_id, email_type, status, error, sent_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `;
      
      this.db.run(query, [customerId, emailType, status, error], function(err) {
        if (err) {
          console.error('Failed to log email:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Get upcoming birthdays and anniversaries (next 7 days)
   */
  async getUpcomingSpecialDays(days = 7) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          id, 
          first_name, 
          last_name, 
          email, 
          birthday, 
          anniversary_date,
          loyalty_tier
        FROM customers 
        WHERE is_active = 1 
        AND email IS NOT NULL 
        AND email != ''
        AND (
          (birthday IS NOT NULL AND birthday != '') OR 
          (anniversary_date IS NOT NULL AND anniversary_date != '')
        )
        ORDER BY 
          CASE 
            WHEN birthday IS NOT NULL AND birthday != '' 
            THEN date('now', 'start of year', '+' || (strftime('%j', birthday) - 1) || ' days')
            ELSE date('now', 'start of year', '+365 days')
          END
        LIMIT ?
      `;
      
      this.db.all(query, [days], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Test the service
   */
  async testService() {
    try {
      console.log('🧪 Testing Birthday & Anniversary Service...');
      
      // Test email connection
      const emailConnection = await emailService.testConnection();
      console.log('📧 Email service connection:', emailConnection ? '✅ OK' : '❌ Failed');
      
      // Test database queries
      const birthdayCustomers = await this.getCustomersWithBirthdayToday();
      const anniversaryCustomers = await this.getCustomersWithAnniversaryToday();
      
      console.log(`📊 Test results:`);
      console.log(`   - Customers with birthdays today: ${birthdayCustomers.length}`);
      console.log(`   - Customers with anniversaries today: ${anniversaryCustomers.length}`);
      
      return {
        success: true,
        emailService: emailConnection,
        birthdayCustomers: birthdayCustomers.length,
        anniversaryCustomers: anniversaryCustomers.length
      };
      
    } catch (error) {
      console.error('❌ Service test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new BirthdayAnniversaryService();
