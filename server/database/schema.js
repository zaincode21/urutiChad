const { v4: uuidv4 } = require('uuid');

class PostgreSQLSchema {
  async createTables(db) {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'cashier',
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        phone VARCHAR(50),
        shop_id UUID,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Shops table
      `CREATE TABLE IF NOT EXISTS shops (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(255),
        state VARCHAR(255),
        country VARCHAR(255),
        postal_code VARCHAR(20),
        phone VARCHAR(50),
        email VARCHAR(255),
        manager_id UUID,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manager_id) REFERENCES users (id)
      )`,

      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        parent_id UUID,
        path TEXT,
        level INTEGER DEFAULT 0,
        type VARCHAR(50) DEFAULT 'general',
        is_active BOOLEAN DEFAULT true,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories (id)
      )`,

      // Brands table
      `CREATE TABLE IF NOT EXISTS brands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        logo_url TEXT,
        website TEXT,
        country VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Products table
      `CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        sku VARCHAR(255) UNIQUE,
        barcode VARCHAR(255),
        brand_id UUID,
        category_id UUID,
        product_type VARCHAR(50) DEFAULT 'general',
        size VARCHAR(100),
        color VARCHAR(100),
        variant VARCHAR(100),
        price DECIMAL(10,2) NOT NULL,
        cost_price DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'RWF',
        stock_quantity INTEGER DEFAULT 0,
        current_stock INTEGER DEFAULT 0,
        reserved_stock INTEGER DEFAULT 0,
        available_stock INTEGER DEFAULT 0,
        min_stock_level INTEGER DEFAULT 0,
        max_stock_level INTEGER,
        reorder_point INTEGER DEFAULT 20,
        unit VARCHAR(50) DEFAULT 'piece',
        weight DECIMAL(8,3),
        dimensions TEXT,
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (brand_id) REFERENCES brands (id),
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )`,

