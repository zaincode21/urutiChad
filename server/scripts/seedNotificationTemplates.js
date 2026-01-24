const database = require('../database/database');
const { v4: uuidv4 } = require('uuid');

async function seedNotificationTemplates() {
  try {
    console.log('🌱 Seeding notification templates...');
    
    // Check if templates already exist
    const existingTemplates = await database.all('SELECT COUNT(*) as count FROM notification_templates');
    if (existingTemplates[0].count > 0) {
      console.log('⚠️ Templates already exist. Skipping seed...');
      return;
    }

    const templates = [
      // SMS Templates
      {
        id: uuidv4(),
        name: 'Welcome SMS',
        type: 'sms',
        subject: null,
        content: 'Welcome to UrutiLaRose! 🎉 Your account has been created successfully. Enjoy shopping with us!',
        variables: JSON.stringify({
          customer_name: 'string',
          shop_name: 'string'
        }),
        is_active: 1
      },
      {
        id: uuidv4(),
        name: 'Order Confirmation SMS',
        type: 'sms',
        subject: null,
        content: 'Hi {{customer_name}}, your order #{{order_number}} has been confirmed! Total: ${{total_amount}}. We\'ll notify you when it\'s ready.',
        variables: JSON.stringify({
          customer_name: 'string',
          order_number: 'string',
          total_amount: 'number',
          shop_name: 'string'
        }),
        is_active: 1
      },
      {
        id: uuidv4(),
        name: 'Order Ready SMS',
        type: 'sms',
        subject: null,
        content: 'Great news! Your order #{{order_number}} is ready for pickup at {{shop_name}}. Please collect within 48 hours.',
        variables: JSON.stringify({
          customer_name: 'string',
          order_number: 'string',
          shop_name: 'string',
          pickup_location: 'string'
        }),
        is_active: 1
      },
      {
        id: uuidv4(),
        name: 'Payment Reminder SMS',
        type: 'sms',
        subject: null,
        content: 'Hi {{customer_name}}, your payment of ${{amount}} for order #{{order_number}} is due. Please complete payment to avoid delays.',
        variables: JSON.stringify({
          customer_name: 'string',
          amount: 'number',
          order_number: 'string',
          due_date: 'date'
        }),
        is_active: 1
      },
      {
        id: uuidv4(),
        name: 'Loyalty Points SMS',
        type: 'sms',
        subject: null,
        content: 'Congratulations! You\'ve earned {{points}} loyalty points for your recent purchase. Current balance: {{total_points}} points.',
        variables: JSON.stringify({
          customer_name: 'string',
          points: 'number',
          total_points: 'number',
          shop_name: 'string'
        }),
        is_active: 1
      },

      // Email Templates
      {
        id: uuidv4(),
        name: 'Welcome Email',
        type: 'email',
        subject: 'Welcome to UrutiLaRose - Your Premium Shopping Destination',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">Welcome to UrutiLaRose! 🎉</h2>
            <p>Dear {{customer_name}},</p>
            <p>Thank you for joining UrutiLaRose! We're excited to have you as part of our community.</p>
            <p>Here's what you can expect from us:</p>
            <ul>
              <li>Premium quality products</li>
              <li>Exclusive member discounts</li>
              <li>Personalized shopping experience</li>
              <li>24/7 customer support</li>
            </ul>
            <p>Start exploring our collection today!</p>
            <p>Best regards,<br>The UrutiLaRose Team</p>
          </div>
        `,
        variables: JSON.stringify({
          customer_name: 'string',
          customer_email: 'string',
          shop_name: 'string',
          signup_date: 'date'
        }),
        is_active: 1
      },
      {
        id: uuidv4(),
        name: 'Order Confirmation Email',
        type: 'email',
        subject: 'Order Confirmation - Order #{{order_number}}',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">Order Confirmed! ✅</h2>
            <p>Dear {{customer_name}},</p>
            <p>Thank you for your order! We've received your request and are processing it now.</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Order Details:</h3>
              <p><strong>Order Number:</strong> {{order_number}}</p>
              <p><strong>Order Date:</strong> {{order_date}}</p>
              <p><strong>Total Amount:</strong> ${{total_amount}}</p>
              <p><strong>Payment Method:</strong> {{payment_method}}</p>
            </div>
            <p>We'll notify you when your order is ready for pickup.</p>
            <p>Best regards,<br>The UrutiLaRose Team</p>
          </div>
        `,
        variables: JSON.stringify({
          customer_name: 'string',
          customer_email: 'string',
          order_number: 'string',
          order_date: 'date',
          total_amount: 'number',
          payment_method: 'string',
          shop_name: 'string'
        }),
        is_active: 1
      },
      {
        id: uuidv4(),
        name: 'Order Ready Email',
        type: 'email',
        subject: 'Your Order is Ready! - Order #{{order_number}}',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Order Ready for Pickup! 🎉</h2>
            <p>Dear {{customer_name}},</p>
            <p>Great news! Your order is ready for pickup.</p>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Pickup Details:</h3>
              <p><strong>Order Number:</strong> {{order_number}}</p>
              <p><strong>Pickup Location:</strong> {{pickup_location}}</p>
              <p><strong>Pickup Hours:</strong> {{pickup_hours}}</p>
              <p><strong>Valid Until:</strong> {{valid_until}}</p>
            </div>
            <p><strong>Important:</strong> Please bring a valid ID for pickup.</p>
            <p>Best regards,<br>The UrutiLaRose Team</p>
          </div>
        `,
        variables: JSON.stringify({
          customer_name: 'string',
          customer_email: 'string',
          order_number: 'string',
          pickup_location: 'string',
          pickup_hours: 'string',
          valid_until: 'date',
          shop_name: 'string'
        }),
        is_active: 1
      },
      {
        id: uuidv4(),
        name: 'Payment Reminder Email',
        type: 'email',
        subject: 'Payment Reminder - Order #{{order_number}}',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">Payment Reminder ⏰</h2>
            <p>Dear {{customer_name}},</p>
            <p>This is a friendly reminder that your payment is due soon.</p>
            <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Payment Details:</h3>
              <p><strong>Order Number:</strong> {{order_number}}</p>
              <p><strong>Amount Due:</strong> ${{amount_due}}</p>
              <p><strong>Due Date:</strong> {{due_date}}</p>
              <p><strong>Payment Method:</strong> {{payment_method}}</p>
            </div>
            <p>Please complete your payment to avoid any delays in processing your order.</p>
            <p>Best regards,<br>The UrutiLaRose Team</p>
          </div>
        `,
        variables: JSON.stringify({
          customer_name: 'string',
          customer_email: 'string',
          order_number: 'string',
          amount_due: 'number',
          due_date: 'date',
          payment_method: 'string',
          shop_name: 'string'
        }),
        is_active: 1
      },
      {
        id: uuidv4(),
        name: 'Loyalty Program Email',
        type: 'email',
        subject: 'You\'ve Earned {{points}} Loyalty Points! 🎁',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8b5cf6;">Loyalty Points Earned! 🎉</h2>
            <p>Dear {{customer_name}},</p>
            <p>Congratulations! You've earned loyalty points for your recent purchase.</p>
            <div style="background: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Points Summary:</h3>
              <p><strong>Points Earned:</strong> {{points}} points</p>
              <p><strong>Current Balance:</strong> {{total_points}} points</p>
              <p><strong>Next Reward:</strong> {{next_reward}} points needed</p>
            </div>
            <p>Redeem your points for exclusive discounts and rewards!</p>
            <p>Best regards,<br>The UrutiLaRose Team</p>
          </div>
        `,
        variables: JSON.stringify({
          customer_name: 'string',
          customer_email: 'string',
          points: 'number',
          total_points: 'number',
          next_reward: 'number',
          shop_name: 'string'
        }),
        is_active: 1
      },
      {
        id: uuidv4(),
        name: 'Birthday Email',
        type: 'email',
        subject: 'Happy Birthday, {{customer_name}}! 🎂 Special Offer Inside',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ec4899;">Happy Birthday! 🎉</h2>
            <p>Dear {{customer_name}},</p>
            <p>Wishing you a fantastic birthday filled with joy and happiness!</p>
            <div style="background: #fdf2f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Birthday Special Offer:</h3>
              <p><strong>Discount:</strong> {{discount_percentage}}% off your next purchase</p>
              <p><strong>Valid Until:</strong> {{valid_until}}</p>
              <p><strong>Code:</strong> <span style="background: #f3f4f6; padding: 5px 10px; border-radius: 4px; font-family: monospace;">{{discount_code}}</span></p>
            </div>
            <p>Treat yourself to something special on your special day!</p>
            <p>Best regards,<br>The UrutiLaRose Team</p>
          </div>
        `,
        variables: JSON.stringify({
          customer_name: 'string',
          customer_email: 'string',
          discount_percentage: 'number',
          valid_until: 'date',
          discount_code: 'string',
          shop_name: 'string'
        }),
        is_active: 1
      },

      // Push Notification Templates
      {
        id: uuidv4(),
        name: 'Welcome Push',
        type: 'push',
        subject: 'Welcome to UrutiLaRose!',
        content: 'Welcome to UrutiLaRose! 🎉 Start exploring our premium collection today.',
        variables: JSON.stringify({
          customer_name: 'string',
          shop_name: 'string'
        }),
        is_active: 1
      },
      {
        id: uuidv4(),
        name: 'Order Update Push',
        type: 'push',
        subject: 'Order Update',
        content: 'Your order #{{order_number}} status has been updated to {{status}}.',
        variables: JSON.stringify({
          customer_name: 'string',
          order_number: 'string',
          status: 'string',
          shop_name: 'string'
        }),
        is_active: 1
      },
      {
        id: uuidv4(),
        name: 'Flash Sale Push',
        type: 'push',
        subject: 'Flash Sale Alert! ⚡',
        content: 'Flash sale happening now! {{discount_percentage}}% off selected items. Limited time only!',
        variables: JSON.stringify({
          customer_name: 'string',
          discount_percentage: 'number',
          end_time: 'datetime',
          shop_name: 'string'
        }),
        is_active: 1
      },
      {
        id: uuidv4(),
        name: 'Low Stock Alert Push',
        type: 'push',
        subject: 'Low Stock Alert',
        content: '{{product_name}} is running low on stock! Order now before it\'s gone.',
        variables: JSON.stringify({
          customer_name: 'string',
          product_name: 'string',
          current_stock: 'number',
          shop_name: 'string'
        }),
        is_active: 1
      },
      {
        id: uuidv4(),
        name: 'Abandoned Cart Push',
        type: 'push',
        subject: 'Complete Your Purchase',
        content: 'Don\'t forget about your cart! Complete your purchase to secure your items.',
        variables: JSON.stringify({
          customer_name: 'string',
          cart_items_count: 'number',
          total_amount: 'number',
          shop_name: 'string'
        }),
        is_active: 1
      }
    ];

    // Insert templates
    for (const template of templates) {
      await database.run(`
        INSERT INTO notification_templates (
          id, name, type, subject, content, variables, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        template.id,
        template.name,
        template.type,
        template.subject,
        template.content,
        template.variables,
        template.is_active
      ]);
    }

    console.log(`✅ Successfully seeded ${templates.length} notification templates`);
    
    // Display summary
    const templateTypes = templates.reduce((acc, template) => {
      acc[template.type] = (acc[template.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📊 Template Summary:');
    Object.entries(templateTypes).forEach(([type, count]) => {
      console.log(`   ${type.toUpperCase()}: ${count} templates`);
    });

  } catch (error) {
    console.error('❌ Error seeding notification templates:', error);
    throw error;
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedNotificationTemplates()
    .then(() => {
      console.log('🎉 Notification templates seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Notification templates seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedNotificationTemplates;



