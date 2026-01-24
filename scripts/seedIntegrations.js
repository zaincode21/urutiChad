const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Database connection
const dbPath = path.join(__dirname, '..', 'database', 'retail.db');
const db = new sqlite3.Database(dbPath);

console.log('🌱 Seeding Integration data...');

// Sample integration data
const integrations = [
  {
    id: uuidv4(),
    name: 'Shopify Integration',
    type: 'api',
    provider: 'Shopify',
    api_key: 'shpca_1234567890abcdef',
    api_secret: 'shpss_1234567890abcdef',
    base_url: 'https://api.shopify.com',
    endpoints: JSON.stringify({
      products: '/admin/api/2023-10/products.json',
      orders: '/admin/api/2023-10/orders.json',
      customers: '/admin/api/2023-10/customers.json',
      test: '/admin/api/2023-10/shop.json'
    }),
    config: JSON.stringify({
      webhook_topics: ['orders/create', 'products/update'],
      sync_frequency: 'hourly'
    }),
    is_active: 1
  },
  {
    id: uuidv4(),
    name: 'WooCommerce Webhook',
    type: 'webhook',
    provider: 'WooCommerce',
    api_key: 'ck_1234567890abcdef',
    api_secret: 'cs_1234567890abcdef',
    webhook_url: 'https://your-store.com/wp-json/wc/v3/webhooks',
    base_url: 'https://your-store.com',
    endpoints: JSON.stringify({
      products: '/wp-json/wc/v3/products',
      orders: '/wp-json/wc/v3/orders',
      customers: '/wp-json/wc/v3/customers'
    }),
    config: JSON.stringify({
      webhook_events: ['order.created', 'product.updated'],
      delivery_url: 'https://your-app.com/webhooks/woocommerce'
    }),
    is_active: 1
  },
  {
    id: uuidv4(),
    name: 'Stripe Payment Gateway',
    type: 'api',
    provider: 'Stripe',
    api_key: 'sk_test_1234567890abcdef',
    api_secret: 'sk_live_1234567890abcdef',
    base_url: 'https://api.stripe.com',
    endpoints: JSON.stringify({
      payments: '/v1/payment_intents',
      customers: '/v1/customers',
      webhooks: '/v1/webhook_endpoints',
      test: '/v1/account'
    }),
    config: JSON.stringify({
      webhook_secret: 'whsec_1234567890abcdef',
      currency: 'USD',
      payment_methods: ['card', 'bank_transfer']
    }),
    is_active: 1
  },
  {
    id: uuidv4(),
    name: 'Google Analytics',
    type: 'oauth',
    provider: 'Google',
    api_key: 'AIzaSyB1234567890abcdef',
    api_secret: 'GOCSPX-1234567890abcdef',
    base_url: 'https://analytics.googleapis.com',
    endpoints: JSON.stringify({
      analytics: '/analytics/v3/data/ga',
      management: '/analytics/v3/management',
      token: '/oauth2/v4/token'
    }),
    config: JSON.stringify({
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      redirect_uri: 'https://your-app.com/oauth/google/callback'
    }),
    is_active: 1
  },
  {
    id: uuidv4(),
    name: 'Mailchimp Marketing',
    type: 'api',
    provider: 'Mailchimp',
    api_key: '1234567890abcdef-us1',
    api_secret: '',
    base_url: 'https://us1.api.mailchimp.com/3.0',
    endpoints: JSON.stringify({
      lists: '/lists',
      campaigns: '/campaigns',
      members: '/lists/{list_id}/members',
      test: '/ping'
    }),
    config: JSON.stringify({
      datacenter: 'us1',
      default_list: 'audience-123456',
      sync_frequency: 'daily'
    }),
    is_active: 1
  },
  {
    id: uuidv4(),
    name: 'Zapier Automation',
    type: 'webhook',
    provider: 'Zapier',
    api_key: 'zap_1234567890abcdef',
    api_secret: '',
    webhook_url: 'https://hooks.zapier.com/hooks/catch/123456/abcdef/',
    base_url: 'https://api.zapier.com',
    endpoints: JSON.stringify({
      triggers: '/v1/triggers',
      actions: '/v1/actions',
      webhooks: '/v1/webhooks'
    }),
    config: JSON.stringify({
      trigger_events: ['order.created', 'customer.registered'],
      action_types: ['email', 'notification', 'data_sync']
    }),
    is_active: 0
  }
];

