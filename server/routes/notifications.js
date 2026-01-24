const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const birthdayAnniversaryService = require('../services/birthdayAnniversaryService');
const cronScheduler = require('../services/cronScheduler');

const router = express.Router();

// Get notification templates
router.get('/templates', auth, async (req, res) => {
  try {
    const templates = await notificationService.getTemplates(req.query);
    res.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Get notification template by ID
router.get('/templates/:id', auth, async (req, res) => {
  try {
    const template = await notificationService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ template });
  } catch (error) {
    console.error('Get template by ID error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Create notification template
router.post('/templates', adminAuth, [
  body('name').notEmpty().withMessage('Template name is required'),
  body('type').isIn(['sms', 'email', 'push']).withMessage('Invalid notification type'),
  body('content').notEmpty().withMessage('Template content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const template = await notificationService.createTemplate(req.body);
    res.status(201).json({ template });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update notification template
router.put('/templates/:id', adminAuth, [
  body('name').notEmpty().withMessage('Template name is required'),
  body('type').isIn(['sms', 'email', 'push']).withMessage('Invalid notification type'),
  body('content').notEmpty().withMessage('Template content is required'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const template = await notificationService.updateTemplate(req.params.id, req.body);
    res.json({ template });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete notification template (soft delete)
router.delete('/templates/:id', adminAuth, async (req, res) => {
  try {
    const result = await notificationService.deleteTemplate(req.params.id);
    res.json({ result });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete template' });
  }
});

// Hard delete notification template (admin only)
router.delete('/templates/:id/hard', adminAuth, async (req, res) => {
  try {
    const result = await notificationService.hardDeleteTemplate(req.params.id);
    res.json({ result });
  } catch (error) {
    console.error('Hard delete template error:', error);
    res.status(500).json({ error: error.message || 'Failed to hard delete template' });
  }
});

// Get notification campaigns
router.get('/campaigns', auth, async (req, res) => {
  try {
    const campaigns = await notificationService.getCampaigns(req.query);
    res.json({ campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
});

// Create notification campaign
router.post('/campaigns', adminAuth, [
  body('name').notEmpty().withMessage('Campaign name is required'),
  body('template_id').notEmpty().withMessage('Template ID is required'),
  body('campaign_type').isIn(['promotion', 'loyalty', 'payment_reminder', 'custom']).withMessage('Invalid campaign type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const campaign = await notificationService.createCampaign({
      ...req.body,
      created_by: req.user.id
    });
    res.status(201).json({ campaign });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Send notification campaign
router.post('/campaigns/:id/send', adminAuth, async (req, res) => {
  try {
    const result = await notificationService.sendCampaign(req.params.id);
    res.json({ result });
  } catch (error) {
    console.error('Send campaign error:', error);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

// Get notification analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const period = req.query.period || '30';
    const analytics = await notificationService.getNotificationAnalytics(period);
    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get notification triggers
router.get('/triggers', auth, async (req, res) => {
  try {
    const triggers = await notificationService.getTriggers(req.query);
    res.json({ triggers });
  } catch (error) {
    console.error('Get triggers error:', error);
    res.status(500).json({ error: 'Failed to get triggers' });
  }
});

// Create notification trigger
router.post('/triggers', adminAuth, [
  body('name').notEmpty().withMessage('Trigger name is required'),
  body('trigger_type').isIn(['promotion', 'loyalty', 'payment_reminder', 'order_update', 'custom']).withMessage('Invalid trigger type'),
  body('template_id').notEmpty().withMessage('Template ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const trigger = await notificationService.createTrigger(req.body);
    res.status(201).json({ trigger });
  } catch (error) {
    console.error('Create trigger error:', error);
    res.status(500).json({ error: 'Failed to create trigger' });
  }
});

// Send individual notification
router.post('/send', auth, [
  body('customer_id').notEmpty().withMessage('Customer ID is required'),
  body('type').isIn(['sms', 'email', 'push']).withMessage('Invalid notification type'),
  body('content').notEmpty().withMessage('Notification content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const notification = await notificationService.sendNotification(req.body);
    res.json({ notification });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Get customer notification preferences
router.get('/preferences/:customerId', auth, async (req, res) => {
  try {
    const preferences = await notificationService.getCustomerPreferences(req.params.customerId);
    res.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Update customer notification preferences
router.put('/preferences/:customerId', auth, [
  body('sms_enabled').isBoolean().withMessage('SMS enabled must be boolean'),
  body('email_enabled').isBoolean().withMessage('Email enabled must be boolean'),
  body('push_enabled').isBoolean().withMessage('Push enabled must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await notificationService.updateCustomerPreferences(req.params.customerId, req.body);
    res.json({ result });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get target customers for campaign
router.post('/target-customers', auth, async (req, res) => {
  try {
    const customers = await notificationService.getTargetCustomers(req.body.filters || {});
    res.json({ customers });
  } catch (error) {
    console.error('Get target customers error:', error);
    res.status(500).json({ error: 'Failed to get target customers' });
  }
});

/**
 * @swagger
 * /api/notifications/birthday-anniversary/test:
 *   post:
 *     summary: Test birthday and anniversary email service
 *     description: Manually trigger birthday and anniversary emails for testing
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test completed successfully
 *       500:
 *         description: Server error
 */
router.post('/birthday-anniversary/test', auth, async (req, res) => {
  try {
    console.log('🧪 Testing birthday and anniversary service...');
    
    const result = await birthdayAnniversaryService.testService();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Service test completed successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Service test failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error testing birthday and anniversary service:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/birthday-anniversary/trigger:
 *   post:
 *     summary: Manually trigger birthday and anniversary emails
 *     description: Send birthday and anniversary emails to customers who have special days today
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Emails sent successfully
 *       500:
 *         description: Server error
 */
router.post('/birthday-anniversary/trigger', auth, async (req, res) => {
  try {
    console.log('🚀 Manually triggering birthday and anniversary emails...');
    
    const result = await birthdayAnniversaryService.sendAllSpecialDayEmails();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Birthday and anniversary emails processed successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to process emails',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error triggering birthday and anniversary emails:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/birthday-anniversary/upcoming:
 *   get:
 *     summary: Get upcoming birthdays and anniversaries
 *     description: Get list of customers with upcoming special days
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to look ahead
 *     responses:
 *       200:
 *         description: Upcoming special days retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/birthday-anniversary/upcoming', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    
    const customers = await birthdayAnniversaryService.getUpcomingSpecialDays(days);
    
    res.json({
      success: true,
      message: `Upcoming special days for next ${days} days`,
      data: {
        days,
        customers,
        count: customers.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting upcoming special days:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/cron/status:
 *   get:
 *     summary: Get cron scheduler status
 *     description: Get status of all scheduled jobs
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cron status retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/cron/status', auth, async (req, res) => {
  try {
    const jobsStatus = cronScheduler.getJobsStatus();
    
    res.json({
      success: true,
      message: 'Cron scheduler status retrieved successfully',
      data: jobsStatus
    });
  } catch (error) {
    console.error('❌ Error getting cron status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/cron/test:
 *   post:
 *     summary: Test cron scheduler
 *     description: Test the cron scheduler and all scheduled jobs
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cron test completed successfully
 *       500:
 *         description: Server error
 */
router.post('/cron/test', auth, async (req, res) => {
  try {
    console.log('🧪 Testing cron scheduler...');
    
    const result = await cronScheduler.testScheduler();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Cron scheduler test completed successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Cron scheduler test failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error testing cron scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/cron/restart:
 *   post:
 *     summary: Restart cron scheduler
 *     description: Restart all scheduled jobs
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cron scheduler restarted successfully
 *       500:
 *         description: Server error
 */
router.post('/cron/restart', auth, async (req, res) => {
  try {
    console.log('🔄 Restarting cron scheduler...');
    
    cronScheduler.restartAllJobs();
    
    res.json({
      success: true,
      message: 'Cron scheduler restarted successfully'
    });
  } catch (error) {
    console.error('❌ Error restarting cron scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/test-email:
 *   post:
 *     summary: Test email sending
 *     description: Send a test email to verify email service is working
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "test@example.com"
 *               subject:
 *                 type: string
 *                 example: "Test Email"
 *               content:
 *                 type: string
 *                 example: "This is a test email"
 *     responses:
 *       200:
 *         description: Test email sent successfully
 *       500:
 *         description: Server error
 */
router.post('/test-email', auth, async (req, res) => {
  try {
    const { email, subject = 'Test Email', content = 'This is a test email from the notification system.' } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    const emailService = require('../services/emailService');
    const result = await emailService.sendEmail(email, subject, content);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/email-logs:
 *   get:
 *     summary: Get email logs
 *     description: Get logs of sent birthday and anniversary emails
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of records per page
 *       - in: query
 *         name: email_type
 *         schema:
 *           type: string
 *         description: Filter by email type (birthday, anniversary)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (success, failed)
 *     responses:
 *       200:
 *         description: Email logs retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/email-logs', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const emailType = req.query.email_type;
    const status = req.query.status;
    
    let whereClause = '';
    let params = [];
    
    if (emailType) {
      whereClause += ' WHERE email_type = ?';
      params.push(emailType);
    }
    
    if (status) {
      whereClause += whereClause ? ' AND status = ?' : ' WHERE status = ?';
      params.push(status);
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM email_logs${whereClause}`;
    const countResult = await new Promise((resolve, reject) => {
      const database = require('../database/database');
      database.db.get(countQuery, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    // Get logs with pagination
    const logsQuery = `
      SELECT 
        el.*,
        c.first_name,
        c.last_name,
        c.email
      FROM email_logs el
      LEFT JOIN customers c ON el.customer_id = c.id
      ${whereClause}
      ORDER BY el.sent_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const logs = await new Promise((resolve, reject) => {
      const database = require('../database/database');
      database.db.all(logsQuery, [...params, limit, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    const totalPages = Math.ceil(countResult.total / limit);
    
    res.json({
      success: true,
      message: 'Email logs retrieved successfully',
      data: {
        logs,
        pagination: {
          page,
          limit,
          total: countResult.total,
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('❌ Error getting email logs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router; 