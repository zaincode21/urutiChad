const { v4: uuidv4 } = require('uuid');
const database = require('../database/database');

class NotificationService {
  /**
   * Create notification template
   */
  async createTemplate(templateData) {
    try {
      const {
        name, type, subject, content, variables
      } = templateData;

      const templateId = uuidv4();
      await database.run(`
        INSERT INTO notification_templates (
          id, name, type, subject, content, variables
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [templateId, name, type, subject, content, JSON.stringify(variables || {})]);

      return { id: templateId, name };
    } catch (error) {
      console.error('Create template error:', error);
      throw error;
    }
  }

  /**
   * Get notification templates
   */
  async getTemplates(filters = {}) {
    try {
      let query = `
        SELECT * FROM notification_templates 
        WHERE is_active = 1
      `;

      const params = [];
      if (filters.type) {
        query += ' AND type = ?';
        params.push(filters.type);
      }

      query += ' ORDER BY created_at DESC';

      const templates = await database.all(query, params);
      
      const result = templates.map(template => {
        let variables = {};
        try {
          if (template.variables && typeof template.variables === 'string') {
            variables = JSON.parse(template.variables);
          } else if (template.variables && typeof template.variables === 'object') {
            variables = template.variables;
          }
        } catch (jsonError) {
          console.warn('JSON parse error for template variables:', jsonError);
          variables = {};
        }
        
        return {
        ...template,
          variables
        };
      });
      
      return result;
    } catch (error) {
      console.error('Get templates error:', error);
      throw error;
    }
  }

  /**
   * Get notification template by ID
   */
  async getTemplateById(templateId) {
    try {
      const template = await database.get(`
        SELECT * FROM notification_templates WHERE id = ?
      `, [templateId]);

      if (!template) {
        return null;
      }

      let variables = {};
      try {
        if (template.variables && typeof template.variables === 'string') {
          variables = JSON.parse(template.variables);
        } else if (template.variables && typeof template.variables === 'object') {
          variables = template.variables;
        }
      } catch (jsonError) {
        console.warn('JSON parse error for template variables:', jsonError);
        variables = {};
      }

      return {
        ...template,
        variables
      };
    } catch (error) {
      console.error('Get template by ID error:', error);
      throw error;
    }
  }

  /**
   * Update notification template
   */
  async updateTemplate(templateId, templateData) {
    try {
      const {
        name, type, subject, content, variables, is_active
      } = templateData;

      await database.run(`
        UPDATE notification_templates SET
          name = ?, type = ?, subject = ?, content = ?, variables = ?, 
          is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        name, type, subject, content, 
        JSON.stringify(variables || {}), 
        is_active !== undefined ? is_active : 1, 
        templateId
      ]);

      return { id: templateId, name };
    } catch (error) {
      console.error('Update template error:', error);
      throw error;
    }
  }

  /**
   * Delete notification template (soft delete)
   */
  async deleteTemplate(templateId) {
    try {
      // Check if template is used in campaigns
      const campaignCount = await database.get(`
        SELECT COUNT(*) as count FROM notification_campaigns WHERE template_id = ?
      `, [templateId]);

      if (campaignCount.count > 0) {
        throw new Error('Cannot delete template: it is used in active campaigns');
      }

      // Check if template is used in triggers
      const triggerCount = await database.get(`
        SELECT COUNT(*) as count FROM notification_triggers WHERE template_id = ?
      `, [templateId]);

      if (triggerCount.count > 0) {
        throw new Error('Cannot delete template: it is used in active triggers');
      }

      // Soft delete by setting is_active to false
      await database.run(`
        UPDATE notification_templates SET
          is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [templateId]);

      return { id: templateId, message: 'Template deleted successfully' };
    } catch (error) {
      console.error('Delete template error:', error);
      throw error;
    }
  }

  /**
   * Hard delete notification template (admin only)
   */
  async hardDeleteTemplate(templateId) {
    try {
      await database.run(`
        DELETE FROM notification_templates WHERE id = ?
      `, [templateId]);

      return { id: templateId, message: 'Template permanently deleted' };
    } catch (error) {
      console.error('Hard delete template error:', error);
      throw error;
    }
  }

  /**
   * Create notification campaign
   */
  async createCampaign(campaignData) {
    try {
      const {
        name, description, template_id, campaign_type, target_audience,
        filters, scheduled_at, created_by
      } = campaignData;

      const campaignId = uuidv4();
      await database.run(`
        INSERT INTO notification_campaigns (
          id, name, description, template_id, campaign_type, target_audience,
          filters, scheduled_at, created_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        campaignId, name, description, template_id, campaign_type, target_audience,
        JSON.stringify(filters || {}), scheduled_at, created_by,
        scheduled_at ? 'scheduled' : 'draft'
      ]);

      return { id: campaignId, name };
    } catch (error) {
      console.error('Create campaign error:', error);
      throw error;
    }
  }

  /**
   * Get notification campaigns
   */
  async getCampaigns(filters = {}) {
    try {
      let query = `
        SELECT nc.*, nt.name as template_name, u.first_name, u.last_name
        FROM notification_campaigns nc
        LEFT JOIN notification_templates nt ON nc.template_id = nt.id
        LEFT JOIN users u ON nc.created_by = u.id
        WHERE 1=1
      `;

      const params = [];
      if (filters.status) {
        query += ' AND nc.status = ?';
        params.push(filters.status);
      }
      if (filters.campaign_type) {
        query += ' AND nc.campaign_type = ?';
        params.push(filters.campaign_type);
      }
      if (filters.target_audience) {
        query += ' AND nc.target_audience = ?';
        params.push(filters.target_audience);
      }

      query += ' ORDER BY nc.created_at DESC';

      const campaigns = await database.all(query, params);
      return campaigns.map(campaign => {
        let filters = {};
        try {
          if (campaign.filters && typeof campaign.filters === 'string') {
            filters = JSON.parse(campaign.filters);
          } else if (campaign.filters && typeof campaign.filters === 'object') {
            filters = campaign.filters;
          }
        } catch (jsonError) {
          console.warn('JSON parse error for campaign filters:', jsonError);
          filters = {};
        }
        
        return {
        ...campaign,
          filters
        };
      });
    } catch (error) {
      console.error('Get campaigns error:', error);
      throw error;
    }
  }

  /**
   * Send notification campaign
   */
  async sendCampaign(campaignId) {
    try {
      await database.run('BEGIN TRANSACTION');

      // Get campaign details
      const campaign = await database.get(`
        SELECT nc.*, nt.content, nt.subject, nt.type, nt.variables
        FROM notification_campaigns nc
        JOIN notification_templates nt ON nc.template_id = nt.id
        WHERE nc.id = ?
      `, [campaignId]);

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get target customers based on filters
      let filters = {};
      try {
        if (campaign.filters && typeof campaign.filters === 'string') {
          filters = JSON.parse(campaign.filters);
        } else if (campaign.filters && typeof campaign.filters === 'object') {
          filters = campaign.filters;
        }
      } catch (jsonError) {
        console.warn('JSON parse error for campaign filters:', jsonError);
        filters = {};
      }
      const customers = await this.getTargetCustomers(filters);

      // Update campaign status
      await database.run(`
        UPDATE notification_campaigns 
        SET status = 'sending', total_recipients = ?
        WHERE id = ?
      `, [customers.length, campaignId]);

      // Create notifications for each customer and dispatch if type is email
      let templateVariables = {};
      try {
        if (campaign.variables && typeof campaign.variables === 'string') {
          templateVariables = JSON.parse(campaign.variables);
        } else if (campaign.variables && typeof campaign.variables === 'object') {
          templateVariables = campaign.variables;
        }
      } catch (jsonError) {
        console.warn('JSON parse error for campaign variables:', jsonError);
        templateVariables = {};
      }
      const emailService = require('./emailService');
      
      for (const customer of customers) {
        const notificationId = uuidv4();
        const content = this.replaceVariables(campaign.content, { ...templateVariables, customer });
        const subject = campaign.subject ? this.replaceVariables(campaign.subject, { ...templateVariables, customer }) : null;
        
        await database.run(`
          INSERT INTO notifications (
            id, campaign_id, customer_id, type, subject, content, recipient
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          notificationId, campaignId, customer.id, campaign.type, subject, content,
          campaign.type === 'sms' ? customer.phone : customer.email
        ]);

        // Dispatch email immediately for email campaigns
        if (campaign.type === 'email' && customer.email) {
          const emailResult = await emailService.sendEmail(customer.email, subject || campaign.name, content);
          console.log(`📧 Email sent to ${customer.email}:`, emailResult.success ? 'Success' : 'Failed');
        }
      }

      // Update campaign status to sent
      await database.run(`
        UPDATE notification_campaigns 
        SET status = 'sent', sent_at = CURRENT_TIMESTAMP, sent_count = ?
        WHERE id = ?
      `, [customers.length, campaignId]);

      await database.run('COMMIT');

      return {
        campaign_id: campaignId,
        total_recipients: customers.length,
        status: 'sent'
      };
    } catch (error) {
      await database.run('ROLLBACK');
      console.error('Send campaign error:', error);
      throw error;
    }
  }

  /**
   * Process scheduled campaigns whose scheduled_at time has passed
   */
  async processScheduledCampaigns() {
    try {
      // Get all scheduled campaigns and use JavaScript date comparison
      // This is more reliable than SQL timezone comparisons
      const allScheduled = await database.all(`
        SELECT id, name, scheduled_at FROM notification_campaigns 
        WHERE status = 'scheduled' AND scheduled_at IS NOT NULL 
      `);
      
      const now = new Date();
      const dueCampaigns = allScheduled.filter(c => {
        const scheduledTime = new Date(c.scheduled_at);
        return scheduledTime <= now;
      });

      for (const c of dueCampaigns) {
        try {
          await this.sendCampaign(c.id);
        } catch (err) {
          console.error('Failed to send scheduled campaign', c.id, err.message);
          await database.run(`
            UPDATE notification_campaigns
            SET status = 'failed', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [c.id]);
        }
      }

      return { processed: dueCampaigns.length };
    } catch (error) {
      console.error('Process scheduled campaigns error:', error);
      throw error;
    }
  }

  /**
   * Get target customers based on filters
   */
  async getTargetCustomers(filters = {}) {
    try {
      let query = `
        SELECT c.*, cnp.*
        FROM customers c
        LEFT JOIN customer_notification_preferences cnp ON c.id = cnp.customer_id
        WHERE c.is_active = 1
      `;

      const params = [];
      // Target audience mapping
      if (filters.target_audience) {
        if (filters.target_audience === 'all') {
          // no extra condition
        } else if (filters.target_audience === 'new') {
          query += ' AND c.created_at >= NOW() - INTERVAL \'30 days\'';
        } else if (filters.target_audience === 'returning') {
          query += ' AND (c.total_spent IS NOT NULL AND c.total_spent > 0)';
        } else if (filters.target_audience === 'loyalty') {
          query += ' AND (c.loyalty_points IS NOT NULL AND c.loyalty_points > 0)';
        }
      }
      
      if (filters.customer_group) {
        query += ' AND c.customer_group = ?';
        params.push(filters.customer_group);
      }
      
      if (filters.min_purchase_amount) {
        query += ' AND c.total_spent >= ?';
        params.push(filters.min_purchase_amount);
      }
      
      if (filters.last_purchase_days) {
        query += ' AND c.last_purchase_date >= date("now", "-" || ? || " days")';
        params.push(filters.last_purchase_days);
      }

      // Filter by notification preferences
      if (filters.notification_type) {
        if (filters.notification_type === 'sms') {
          query += ' AND (cnp.sms_enabled IS NULL OR cnp.sms_enabled = 1)';
        } else if (filters.notification_type === 'email') {
          query += ' AND (cnp.email_enabled IS NULL OR cnp.email_enabled = 1)';
        } else if (filters.notification_type === 'push') {
          query += ' AND (cnp.push_enabled IS NULL OR cnp.push_enabled = 1)';
        }
      }

      const customers = await database.all(query, params);
      return customers;
    } catch (error) {
      console.error('Get target customers error:', error);
      throw error;
    }
  }

  /**
   * Replace variables in template content
   */
  replaceVariables(content, variables) {
    let result = content;
    
    // Replace customer variables
    if (variables.customer) {
      result = result.replace(/\{\{customer\.name\}\}/g, variables.customer.first_name + ' ' + variables.customer.last_name);
      result = result.replace(/\{\{customer\.first_name\}\}/g, variables.customer.first_name || '');
      result = result.replace(/\{\{customer\.last_name\}\}/g, variables.customer.last_name || '');
      result = result.replace(/\{\{customer\.email\}\}/g, variables.customer.email || '');
      result = result.replace(/\{\{customer\.phone\}\}/g, variables.customer.phone || '');
    }
    
    // Replace other variables
    Object.keys(variables).forEach(key => {
      if (key !== 'customer') {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), variables[key]);
      }
    });
    
    return result;
  }

  /**
   * Send individual notification
   */
  async sendNotification(notificationData) {
    try {
      const {
        customer_id, type, subject, content, recipient
      } = notificationData;

      const notificationId = uuidv4();
      
      await database.run(`
        INSERT INTO notifications (
          id, customer_id, type, subject, content, recipient
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [notificationId, customer_id, type, subject, content, recipient]);

      // Simulate sending (in real implementation, integrate with SMS/Email services)
      await this.simulateSendNotification(notificationId, type);

      return { id: notificationId, status: 'sent' };
    } catch (error) {
      console.error('Send notification error:', error);
      throw error;
    }
  }

  /**
   * Simulate sending notification (replace with actual SMS/Email service integration)
   */
  async simulateSendNotification(notificationId, type) {
    try {
      // Simulate delivery delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update notification status
      await database.run(`
        UPDATE notifications 
        SET status = 'sent', sent_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [notificationId]);

      // Simulate delivery
      setTimeout(async () => {
        await database.run(`
          UPDATE notifications 
          SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [notificationId]);
      }, 2000);

    } catch (error) {
      console.error('Simulate send notification error:', error);
    }
  }

  /**
   * Get notification analytics
   */
  async getNotificationAnalytics(period = '30') {
    try {
      // Overall statistics
      const overallStats = await database.get(`
        SELECT 
          COUNT(*) as total_notifications,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as total_sent,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as total_delivered,
          SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as total_opened,
          SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) as total_clicked,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as total_failed
        FROM notifications 
        WHERE created_at >= NOW() - INTERVAL '${period} days'
      `);

      // Campaign performance
      const campaignPerformance = await database.all(`
        SELECT 
          nc.name as campaign_name,
          nc.campaign_type,
          nc.total_recipients,
          nc.sent_count,
          nc.opened_count,
          nc.clicked_count,
          (nc.opened_count * 100.0 / NULLIF(nc.sent_count, 0)) as open_rate,
          (nc.clicked_count * 100.0 / NULLIF(nc.sent_count, 0)) as click_rate
        FROM notification_campaigns nc
        WHERE nc.sent_at >= NOW() - INTERVAL '${period} days'
        ORDER BY nc.sent_at DESC
        LIMIT 10
      `);

      // Notification type breakdown
      const typeBreakdown = await database.all(`
        SELECT 
          type,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as opened
        FROM notifications 
        WHERE created_at >= NOW() - INTERVAL '${period} days'
        GROUP BY type
      `);

      // Convert string rates to numbers for campaign performance
      const processedCampaignPerformance = campaignPerformance.map(campaign => ({
        ...campaign,
        open_rate: campaign.open_rate ? parseFloat(campaign.open_rate) : 0,
        click_rate: campaign.click_rate ? parseFloat(campaign.click_rate) : 0
      }));

      return {
        overall_stats: overallStats,
        campaign_performance: processedCampaignPerformance,
        type_breakdown: typeBreakdown
      };
    } catch (error) {
      console.error('Get notification analytics error:', error);
      throw error;
    }
  }

  /**
   * Create notification trigger
   */
  async createTrigger(triggerData) {
    try {
      const {
        name, trigger_type, conditions, template_id
      } = triggerData;

      const triggerId = uuidv4();
      await database.run(`
        INSERT INTO notification_triggers (
          id, name, trigger_type, conditions, template_id
        ) VALUES (?, ?, ?, ?, ?)
      `, [triggerId, name, trigger_type, JSON.stringify(conditions), template_id]);

      return { id: triggerId, name };
    } catch (error) {
      console.error('Create trigger error:', error);
      throw error;
    }
  }

  /**
   * Get notification triggers
   */
  async getTriggers(filters = {}) {
    try {
      let query = `
        SELECT nt.*, ntt.name as template_name
        FROM notification_triggers nt
        LEFT JOIN notification_templates ntt ON nt.template_id = ntt.id
        WHERE nt.is_active = 1
      `;

      const params = [];
      if (filters.trigger_type) {
        query += ' AND nt.trigger_type = ?';
        params.push(filters.trigger_type);
      }

      query += ' ORDER BY nt.created_at DESC';

      const triggers = await database.all(query, params);
      return triggers.map(trigger => {
        let conditions = {};
        try {
          if (trigger.conditions && typeof trigger.conditions === 'string') {
            conditions = JSON.parse(trigger.conditions);
          } else if (trigger.conditions && typeof trigger.conditions === 'object') {
            conditions = trigger.conditions;
          }
        } catch (jsonError) {
          console.warn('JSON parse error for trigger conditions:', jsonError);
          conditions = {};
        }
        
        return {
        ...trigger,
          conditions
        };
      });
    } catch (error) {
      console.error('Get triggers error:', error);
      throw error;
    }
  }

  /**
   * Update customer notification preferences
   */
  async updateCustomerPreferences(customerId, preferences) {
    try {
      const {
        sms_enabled, email_enabled, push_enabled,
        marketing_sms, marketing_email, marketing_push,
        loyalty_notifications, payment_reminders, order_updates
      } = preferences;

      await database.run(`
        INSERT OR REPLACE INTO customer_notification_preferences (
          customer_id, sms_enabled, email_enabled, push_enabled,
          marketing_sms, marketing_email, marketing_push,
          loyalty_notifications, payment_reminders, order_updates
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customerId, sms_enabled, email_enabled, push_enabled,
        marketing_sms, marketing_email, marketing_push,
        loyalty_notifications, payment_reminders, order_updates
      ]);

      return { success: true };
    } catch (error) {
      console.error('Update customer preferences error:', error);
      throw error;
    }
  }

  /**
   * Get customer notification preferences
   */
  async getCustomerPreferences(customerId) {
    try {
      const preferences = await database.get(`
        SELECT * FROM customer_notification_preferences 
        WHERE customer_id = ?
      `, [customerId]);

      return preferences || {
        customer_id: customerId,
        sms_enabled: 1,
        email_enabled: 1,
        push_enabled: 1,
        marketing_sms: 1,
        marketing_email: 1,
        marketing_push: 1,
        loyalty_notifications: 1,
        payment_reminders: 1,
        order_updates: 1
      };
    } catch (error) {
      console.error('Get customer preferences error:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService(); 