      // Customers table
      `CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(50),
        address TEXT,
        city VARCHAR(255),
        state VARCHAR(255),
        country VARCHAR(255),
        postal_code VARCHAR(20),
        loyalty_points INTEGER DEFAULT 0,
        loyalty_tier VARCHAR(50) DEFAULT 'bronze',
        total_spent DECIMAL(12,2) DEFAULT 0,
        birthday DATE,
        anniversary_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Discounts table
      `CREATE TABLE IF NOT EXISTS discounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'bottle_return')),
        value DECIMAL(10,2) NOT NULL,
        min_purchase_amount DECIMAL(10,2),
        max_discount_amount DECIMAL(10,2),
        start_date DATE,
        end_date DATE,
        usage_limit INTEGER,
        usage_per_customer INTEGER,
        applicable_to VARCHAR(50) DEFAULT 'all',
        customer_tiers JSONB,
        bottle_return_count INTEGER,
        is_active BOOLEAN DEFAULT true,
        auto_apply BOOLEAN DEFAULT false,
        discount_type VARCHAR(50) DEFAULT 'regular_discount',
        allow_partial_payment BOOLEAN DEFAULT false,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Discount applications table
      `CREATE TABLE IF NOT EXISTS discount_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id),
        discount_id UUID REFERENCES discounts(id),
        amount_applied DECIMAL(10,2) NOT NULL,
        percentage_applied DECIMAL(5,2),
        original_amount DECIMAL(10,2) NOT NULL,
        final_amount DECIMAL(10,2) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Customer discount usage table
      `CREATE TABLE IF NOT EXISTS customer_discount_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id),
        discount_id UUID REFERENCES discounts(id),
        usage_count INTEGER DEFAULT 0,
        last_used_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_id, discount_id)
      )`,

      // Orders table
      `CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID,
        shop_id UUID,
        order_number VARCHAR(255) UNIQUE NOT NULL,
        order_type VARCHAR(50) DEFAULT 'regular',
        status VARCHAR(50) DEFAULT 'completed',
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        loyalty_discount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        amount_paid DECIMAL(10,2) DEFAULT 0,
        remaining_amount DECIMAL(10,2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'RWF',
        payment_method VARCHAR(50),
        payment_status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (shop_id) REFERENCES shops (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Order items table
      `CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL,
        product_id UUID NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'RWF',
        discount_percent DECIMAL(5,2) DEFAULT 0,
        is_atelier_item BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`,

      // GL Account Categories
      `CREATE TABLE IF NOT EXISTS gl_account_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
        parent_id UUID,
        level INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES gl_account_categories (id)
      )`,

      // GL Accounts
      `CREATE TABLE IF NOT EXISTS gl_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_code VARCHAR(50) UNIQUE NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        description TEXT,
        category_id UUID NOT NULL,
        account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
        normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
        is_contra BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES gl_account_categories (id)
      )`,

      // Settings table
      `CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        category VARCHAR(100) DEFAULT 'general',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Shop inventory table
      `CREATE TABLE IF NOT EXISTS shop_inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL,
        product_id UUID NOT NULL,
        quantity INTEGER DEFAULT 0,
        min_stock_level INTEGER DEFAULT 0,
        max_stock_level INTEGER,
        reorder_point INTEGER DEFAULT 0,
        safety_stock INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shop_id, product_id),
        FOREIGN KEY (shop_id) REFERENCES shops (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`,

      // Inventory transactions table
      `CREATE TABLE IF NOT EXISTS inventory_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        shop_id UUID,
        warehouse_id UUID,
        transaction_type VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        previous_stock INTEGER,
        new_stock INTEGER,
        unit_cost DECIMAL(10,2),
        total_value DECIMAL(10,2),
        batch_number VARCHAR(255),
        expiry_date DATE,
        reference_id UUID,
        reference_type VARCHAR(50),
        notes TEXT,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id),
        FOREIGN KEY (shop_id) REFERENCES shops (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Warehouse inventory table
      `CREATE TABLE IF NOT EXISTS warehouse_inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        warehouse_id UUID NOT NULL,
        product_id UUID NOT NULL,
        quantity INTEGER DEFAULT 0,
        min_stock_level INTEGER DEFAULT 0,
        max_stock_level INTEGER,
        reorder_point INTEGER DEFAULT 0,
        safety_stock INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(warehouse_id, product_id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`,

      // Stock transfers table
      `CREATE TABLE IF NOT EXISTS stock_transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transfer_number VARCHAR(50) UNIQUE NOT NULL,
        from_type VARCHAR(20) NOT NULL CHECK (from_type IN ('shop', 'warehouse')),
        from_id UUID NOT NULL,
        to_type VARCHAR(20) NOT NULL CHECK (to_type IN ('shop', 'warehouse')),
        to_id UUID NOT NULL,
        product_id UUID NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        notes TEXT,
        created_by UUID,
        completed_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id),
        FOREIGN KEY (created_by) REFERENCES users (id),
        FOREIGN KEY (completed_by) REFERENCES users (id)
      )`,

      // Warehouses table
      `CREATE TABLE IF NOT EXISTS warehouses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        address TEXT,
        city VARCHAR(255),
        state VARCHAR(255),
        country VARCHAR(255),
        postal_code VARCHAR(20),
        contact_person VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        capacity_sqm DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Expenses table
      `CREATE TABLE IF NOT EXISTS expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID,
        category VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'RWF',
        expense_date DATE NOT NULL,
        payment_method VARCHAR(50),
        vendor_name VARCHAR(255),
        receipt_url TEXT,
        created_by UUID,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Expense categories table
      `CREATE TABLE IF NOT EXISTS expense_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Currency rates table
      `CREATE TABLE IF NOT EXISTS currency_rates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        from_currency VARCHAR(3) NOT NULL,
        to_currency VARCHAR(3) NOT NULL,
        rate DECIMAL(15,6) NOT NULL,
        rate_date DATE NOT NULL,
        source VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(from_currency, to_currency, rate_date)
      )`,

      // Financial transactions table
      `CREATE TABLE IF NOT EXISTS financial_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_date DATE NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        gl_account_id UUID,
        reference_type VARCHAR(50),
        reference_id UUID,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gl_account_id) REFERENCES gl_accounts (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Exchange rates table
      `CREATE TABLE IF NOT EXISTS exchange_rates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        base_currency VARCHAR(3) NOT NULL,
        target_currency VARCHAR(3) NOT NULL,
        rate DECIMAL(15,6) NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(base_currency, target_currency)
      )`,

      // GL Journal Entries table
      `CREATE TABLE IF NOT EXISTS gl_journal_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_number VARCHAR(50) UNIQUE NOT NULL,
        entry_date DATE NOT NULL,
        description TEXT,
        reference_number VARCHAR(100),
        status VARCHAR(20) DEFAULT 'draft',
        total_debits DECIMAL(15,2) DEFAULT 0,
        total_credits DECIMAL(15,2) DEFAULT 0,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // GL Journal Entry Lines table
      `CREATE TABLE IF NOT EXISTS gl_journal_entry_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        journal_entry_id UUID NOT NULL,
        gl_account_id UUID NOT NULL,
        description TEXT,
        debit_amount DECIMAL(15,2) DEFAULT 0,
        credit_amount DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (journal_entry_id) REFERENCES gl_journal_entries (id) ON DELETE CASCADE,
        FOREIGN KEY (gl_account_id) REFERENCES gl_accounts (id)
      )`,

      // Price Change Log table
      `CREATE TABLE IF NOT EXISTS price_change_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        old_price DECIMAL(10,2),
        new_price DECIMAL(10,2) NOT NULL,
        change_reason TEXT,
        pricing_strategy VARCHAR(50),
        calculated_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id),
        FOREIGN KEY (calculated_by) REFERENCES users (id)
      )`,

      // Raw Materials table
      `CREATE TABLE IF NOT EXISTS raw_materials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        current_stock DECIMAL(10,2) DEFAULT 0,
        min_stock_level DECIMAL(10,2) DEFAULT 0,
        max_stock_level DECIMAL(10,2),
        reorder_point DECIMAL(10,2) DEFAULT 0,
        safety_stock DECIMAL(10,2) DEFAULT 0,
        cost_per_unit DECIMAL(10,2) NOT NULL,
        supplier_id UUID,
        supplier_name VARCHAR(255),
        supplier_contact VARCHAR(255),
        lead_time_days INTEGER DEFAULT 0,
        shelf_life_days INTEGER,
        storage_requirements TEXT,
        quality_standards TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Bottling Recipes table
      `CREATE TABLE IF NOT EXISTS bottling_recipes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        bottle_size_id UUID,
        version VARCHAR(20) DEFAULT '1.0',
        status VARCHAR(20) DEFAULT 'active',
        category VARCHAR(100),
        difficulty_level VARCHAR(20),
        estimated_production_time INTEGER,
        target_cost DECIMAL(10,2),
        markup_percentage DECIMAL(5,2),
        selling_price DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'RWF',
        quality_standards TEXT,
        shelf_life_days INTEGER,
        batch_size_min INTEGER,
        batch_size_max INTEGER,
        production_notes TEXT,
        yield_percentage DECIMAL(5,2),
        waste_percentage DECIMAL(5,2),
        recipe_image_url TEXT,
        instruction_manual_url TEXT,
        safety_instructions TEXT,
        testing_requirements TEXT,
        storage_requirements TEXT,
        quality_checkpoints TEXT,
        efficiency_rating DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Recipe Materials table
      `CREATE TABLE IF NOT EXISTS recipe_materials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipe_id UUID NOT NULL,
        material_id UUID NOT NULL,
        quantity_per_unit DECIMAL(10,4) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipe_id) REFERENCES bottling_recipes (id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES raw_materials (id)
      )`,

      // Bottling Batches table
      `CREATE TABLE IF NOT EXISTS bottling_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_number VARCHAR(100) UNIQUE NOT NULL,
        recipe_id UUID NOT NULL,
        bulk_perfume_id UUID,
        quantity_planned INTEGER NOT NULL,
        quantity_produced INTEGER DEFAULT 0,
        quantity_defective INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'planned',
        production_date DATE,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        unit_cost DECIMAL(10,2),
        total_cost DECIMAL(10,2),
        profit_margin DECIMAL(5,2) DEFAULT 50.00,
        selling_price DECIMAL(10,2),
        operator_id UUID,
        supervisor_id UUID,
        notes TEXT,
        quality_score DECIMAL(3,2),
        efficiency_rating DECIMAL(3,2),
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipe_id) REFERENCES bottling_recipes (id),
        FOREIGN KEY (bulk_perfume_id) REFERENCES perfume_bulk (id),
        FOREIGN KEY (operator_id) REFERENCES users (id),
        FOREIGN KEY (supervisor_id) REFERENCES users (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Cost Components table
      `CREATE TABLE IF NOT EXISTS cost_components (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_id UUID NOT NULL,
        component_type VARCHAR(50) NOT NULL,
        component_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,4) NOT NULL,
        unit_cost DECIMAL(10,4) NOT NULL,
        total_cost DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES bottling_batches (id) ON DELETE CASCADE
      )`,

      // Stock Ledger table
      `CREATE TABLE IF NOT EXISTS stock_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        material_id UUID NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        quantity DECIMAL(10,4) NOT NULL,
        unit_cost DECIMAL(10,4),
        total_value DECIMAL(10,2),
        reference_type VARCHAR(50),
        reference_id UUID,
        notes TEXT,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES raw_materials (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Bottle Sizes table
      `CREATE TABLE IF NOT EXISTS bottle_sizes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        size_ml INTEGER NOT NULL,
        bottle_cost DECIMAL(10,2) NOT NULL,
        label_cost DECIMAL(10,2) DEFAULT 0,
        packaging_cost DECIMAL(10,2) DEFAULT 0,
        labor_cost DECIMAL(10,2) DEFAULT 0,
        quantity INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Perfume Bulk table
      `CREATE TABLE IF NOT EXISTS perfume_bulk (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        scent_description TEXT,
        bulk_quantity_ml INTEGER NOT NULL,
        cost_per_ml DECIMAL(10,4) NOT NULL,
        supplier VARCHAR(255),
        batch_number VARCHAR(255),
        expiry_date DATE,
        category_id UUID,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )`,

      // Perfume Bottling table
      `CREATE TABLE IF NOT EXISTS perfume_bottling (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bulk_perfume_id UUID NOT NULL,
        bottle_size_id UUID NOT NULL,
        quantity_bottled INTEGER NOT NULL,
        total_cost DECIMAL(15,2) NOT NULL,
        selling_price_per_ml DECIMAL(10,4),
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bulk_perfume_id) REFERENCES perfume_bulk (id),
        FOREIGN KEY (bottle_size_id) REFERENCES bottle_sizes (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Suppliers table
      `CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        city VARCHAR(255),
        state VARCHAR(255),
        country VARCHAR(255),
        postal_code VARCHAR(20),
        tax_id VARCHAR(100),
        payment_terms VARCHAR(100),
        credit_limit DECIMAL(15,2),
        supplier_category VARCHAR(100),
        notes TEXT,
        is_approved BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Supplier Materials table
      `CREATE TABLE IF NOT EXISTS supplier_materials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id UUID NOT NULL,
        material_id UUID NOT NULL,
        material_code VARCHAR(100),
        supplier_part_number VARCHAR(100),
        standard_cost DECIMAL(10,4) NOT NULL,
        minimum_order_quantity DECIMAL(10,2) DEFAULT 1,
        lead_time_days INTEGER DEFAULT 0,
        is_preferred BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
        FOREIGN KEY (material_id) REFERENCES raw_materials (id)
      )`,

      // Purchase Requisitions table
      `CREATE TABLE IF NOT EXISTS purchase_requisitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requisition_number VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        requested_by UUID NOT NULL,
        department VARCHAR(100),
        priority VARCHAR(20) DEFAULT 'normal',
        status VARCHAR(20) DEFAULT 'pending',
        total_estimated_cost DECIMAL(15,2),
        approved_by UUID,
        approved_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (requested_by) REFERENCES users (id),
        FOREIGN KEY (approved_by) REFERENCES users (id)
      )`,

      // Purchase Requisition Items table
      `CREATE TABLE IF NOT EXISTS purchase_requisition_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requisition_id UUID NOT NULL,
        material_id UUID NOT NULL,
        quantity_required DECIMAL(10,4) NOT NULL,
        unit_cost DECIMAL(10,4),
        total_cost DECIMAL(15,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (requisition_id) REFERENCES purchase_requisitions (id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES raw_materials (id)
      )`,

      // Purchase Orders table
      `CREATE TABLE IF NOT EXISTS purchase_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        po_number VARCHAR(100) UNIQUE NOT NULL,
        supplier_id UUID NOT NULL,
        order_date DATE NOT NULL,
        expected_delivery_date DATE,
        status VARCHAR(20) DEFAULT 'pending',
        total_amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'RWF',
        payment_terms VARCHAR(100),
        shipping_address TEXT,
        notes TEXT,
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Purchase Order Items table
      `CREATE TABLE IF NOT EXISTS purchase_order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id UUID NOT NULL,
        material_id UUID NOT NULL,
        quantity_ordered DECIMAL(10,4) NOT NULL,
        quantity_received DECIMAL(10,4) DEFAULT 0,
        unit_cost DECIMAL(10,4) NOT NULL,
        total_cost DECIMAL(15,2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES raw_materials (id)
      )`,

      // Goods Receipts table
      `CREATE TABLE IF NOT EXISTS goods_receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        grn_number VARCHAR(100) UNIQUE NOT NULL,
        purchase_order_id UUID,
        supplier_id UUID NOT NULL,
        receipt_date DATE NOT NULL,
        received_by UUID NOT NULL,
        status VARCHAR(20) DEFAULT 'received',
        total_value DECIMAL(15,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
        FOREIGN KEY (received_by) REFERENCES users (id)
      )`,

      // Goods Receipt Items table
      `CREATE TABLE IF NOT EXISTS goods_receipt_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        goods_receipt_id UUID NOT NULL,
        material_id UUID NOT NULL,
        quantity_received DECIMAL(10,4) NOT NULL,
        unit_cost DECIMAL(10,4),
        total_cost DECIMAL(15,2),
        batch_number VARCHAR(100),
        expiry_date DATE,
        quality_status VARCHAR(20) DEFAULT 'good',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts (id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES raw_materials (id)
      )`,

      // Supplier Performance table
      `CREATE TABLE IF NOT EXISTS supplier_performance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id UUID NOT NULL,
        performance_date DATE NOT NULL,
        delivery_rating DECIMAL(3,2),
        quality_rating DECIMAL(3,2),
        price_rating DECIMAL(3,2),
        service_rating DECIMAL(3,2),
        overall_rating DECIMAL(3,2),
        notes TEXT,
        evaluated_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
        FOREIGN KEY (evaluated_by) REFERENCES users (id)
      )`,

      // Translations table for i18n
      `CREATE TABLE IF NOT EXISTS translations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        language VARCHAR(10) NOT NULL,
        namespace VARCHAR(50) NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(language, namespace, key)
      )`,

      // Loyalty transactions table
      `CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        points INTEGER NOT NULL,
        description TEXT,
        order_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (order_id) REFERENCES orders (id)
      )`,

      // Bottle returns table
      `CREATE TABLE IF NOT EXISTS bottle_returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL,
        quantity INTEGER NOT NULL,
        bottle_size VARCHAR(100),
        return_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        processed_by UUID,
        discount_applied DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (processed_by) REFERENCES users (id)
      )`,

      // Order status logs table
      `CREATE TABLE IF NOT EXISTS order_status_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL,
        status_from VARCHAR(50),
        status_to VARCHAR(50) NOT NULL,
        notes TEXT,
        changed_by UUID,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (changed_by) REFERENCES users (id)
      )`,

      // Notification Templates table
      `CREATE TABLE IF NOT EXISTS notification_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK(type IN ('sms', 'email', 'push')),
        subject TEXT,
        content TEXT NOT NULL,
        variables TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Notification Campaigns table
      `CREATE TABLE IF NOT EXISTS notification_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        template_id UUID,
        campaign_type VARCHAR(50) NOT NULL CHECK(campaign_type IN ('promotion', 'loyalty', 'payment_reminder', 'custom')),
        target_audience TEXT,
        filters TEXT,
        scheduled_at TIMESTAMP,
        sent_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'draft' CHECK(status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
        total_recipients INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        opened_count INTEGER DEFAULT 0,
        clicked_count INTEGER DEFAULT 0,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES notification_templates (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID,
        customer_id UUID,
        type VARCHAR(20) NOT NULL CHECK(type IN ('sms', 'email', 'push')),
        subject TEXT,
        content TEXT NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'delivered', 'failed', 'opened', 'clicked')),
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP,
        opened_at TIMESTAMP,
        clicked_at TIMESTAMP,
        error_message TEXT,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES notification_campaigns (id),
        FOREIGN KEY (customer_id) REFERENCES customers (id)
      )`,

      // Notification Triggers table
      `CREATE TABLE IF NOT EXISTS notification_triggers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        trigger_type VARCHAR(50) NOT NULL CHECK(trigger_type IN ('promotion', 'loyalty', 'payment_reminder', 'order_update', 'custom')),
        conditions TEXT,
        template_id UUID,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES notification_templates (id)
      )`,

      // Customer Notification Preferences table
      `CREATE TABLE IF NOT EXISTS customer_notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL,
        sms_enabled BOOLEAN DEFAULT true,
        email_enabled BOOLEAN DEFAULT true,
        push_enabled BOOLEAN DEFAULT true,
        marketing_sms BOOLEAN DEFAULT true,
        marketing_email BOOLEAN DEFAULT true,
        marketing_push BOOLEAN DEFAULT true,
        loyalty_notifications BOOLEAN DEFAULT true,
        payment_reminders BOOLEAN DEFAULT true,
        order_updates BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        UNIQUE(customer_id)
      )`,

      // Notification Analytics table
      `CREATE TABLE IF NOT EXISTS notification_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID,
        date DATE,
        total_sent INTEGER DEFAULT 0,
        total_delivered INTEGER DEFAULT 0,
        total_opened INTEGER DEFAULT 0,
        total_clicked INTEGER DEFAULT 0,
        total_failed INTEGER DEFAULT 0,
        delivery_rate DECIMAL(5,2),
        open_rate DECIMAL(5,2),
        click_rate DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES notification_campaigns (id)
      )`
    ];

    // Create all tables
    for (const table of tables) {
      await db.query(table);
    }

    // Create indexes for better performance
    await this.createIndexes(db);
  }

  async createIndexes(db) {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)',
      'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)',
      'CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)',
      'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)',
      'CREATE INDEX IF NOT EXISTS idx_gl_accounts_code ON gl_accounts(account_code)',
      'CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)',
      'CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language)',
      'CREATE INDEX IF NOT EXISTS idx_translations_namespace ON translations(namespace)',
      'CREATE INDEX IF NOT EXISTS idx_translations_lang_ns ON translations(language, namespace)'
    ];

    for (const index of indexes) {
      await db.query(index);
    }
  }
}

module.exports = new PostgreSQLSchema();

