const cron = require('node-cron');
const birthdayAnniversaryService = require('./birthdayAnniversaryService');
const notificationService = require('./notificationService');

class CronScheduler {
  constructor() {
    this.jobs = new Map();
    this.init();
  }

  init() {
    console.log('⏰ Initializing Cron Scheduler...');
    
    // Schedule daily birthday and anniversary emails at 9:00 AM
    this.scheduleBirthdayAnniversaryEmails();
    
    // Schedule other maintenance tasks
    this.scheduleMaintenanceTasks();

    // Schedule notification campaigns processor (runs every minute)
    this.scheduleCampaignProcessor();
    
    console.log('✅ Cron Scheduler initialized successfully');
  }

  /**
   * Schedule daily birthday and anniversary emails
   */
  scheduleBirthdayAnniversaryEmails() {
    // Run every day at 14:07 UTC (2:07 PM UTC)
    const job = cron.schedule('7 14 * * *', async () => {
      console.log('🎂 🎊 Running scheduled birthday and anniversary email process at 14:07 UTC...');
      
      try {
        const result = await birthdayAnniversaryService.sendAllSpecialDayEmails();
        
        if (result.success) {
          console.log(`✅ Scheduled email process completed successfully: ${result.message}`);
        } else {
          console.error(`❌ Scheduled email process failed: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ Error in scheduled email process:', error);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    this.jobs.set('birthdayAnniversary', job);
    console.log('📅 Scheduled birthday and anniversary emails: Daily at 14:07 UTC (2:07 PM UTC)');
  }

  /**
   * Schedule maintenance tasks
   */
  scheduleMaintenanceTasks() {
    // Run database cleanup every Sunday at 2:00 AM
    const cleanupJob = cron.schedule('0 2 * * 0', async () => {
      console.log('🧹 Running scheduled database cleanup...');
      
      try {
        // Clean up old email logs (older than 90 days)
        await this.cleanupOldEmailLogs();
        console.log('✅ Database cleanup completed successfully');
      } catch (error) {
        console.error('❌ Database cleanup failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    this.jobs.set('maintenance', cleanupJob);
    console.log('🧹 Scheduled maintenance tasks: Weekly on Sunday at 2:00 AM UTC');
  }

  /**
   * Schedule campaign processor to send due scheduled campaigns
   */
  scheduleCampaignProcessor() {
    const job = cron.schedule('* * * * *', async () => {
      try {
        const result = await notificationService.processScheduledCampaigns();
        if (result.processed > 0) {
          console.log(`📣 Processed ${result.processed} scheduled campaign(s)`);
        }
      } catch (error) {
        console.error('❌ Error processing scheduled campaigns:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.jobs.set('campaignProcessor', job);
    console.log('📬 Scheduled campaign processor: every minute');
  }

  /**
   * Clean up old email logs
   */
  async cleanupOldEmailLogs() {
    try {
      const database = require('../database/database');
      
      // Delete email logs older than 90 days
      const result = await database.run(`
        DELETE FROM email_logs 
        WHERE sent_at < datetime('now', '-90 days')
      `);
      
      if (result.changes > 0) {
        console.log(`🗑️ Cleaned up ${result.changes} old email log entries`);
      } else {
        console.log('📝 No old email logs to clean up');
      }
      
      return { success: true, deletedCount: result.changes };
    } catch (error) {
      console.error('❌ Error cleaning up old email logs:', error);
      throw error;
    }
  }

  /**
   * Manually trigger birthday and anniversary emails (for testing)
   */
  async triggerBirthdayAnniversaryEmails() {
    console.log('🚀 Manually triggering birthday and anniversary emails...');
    
    try {
      const result = await birthdayAnniversaryService.sendAllSpecialDayEmails();
      return result;
    } catch (error) {
      console.error('❌ Error triggering emails:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get status of all scheduled jobs
   */
  getJobsStatus() {
    const status = {};
    
    for (const [name, job] of this.jobs) {
      status[name] = {
        name,
        running: job.running,
        nextDate: job.nextDate(),
        lastDate: job.lastDate()
      };
    }
    
    return status;
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs() {
    console.log('⏹️ Stopping all scheduled jobs...');
    
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`⏹️ Stopped job: ${name}`);
    }
    
    this.jobs.clear();
  }

  /**
   * Restart all scheduled jobs
   */
  restartAllJobs() {
    console.log('🔄 Restarting all scheduled jobs...');
    
    this.stopAllJobs();
    this.init();
  }

  /**
   * Test the scheduler
   */
  async testScheduler() {
    console.log('🧪 Testing Cron Scheduler...');
    
    try {
      // Test the birthday and anniversary service
      const serviceTest = await birthdayAnniversaryService.testService();
      
      // Get jobs status
      const jobsStatus = this.getJobsStatus();
      
      const testResult = {
        success: true,
        serviceTest,
        jobsStatus,
        message: 'Cron Scheduler test completed successfully'
      };
      
      console.log('✅ Cron Scheduler test completed successfully');
      return testResult;
      
    } catch (error) {
      console.error('❌ Cron Scheduler test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new CronScheduler();
