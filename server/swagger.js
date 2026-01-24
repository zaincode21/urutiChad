const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LikaBoutiques API',
      version: '1.0.0',
      description: `
        Comprehensive API for LikaBoutiques - Boutique Management Platform.
        
        ## Features
        - **Multi-Shop Management**: Manage multiple retail locations
        - **Perfume Bottling System**: Complete bottling workflow with cost tracking
        - **Loyalty Program**: Customer loyalty tiers and points management
        - **Layaway System**: Advance payment and installment tracking
        - **Expense Management**: Comprehensive expense tracking and reporting
        - **Inventory Management**: Real-time stock tracking across locations
        - **Multi-Currency Support**: Handle transactions in multiple currencies
        
        ## Authentication
        All protected endpoints require a valid JWT token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## User Roles
        - **admin**: Full access to all features
        - **manager**: Shop management and reporting
        - **cashier**: Sales and customer service operations
      `,
      contact: {
        name: 'LikaBoutiques Support',
        email: 'support@smartretail.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        // User schemas
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'manager', 'cashier'] },
            phone: { type: 'string' },
            shop_id: { type: 'string', format: 'uuid' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', description: 'Username or email' },
            password: { type: 'string', description: 'Password' }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' }
          }
        },

        // Shop schemas
        Shop: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            country: { type: 'string' },
            postal_code: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            manager_id: { type: 'string', format: 'uuid' },
            manager_first_name: { type: 'string' },
            manager_last_name: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },

        // Category schemas
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            parent_id: { type: 'string', format: 'uuid', nullable: true },
            path: { type: 'string' },
            level: { type: 'integer' },
            type: { type: 'string', default: 'general' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            parent_name: { type: 'string' },
            children: {
              type: 'array',
              items: { $ref: '#/components/schemas/Category' }
            }
          }
        },
        CategoryAttribute: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            category_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            type: { type: 'string' },
            is_required: { type: 'boolean' },
            default_value: { type: 'string' },
            options: { type: 'string' },
            sort_order: { type: 'integer' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },

        // Product schemas
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            sku: { type: 'string' },
            barcode: { type: 'string' },
            brand_id: { type: 'string', format: 'uuid' },
            brand_name: { type: 'string' },
            product_type: { type: 'string', enum: ['general', 'perfume', 'clothing', 'shoes', 'accessory'] },
            size: { type: 'string' },
            color: { type: 'string' },
            variant: { type: 'string' },
            price: { type: 'number', format: 'decimal' },
            cost_price: { type: 'number', format: 'decimal' },
            currency: { type: 'string', default: 'RWF' },
            stock_quantity: { type: 'integer' },
            min_stock_level: { type: 'integer' },
            max_stock_level: { type: 'integer' },
            unit: { type: 'string', default: 'piece' },
            weight: { type: 'number', format: 'decimal' },
            dimensions: { type: 'string' },
            image_url: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            categories: {
              type: 'array',
              items: { $ref: '#/components/schemas/ProductCategory' }
            },
            attributes: {
              type: 'array',
              items: { $ref: '#/components/schemas/ProductAttribute' }
            },
            images: {
              type: 'array',
              items: { $ref: '#/components/schemas/ProductImage' }
            }
          }
        },
        ProductCategory: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            category_id: { type: 'string', format: 'uuid' },
            category_name: { type: 'string' },
            category_level: { type: 'integer' },
            category_path: { type: 'string' },
            is_primary: { type: 'boolean' }
          }
        },
        ProductAttribute: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            attribute_id: { type: 'string', format: 'uuid' },
            attribute_name: { type: 'string' },
            attribute_type: { type: 'string' },
            value: { type: 'string' },
            is_required: { type: 'boolean' }
          }
        },
        ProductImage: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            image_url: { type: 'string' },
            alt_text: { type: 'string' },
            is_primary: { type: 'boolean' },
            sort_order: { type: 'integer' }
          }
        },

        // Perfume schemas
        BulkPerfume: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            scent_description: { type: 'string' },
            bulk_quantity_liters: { type: 'number', format: 'decimal' },
            cost_per_liter: { type: 'number', format: 'decimal' },
            supplier: { type: 'string' },
            batch_number: { type: 'string' },
            expiry_date: { type: 'string', format: 'date' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        BottleSize: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            size_ml: { type: 'integer' },
            bottle_cost: { type: 'number', format: 'decimal' },
            label_cost: { type: 'number', format: 'decimal' },
            packaging_cost: { type: 'number', format: 'decimal' },
            labor_cost: { type: 'number', format: 'decimal' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        PerfumeBottling: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            bulk_perfume_id: { type: 'string', format: 'uuid' },
            bottle_size_id: { type: 'string', format: 'uuid' },
            quantity_bottled: { type: 'integer' },
            total_cost: { type: 'number', format: 'decimal' },
            created_by: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },

        // Customer schemas
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            country: { type: 'string' },
            postal_code: { type: 'string' },
            loyalty_points: { type: 'integer', default: 0 },
            loyalty_tier: { type: 'string', enum: ['bronze', 'silver', 'gold'], default: 'bronze' },
            total_spent: { type: 'number', format: 'decimal', default: 0 },
            birthday: { type: 'string', format: 'date' },
            anniversary_date: { type: 'string', format: 'date' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },

        // Order schemas
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            customer_id: { type: 'string', format: 'uuid' },
            shop_id: { type: 'string', format: 'uuid' },
            order_number: { type: 'string' },
            order_type: { type: 'string', enum: ['regular', 'layaway'], default: 'regular' },
            status: { type: 'string', enum: ['pending', 'active', 'completed', 'cancelled'], default: 'pending' },
            subtotal: { type: 'number', format: 'decimal' },
            tax_amount: { type: 'number', format: 'decimal', default: 0 },
            discount_amount: { type: 'number', format: 'decimal', default: 0 },
            loyalty_discount: { type: 'number', format: 'decimal', default: 0 },
            total_amount: { type: 'number', format: 'decimal' },
            currency: { type: 'string', default: 'RWF' },
            payment_method: { type: 'string' },
            payment_status: { type: 'string', enum: ['pending', 'paid', 'failed'], default: 'pending' },
            notes: { type: 'string' },
            created_by: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },

        // Expense schemas
        Expense: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            shop_id: { type: 'string', format: 'uuid' },
            category: { type: 'string' },
            description: { type: 'string' },
            amount: { type: 'number', format: 'decimal' },
            currency: { type: 'string', default: 'RWF' },
            expense_date: { type: 'string', format: 'date' },
            receipt_url: { type: 'string' },
            is_recurring: { type: 'boolean', default: false },
            recurring_frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
            created_by: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },

        // Loyalty schemas
        LoyaltyTransaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            customer_id: { type: 'string', format: 'uuid' },
            transaction_type: { type: 'string', enum: ['earned', 'redeemed'] },
            points: { type: 'integer' },
            description: { type: 'string' },
            order_id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        BottleReturn: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            customer_id: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer' },
            bottle_size: { type: 'string' },
            return_date: { type: 'string', format: 'date-time' },
            processed_by: { type: 'string', format: 'uuid' },
            discount_applied: { type: 'number', format: 'decimal', default: 0 },
            created_at: { type: 'string', format: 'date-time' }
          }
        },

        // Layaway schemas
        LayawayPayment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            order_id: { type: 'string', format: 'uuid' },
            amount: { type: 'number', format: 'decimal' },
            payment_date: { type: 'string', format: 'date-time' },
            payment_method: { type: 'string' },
            notes: { type: 'string' },
            created_by: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },

        // Error schemas
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                  value: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Shops',
        description: 'Multi-shop/branch management operations'
      },
      {
        name: 'Products',
        description: 'Product catalog and inventory management'
      },
      {
        name: 'Perfumes',
        description: 'Perfume bottling and bulk inventory management'
      },
      {
        name: 'Customers',
        description: 'Customer management and profiles'
      },
      {
        name: 'Orders',
        description: 'Sales orders and transactions'
      },
      {
        name: 'Loyalty',
        description: 'Customer loyalty program and points management'
      },
      {
        name: 'Layaway',
        description: 'Layaway/advance payment system'
      },
      {
        name: 'Expenses',
        description: 'Expense tracking and management'
      },
      {
        name: 'Inventory',
        description: 'Inventory tracking and stock management'
      },
      {
        name: 'Dashboard',
        description: 'Analytics and reporting endpoints'
      },
      {
        name: 'Currency',
        description: 'Multi-currency and exchange rate operations'
      }
    ]
  },
  apis: [
    './server/routes/*.js',
    './server/index.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs; 