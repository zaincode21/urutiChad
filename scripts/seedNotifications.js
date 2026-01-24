const database = require('../server/database/database');
const { v4: uuidv4 } = require('uuid');

async function seedNotifications() {
  try {
    console.log('🌱 Seeding notification system...');

    // Clear existing data
    await database.run('DELETE FROM notification_analytics');
    await database.run('DELETE FROM notifications');
    await database.run('DELETE FROM notification_campaigns');
    await database.run('DELETE FROM notification_triggers');
    await database.run('DELETE FROM notification_templates');
    await database.run('DELETE FROM customer_notification_preferences');

    console.log('✅ Cleared existing notification data');

    // Create notification templates
    const templates = [
      {
        id: uuidv4(),
        name: 'Welcome Email',
        type: 'email',
        subject: 'Welcome to Smart Retail, {{customer.first_name}}!',
        content: `Hi {{customer.first_name}},

Welcome to Smart Retail! We're excited to have you as part of our community.

As a new customer, you'll receive:
- Exclusive promotions and discounts
- Early access to new products
- Loyalty rewards and points
- Order updates and tracking

Thank you for choosing Smart Retail!

Best regards,
The Smart Retail Team`,
        variables: JSON.stringify({
          store_name: 'Smart Retail',
          welcome_discount: '10%'
        })
      },
      {
        id: uuidv4(),
        name: 'Order Confirmation SMS',
        type: 'sms',
        content: `Hi {{customer.first_name}}, your order #{{order_number}} has been confirmed. Total: ${{order_total}}. Track at {{tracking_url}}`,
        variables: JSON.stringify({
          order_number: '12345',
          order_total: '99.99',
          tracking_url: 'smartretail.com/track'
        })
      },
      {
        id: uuidv4(),
        name: 'Loyalty Points Update',
        type: 'push',
        content: 'You earned {{points}} points! Total: {{total_points}}. Redeem at smartretail.com/rewards',
        variables: JSON.stringify({
          points: '50',
          total_points: '250'
        })
      },
      {
        id: uuidv4(),
        name: 'Payment Reminder Email',
        type: 'email',
        subject: 'Payment Reminder - Order #{{order_number}}',
        content: `Dear {{customer.first_name}},

This is a friendly reminder that payment for your order #{{order_number}} is due on {{due_date}}.

Order Details:
- Order Number: {{order_number}}
- Amount Due: ${{amount_due}}
- Due Date: {{due_date}}

Please make your payment to avoid any late fees.

Thank you,
Smart Retail Team`,
        variables: JSON.stringify({
          order_number: '12345',
          amount_due: '99.99',
          due_date: '2025-01-15'
        })
      },
      {
        id: uuidv4(),
        name: 'Flash Sale SMS',
        type: 'sms',
        content: 'FLASH SALE! 50% off all perfumes today only. Use code FLASH50. Shop now at smartretail.com',
        variables: JSON.stringify({
          discount: '50%',
          code: 'FLASH50'
        })
      },
      {
        id: uuidv4(),
        name: 'Abandoned Cart Email',
        type: 'email',
        subject: 'Complete Your Purchase - Items in Your Cart',
        content: `Hi {{customer.first_name}},

We noticed you left some items in your cart:

{{cart_items}}

Don't miss out! Complete your purchase and get {{discount}} off with code {{code}}.

Shop now: {{cart_url}}

Best regards,
Smart Retail Team`,
        variables: JSON.stringify({
          cart_items: 'Lavender Fields Perfume, Rose Garden Soap',
          discount: '15%',
          code: 'CART15',
          cart_url: 'smartretail.com/cart'
        })
      }
    ];

    for (const template of templates) {
      await database.run(`
        INSERT INTO notification_templates (
          id, name, type, subject, content, variables
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        template.id, template.name, template.type, template.subject, 
        template.content, template.variables
      ]);
    }

    console.log('✅ Created notification templates');

    // Create notification campaigns
    const campaigns = [
      {
        id: uuidv4(),
        name: 'Welcome Campaign',
        description: 'Welcome new customers with personalized email',
        template_id: templates[0].id,
        campaign_type: 'promotion',
        target_audience: 'new_customers',
        filters: JSON.stringify({
          customer_group: 'new',
          notification_type: 'email'
        }),
        status: 'sent',
        total_recipients: 150,
        sent_count: 150,
        opened_count: 89,
        clicked_count: 23,
        created_by: 'admin-user-id'
      },
      {
        id: uuidv4(),
        name: 'Flash Sale Alert',
        description: 'Notify customers about flash sale',
        template_id: templates[4].id,
        campaign_type: 'promotion',
        target_audience: 'all_customers',
        filters: JSON.stringify({
          notification_type: 'sms'
        }),
        status: 'sent',
        total_recipients: 500,
        sent_count: 500,
        opened_count: 0,
        clicked_count: 67,
        created_by: 'admin-user-id'
      },
      {
        id: uuidv4(),
        name: 'Loyalty Points Update',
        description: 'Notify customers about loyalty points earned',
        template_id: templates[2].id,
        campaign_type: 'loyalty',
        target_audience: 'loyalty_members',
        filters: JSON.stringify({
          customer_group: 'loyalty',
          notification_type: 'push'
        }),
        status: 'draft',
        total_recipients: 0,
        sent_count: 0,
        opened_count: 0,
        clicked_count: 0,
        created_by: 'admin-user-id'
      }
    ];

    for (const campaign of campaigns) {
      await database.run(`
        INSERT INTO notification_campaigns (
          id, name, description, template_id, campaign_type, target_audience,
          filters, status, total_recipients, sent_count, opened_count, clicked_count, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        campaign.id, campaign.name, campaign.description, campaign.template_id,
        campaign.campaign_type, campaign.target_audience, campaign.filters,
        campaign.status, campaign.total_recipients, campaign.sent_count,
        campaign.opened_count, campaign.clicked_count, campaign.created_by
      ]);
    }

    console.log('✅ Created notification campaigns');

    // Create notification triggers
    const triggers = [
      {
        id: uuidv4(),
        name: 'Order Confirmation',
        trigger_type: 'order_update',
        conditions: JSON.stringify({
          event: 'order_created',
          notification_type: 'sms'
        }),
        template_id: templates[1].id
      },
      {
        id: uuidv4(),
        name: 'Payment Reminder',
        trigger_type: 'payment_reminder',
        conditions: JSON.stringify({
          event: 'payment_due',
          days_before: 3,
          notification_type: 'email'
        }),
        template_id: templates[3].id
      },
      {
        id: uuidv4(),
        name: 'Abandoned Cart',
        trigger_type: 'custom',
        conditions: JSON.stringify({
          event: 'cart_abandoned',
          hours_after: 24,
          notification_type: 'email'
        }),
        template_id: templates[5].id
      }
    ];

    for (const trigger of triggers) {
      await database.run(`
        INSERT INTO notification_triggers (
          id, name, trigger_type, conditions, template_id
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        trigger.id, trigger.name, trigger.trigger_type, 
        trigger.conditions, trigger.template_id
      ]);
    }

    console.log('✅ Created notification triggers');

    // Create sample notifications
    const notifications = [
      {
        id: uuidv4(),
        campaign_id: campaigns[0].id,
        customer_id: 'customer-1',
        type: 'email',
        subject: 'Welcome to Smart Retail, John!',
        content: 'Hi John, Welcome to Smart Retail! We\'re excited to have you as part of our community...',
        recipient: 'john@example.com',
        status: 'delivered',
        sent_at: new Date(Date.now() - 86400000).toISOString(),
        delivered_at: new Date(Date.now() - 86300000).toISOString(),
        opened_at: new Date(Date.now() - 86000000).toISOString()
      },
      {
        id: uuidv4(),
        campaign_id: campaigns[1].id,
        customer_id: 'customer-2',
        type: 'sms',
        content: 'FLASH SALE! 50% off all perfumes today only. Use code FLASH50. Shop now at smartretail.com',
        recipient: '+1234567890',
        status: 'delivered',
        sent_at: new Date(Date.now() - 3600000).toISOString(),
        delivered_at: new Date(Date.now() - 3500000).toISOString()
      },
      {
        id: uuidv4(),
        campaign_id: campaigns[2].id,
        customer_id: 'customer-3',
        type: 'push',
        content: 'You earned 50 points! Total: 250. Redeem at smartretail.com/rewards',
        recipient: 'device-token-123',
        status: 'sent',
        sent_at: new Date(Date.now() - 1800000).toISOString()
      }
    ];

    for (const notification of notifications) {
      await database.run(`
        INSERT INTO notifications (
          id, campaign_id, customer_id, type, subject, content, recipient,
          status, sent_at, delivered_at, opened_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        notification.id, notification.campaign_id, notification.customer_id,
        notification.type, notification.subject, notification.content, notification.recipient,
        notification.status, notification.sent_at, notification.delivered_at, notification.opened_at
      ]);
    }

    console.log('✅ Created sample notifications');

    // Create customer notification preferences
    const preferences = [
      {
        customer_id: 'customer-1',
        sms_enabled: 1,
        email_enabled: 1,
        push_enabled: 0,
        marketing_sms: 1,
        marketing_email: 1,
        marketing_push: 0,
        loyalty_notifications: 1,
        payment_reminders: 1,
        order_updates: 1
      },
      {
        customer_id: 'customer-2',
        sms_enabled: 1,
        email_enabled: 0,
        push_enabled: 1,
        marketing_sms: 1,
        marketing_email: 0,
        marketing_push: 1,
        loyalty_notifications: 1,
        payment_reminders: 1,
        order_updates: 1
      },
      {
        customer_id: 'customer-3',
        sms_enabled: 0,
        email_enabled: 1,
        push_enabled: 1,
        marketing_sms: 0,
        marketing_email: 1,
        marketing_push: 1,
        loyalty_notifications: 1,
        payment_reminders: 0,
        order_updates: 1
      }
    ];

    for (const preference of preferences) {
      await database.run(`
        INSERT INTO customer_notification_preferences (
          customer_id, sms_enabled, email_enabled, push_enabled,
          marketing_sms, marketing_email, marketing_push,
          loyalty_notifications, payment_reminders, order_updates
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        preference.customer_id, preference.sms_enabled, preference.email_enabled,
        preference.push_enabled, preference.marketing_sms, preference.marketing_email,
        preference.marketing_push, preference.loyalty_notifications,
        preference.payment_reminders, preference.order_updates
      ]);
    }

    console.log('✅ Created customer notification preferences');

    // Create notification analytics
    const analytics = [
      {
        id: uuidv4(),
        campaign_id: campaigns[0].id,
        date: new Date().toISOString().split('T')[0],
        total_sent: 150,
        total_delivered: 145,
        total_opened: 89,
        total_clicked: 23,
        total_failed: 5,
        delivery_rate: 96.67,
        open_rate: 59.33,
        click_rate: 15.33
      },
      {
        id: uuidv4(),
        campaign_id: campaigns[1].id,
        date: new Date().toISOString().split('T')[0],
        total_sent: 500,
        total_delivered: 485,
        total_opened: 0,
        total_clicked: 67,
        total_failed: 15,
        delivery_rate: 97.00,
        open_rate: 0.00,
        click_rate: 13.40
      }
    ];

    for (const analytic of analytics) {
      await database.run(`
        INSERT INTO notification_analytics (
          id, campaign_id, date, total_sent, total_delivered, total_opened,
          total_clicked, total_failed, delivery_rate, open_rate, click_rate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        analytic.id, analytic.campaign_id, analytic.date, analytic.total_sent,
        analytic.total_delivered, analytic.total_opened, analytic.total_clicked,
        analytic.total_failed, analytic.delivery_rate, analytic.open_rate, analytic.click_rate
      ]);
    }

    console.log('✅ Created notification analytics');

    console.log('🎉 Notification system seeded successfully!');
    console.log('');
    console.log('📊 Sample data created:');
    console.log('- 6 notification templates (Email, SMS, Push)');
    console.log('- 3 notification campaigns');
    console.log('- 3 notification triggers');
    console.log('- 3 sample notifications');
    console.log('- 3 customer notification preferences');
    console.log('- 2 notification analytics records');

  } catch (error) {
    console.error('❌ Error seeding notifications:', error);
    throw error;
  }
}

// Run the seed function
seedNotifications()
  .then(() => {
    console.log('✅ Notification seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Notification seeding failed:', error);
    process.exit(1);
  }); 