// Sample execution data
const executions = [
  {
    id: uuidv4(),
    integration_id: integrations[0].id,
    action: 'sync_products',
    request_data: JSON.stringify({
      products: [
        { id: 1, name: 'Test Product 1', price: 29.99 },
        { id: 2, name: 'Test Product 2', price: 49.99 }
      ]
    }),
    response_data: JSON.stringify({
      success: true,
      synced_count: 2,
      message: 'Products synced successfully'
    }),
    status: 'completed',
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    completed_at: new Date(Date.now() - 3595000).toISOString()
  },
  {
    id: uuidv4(),
    integration_id: integrations[1].id,
    action: 'send_webhook',
    request_data: JSON.stringify({
      event: 'order.created',
      data: { order_id: 12345, total: 99.99 }
    }),
    response_data: JSON.stringify({
      success: true,
      status: 200,
      message: 'Webhook sent successfully'
    }),
    status: 'completed',
    created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    completed_at: new Date(Date.now() - 7195000).toISOString()
  },
  {
    id: uuidv4(),
    integration_id: integrations[2].id,
    action: 'sync_customers',
    request_data: JSON.stringify({
      customers: [
        { id: 1, email: 'customer1@example.com', name: 'John Doe' },
        { id: 2, email: 'customer2@example.com', name: 'Jane Smith' }
      ]
    }),
    response_data: JSON.stringify({
      success: false,
      error: 'API rate limit exceeded'
    }),
    status: 'failed',
    error_message: 'API rate limit exceeded',
    created_at: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    completed_at: new Date(Date.now() - 10795000).toISOString()
  }
];

// Sample webhook data
const webhooks = [
  {
    id: uuidv4(),
    integration_id: integrations[0].id,
    event_type: 'order.created',
    webhook_url: 'https://your-app.com/webhooks/shopify/orders',
    headers: JSON.stringify({
      'X-Shopify-Topic': 'orders/create',
      'X-Shopify-Hmac-Sha256': 'abc123'
    }),
    is_active: 1
  },
  {
    id: uuidv4(),
    integration_id: integrations[1].id,
    event_type: 'product.updated',
    webhook_url: 'https://your-app.com/webhooks/woocommerce/products',
    headers: JSON.stringify({
      'X-WC-Webhook-Source': 'woocommerce',
      'X-WC-Webhook-Topic': 'product.updated'
    }),
    is_active: 1
  }
];

// Sample log data
const logs = [
  {
    id: uuidv4(),
    integration_id: integrations[0].id,
    level: 'info',
    message: 'Integration connection established',
    details: JSON.stringify({ timestamp: new Date().toISOString() }),
    created_at: new Date().toISOString()
  },
  {
    id: uuidv4(),
    integration_id: integrations[1].id,
    level: 'warning',
    message: 'Webhook delivery failed',
    details: JSON.stringify({ 
      error: 'Connection timeout',
      retry_count: 3
    }),
    created_at: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
  },
  {
    id: uuidv4(),
    integration_id: integrations[2].id,
    level: 'error',
    message: 'API authentication failed',
    details: JSON.stringify({ 
      error: 'Invalid API key',
      status_code: 401
    }),
    created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  }
];

// Insert data
const insertData = () => {
  return new Promise((resolve, reject) => {
    console.log('📝 Inserting integration data...');

    // Insert integrations
    const integrationPromises = integrations.map(integration => {
      return new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO integrations (
            id, name, type, provider, api_key, api_secret, webhook_url,
            base_url, endpoints, config, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          integration.id, integration.name, integration.type, integration.provider,
          integration.api_key, integration.api_secret, integration.webhook_url,
          integration.base_url, integration.endpoints, integration.config, integration.is_active
        ], (err) => {
          if (err) {
            console.error('Error inserting integration:', err);
            reject(err);
          } else {
            console.log(`✅ Inserted integration: ${integration.name}`);
            resolve();
          }
        });
      });
    });

    // Insert executions
    const executionPromises = executions.map(execution => {
      return new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO integration_executions (
            id, integration_id, action, request_data, response_data,
            status, error_message, created_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          execution.id, execution.integration_id, execution.action,
          execution.request_data, execution.response_data, execution.status,
          execution.error_message, execution.created_at, execution.completed_at
        ], (err) => {
          if (err) {
            console.error('Error inserting execution:', err);
            reject(err);
          } else {
            console.log(`✅ Inserted execution: ${execution.action}`);
            resolve();
          }
        });
      });
    });

    // Insert webhooks
    const webhookPromises = webhooks.map(webhook => {
      return new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO integration_webhooks (
            id, integration_id, event_type, webhook_url, headers, is_active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          webhook.id, webhook.integration_id, webhook.event_type,
          webhook.webhook_url, webhook.headers, webhook.is_active
        ], (err) => {
          if (err) {
            console.error('Error inserting webhook:', err);
            reject(err);
          } else {
            console.log(`✅ Inserted webhook: ${webhook.event_type}`);
            resolve();
          }
        });
      });
    });

    // Insert logs
    const logPromises = logs.map(log => {
      return new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO integration_logs (
            id, integration_id, level, message, details, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          log.id, log.integration_id, log.level, log.message,
          log.details, log.created_at
        ], (err) => {
          if (err) {
            console.error('Error inserting log:', err);
            reject(err);
          } else {
            console.log(`✅ Inserted log: ${log.level} - ${log.message}`);
            resolve();
          }
        });
      });
    });

    // Wait for all insertions to complete
    Promise.all([...integrationPromises, ...executionPromises, ...webhookPromises, ...logPromises])
      .then(() => {
        console.log('🎉 Integration data seeding completed successfully!');
        resolve();
      })
      .catch(reject);
  });
};

// Run the seeding
insertData()
  .then(() => {
    console.log('✅ Integration seeding completed!');
    db.close();
  })
  .catch((error) => {
    console.error('❌ Error seeding integration data:', error);
    db.close();
    process.exit(1);
  }); 