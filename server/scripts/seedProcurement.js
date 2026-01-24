const database = require('../database/database');
const { v4: uuidv4 } = require('uuid');

async function seedProcurementData() {
  console.log('🌱 Seeding Procurement data...');

  try {
    // Clear existing data
    await clearProcurementData();

    // Create suppliers
    const suppliers = [
      {
        id: uuidv4(),
        name: 'Premium Glass Suppliers Ltd',
        contact_person: 'Sarah Johnson',
        email: 'sarah.johnson@premiumglass.com',
        phone: '+1-555-0101',
        address: '123 Glass Street',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postal_code: '10001',
        tax_id: 'TAX123456',
        payment_terms: 'Net 30',
        credit_limit: 50000,
        supplier_category: 'packaging',
        rating: 4.5,
        is_approved: 1
      },
      {
        id: uuidv4(),
        name: 'Aroma Essence International',
        contact_person: 'Ahmed Hassan',
        email: 'ahmed.hassan@aromaessence.com',
        phone: '+1-555-0102',
        address: '456 Fragrance Avenue',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        postal_code: '90210',
        tax_id: 'TAX789012',
        payment_terms: 'Net 45',
        credit_limit: 75000,
        supplier_category: 'perfume',
        rating: 4.8,
        is_approved: 1
      },
      {
        id: uuidv4(),
        name: 'Metal Craft Industries',
        contact_person: 'Michael Chen',
        email: 'michael.chen@metalcraft.com',
        phone: '+1-555-0103',
        address: '789 Metal Road',
        city: 'Chicago',
        state: 'IL',
        country: 'USA',
        postal_code: '60601',
        tax_id: 'TAX345678',
        payment_terms: 'Net 30',
        credit_limit: 30000,
        supplier_category: 'packaging',
        rating: 4.2,
        is_approved: 1
      },
      {
        id: uuidv4(),
        name: 'Label Masters Inc',
        contact_person: 'Jennifer Davis',
        email: 'jennifer.davis@labelmasters.com',
        phone: '+1-555-0104',
        address: '321 Label Lane',
        city: 'Miami',
        state: 'FL',
        country: 'USA',
        postal_code: '33101',
        tax_id: 'TAX901234',
        payment_terms: 'Net 15',
        credit_limit: 25000,
        supplier_category: 'packaging',
        rating: 4.6,
        is_approved: 1
      },
      {
        id: uuidv4(),
        name: 'Oud & Musk Suppliers',
        contact_person: 'Fatima Al-Zahra',
        email: 'fatima.alzahra@oudmusk.com',
        phone: '+971-4-123456',
        address: 'Sheikh Zayed Road',
        city: 'Dubai',
        state: 'Dubai',
        country: 'UAE',
        postal_code: '00000',
        tax_id: 'UAE123456',
        payment_terms: 'Net 60',
        credit_limit: 100000,
        supplier_category: 'perfume',
        rating: 4.9,
        is_approved: 1
      }
    ];

    for (const supplier of suppliers) {
      await database.run(`
        INSERT INTO suppliers (
          id, name, contact_person, email, phone, address, city, state, country,
          postal_code, tax_id, payment_terms, credit_limit, supplier_category, rating, is_approved
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        supplier.id, supplier.name, supplier.contact_person, supplier.email, supplier.phone,
        supplier.address, supplier.city, supplier.state, supplier.country, supplier.postal_code,
        supplier.tax_id, supplier.payment_terms, supplier.credit_limit, supplier.supplier_category,
        supplier.rating, supplier.is_approved
      ]);
    }

    // Get existing raw materials to link with suppliers
    const rawMaterials = await database.all('SELECT * FROM raw_materials WHERE is_active = 1');

    // Create supplier materials (linking suppliers to materials they provide)
    const supplierMaterials = [
      // Premium Glass Suppliers - bottles
      {
        supplier_id: suppliers[0].id,
        material_id: rawMaterials.find(m => m.name.includes('50ml Glass Bottle'))?.id,
        supplier_material_code: 'PG-50GLASS',
        lead_time_days: 14,
        minimum_order_quantity: 100,
        standard_cost: 0.85,
        bulk_discount_percentage: 5.0,
        is_preferred: 1
      },
      {
        supplier_id: suppliers[0].id,
        material_id: rawMaterials.find(m => m.name.includes('100ml Glass Bottle'))?.id,
        supplier_material_code: 'PG-100GLASS',
        lead_time_days: 14,
        minimum_order_quantity: 50,
        standard_cost: 1.25,
        bulk_discount_percentage: 5.0,
        is_preferred: 1
      },
      // Aroma Essence - perfumes
      {
        supplier_id: suppliers[1].id,
        material_id: rawMaterials.find(m => m.name.includes('Night Oud'))?.id,
        supplier_material_code: 'AE-NIGHTOUD',
        lead_time_days: 21,
        minimum_order_quantity: 5,
        standard_cost: 45.00,
        bulk_discount_percentage: 10.0,
        is_preferred: 1
      },
      {
        supplier_id: suppliers[1].id,
        material_id: rawMaterials.find(m => m.name.includes('Rose Musk'))?.id,
        supplier_material_code: 'AE-ROSEMUSK',
        lead_time_days: 21,
        minimum_order_quantity: 5,
        standard_cost: 38.00,
        bulk_discount_percentage: 10.0,
        is_preferred: 1
      },
      // Metal Craft - caps
      {
        supplier_id: suppliers[2].id,
        material_id: rawMaterials.find(m => m.name.includes('Silver Cap'))?.id,
        supplier_material_code: 'MC-SILVERCAP',
        lead_time_days: 10,
        minimum_order_quantity: 200,
        standard_cost: 0.35,
        bulk_discount_percentage: 3.0,
        is_preferred: 1
      },
      // Label Masters - labels
      {
        supplier_id: suppliers[3].id,
        material_id: rawMaterials.find(m => m.name.includes('Premium Label'))?.id,
        supplier_material_code: 'LM-PREMLABEL',
        lead_time_days: 7,
        minimum_order_quantity: 500,
        standard_cost: 0.15,
        bulk_discount_percentage: 8.0,
        is_preferred: 1
      },
      // Oud & Musk - premium perfumes
      {
        supplier_id: suppliers[4].id,
        material_id: rawMaterials.find(m => m.name.includes('Royal Oud'))?.id,
        supplier_material_code: 'OM-ROYALOUD',
        lead_time_days: 30,
        minimum_order_quantity: 2,
        standard_cost: 120.00,
        bulk_discount_percentage: 15.0,
        is_preferred: 1
      }
    ];

    for (const sm of supplierMaterials) {
      if (sm.material_id) {
        await database.run(`
          INSERT INTO supplier_materials (
            id, supplier_id, material_id, supplier_material_code, lead_time_days,
            minimum_order_quantity, standard_cost, bulk_discount_percentage, is_preferred
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(), sm.supplier_id, sm.material_id, sm.supplier_material_code,
          sm.lead_time_days, sm.minimum_order_quantity, sm.standard_cost,
          sm.bulk_discount_percentage, sm.is_preferred
        ]);
      }
    }

    // Create sample purchase requisitions
    const requisitions = [
      {
        id: uuidv4(),
        requisition_number: 'REQ20250101-001',
        title: 'Monthly Glass Bottle Replenishment',
        description: 'Standard monthly order for glass bottles to maintain production capacity',
        priority: 'normal',
        status: 'approved',
        requested_by: '550e8400-e29b-41d4-a716-446655440000', // Assuming this user exists
        approved_by: '550e8400-e29b-41d4-a716-446655440000',
        total_estimated_cost: 1250.00
      },
      {
        id: uuidv4(),
        requisition_number: 'REQ20250101-002',
        title: 'Premium Perfume Oils Order',
        description: 'High-quality perfume oils for luxury product line',
        priority: 'high',
        status: 'approved',
        requested_by: '550e8400-e29b-41d4-a716-446655440000',
        approved_by: '550e8400-e29b-41d4-a716-446655440000',
        total_estimated_cost: 4500.00
      }
    ];

    for (const req of requisitions) {
      await database.run(`
        INSERT INTO purchase_requisitions (
          id, requisition_number, title, description, priority, status,
          requested_by, approved_by, approved_at, total_estimated_cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      `, [
        req.id, req.requisition_number, req.title, req.description, req.priority,
        req.status, req.requested_by, req.approved_by, req.total_estimated_cost
      ]);
    }

    // Create sample purchase orders
    const purchaseOrders = [
      {
        id: uuidv4(),
        po_number: 'PO20250101-001',
        supplier_id: suppliers[0].id, // Premium Glass
        requisition_id: requisitions[0].id,
        order_date: '2025-01-01',
        expected_delivery_date: '2025-01-15',
        status: 'delivered',
        subtotal: 1200.00,
        shipping_cost: 50.00,
        total_amount: 1250.00,
        created_by: '550e8400-e29b-41d4-a716-446655440000'
      },
      {
        id: uuidv4(),
        po_number: 'PO20250101-002',
        supplier_id: suppliers[1].id, // Aroma Essence
        requisition_id: requisitions[1].id,
        order_date: '2025-01-01',
        expected_delivery_date: '2025-01-22',
        status: 'in_transit',
        subtotal: 4050.00,
        shipping_cost: 150.00,
        total_amount: 4200.00,
        created_by: '550e8400-e29b-41d4-a716-446655440000'
      }
    ];

    for (const po of purchaseOrders) {
      await database.run(`
        INSERT INTO purchase_orders (
          id, po_number, supplier_id, requisition_id, order_date, expected_delivery_date,
          status, subtotal, shipping_cost, total_amount, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        po.id, po.po_number, po.supplier_id, po.requisition_id, po.order_date,
        po.expected_delivery_date, po.status, po.subtotal, po.shipping_cost,
        po.total_amount, po.created_by
      ]);
    }

    // Create sample goods receipt notes
    const goodsReceipts = [
      {
        id: uuidv4(),
        grn_number: 'GRN20250115-001',
        purchase_order_id: purchaseOrders[0].id,
        delivery_date: '2025-01-15',
        received_by: '550e8400-e29b-41d4-a716-446655440000',
        status: 'completed',
        total_items: 2,
        total_quantity: 150,
        total_value: 1250.00
      }
    ];

    for (const grn of goodsReceipts) {
      await database.run(`
        INSERT INTO goods_receipt_notes (
          id, grn_number, purchase_order_id, delivery_date, received_by,
          status, total_items, total_quantity, total_value
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        grn.id, grn.grn_number, grn.purchase_order_id, grn.delivery_date,
        grn.received_by, grn.status, grn.total_items, grn.total_quantity, grn.total_value
      ]);
    }

    // Create sample supplier performance evaluations
    const performanceEvaluations = [
      {
        id: uuidv4(),
        supplier_id: suppliers[0].id,
        evaluation_period: 'Q4 2024',
        delivery_on_time_rate: 95.0,
        quality_acceptance_rate: 98.0,
        price_competitiveness: 85.0,
        communication_rating: 90.0,
        overall_rating: 92.0,
        total_orders: 12,
        total_value: 15000.00,
        issues_count: 1,
        improvement_areas: 'Slightly higher prices compared to competitors',
        recommendations: 'Consider bulk pricing for larger orders',
        evaluated_by: '550e8400-e29b-41d4-a716-446655440000',
        evaluation_date: '2024-12-31'
      },
      {
        id: uuidv4(),
        supplier_id: suppliers[1].id,
        evaluation_period: 'Q4 2024',
        delivery_on_time_rate: 100.0,
        quality_acceptance_rate: 100.0,
        price_competitiveness: 90.0,
        communication_rating: 95.0,
        overall_rating: 96.25,
        total_orders: 8,
        total_value: 32000.00,
        issues_count: 0,
        improvement_areas: 'None',
        recommendations: 'Excellent supplier, maintain relationship',
        evaluated_by: '550e8400-e29b-41d4-a716-446655440000',
        evaluation_date: '2024-12-31'
      }
    ];

    for (const eval of performanceEvaluations) {
      await database.run(`
        INSERT INTO supplier_performance (
          id, supplier_id, evaluation_period, delivery_on_time_rate,
          quality_acceptance_rate, price_competitiveness, communication_rating,
          overall_rating, total_orders, total_value, issues_count,
          improvement_areas, recommendations, evaluated_by, evaluation_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        eval.id, eval.supplier_id, eval.evaluation_period, eval.delivery_on_time_rate,
        eval.quality_acceptance_rate, eval.price_competitiveness, eval.communication_rating,
        eval.overall_rating, eval.total_orders, eval.total_value, eval.issues_count,
        eval.improvement_areas, eval.recommendations, eval.evaluated_by, eval.evaluation_date
      ]);
    }

    // Note: Raw materials table needs to be recreated with new columns
    // This will be handled when the database schema is updated
    console.log('ℹ️  Raw materials table needs schema update for new procurement fields');

    console.log('🎉 Procurement data seeding completed successfully!');
    console.log(`✅ Created ${suppliers.length} suppliers`);
    console.log(`✅ Created ${supplierMaterials.length} supplier materials`);
    console.log(`✅ Created ${requisitions.length} purchase requisitions`);
    console.log(`✅ Created ${purchaseOrders.length} purchase orders`);
    console.log(`✅ Created ${goodsReceipts.length} goods receipt notes`);
    console.log(`✅ Created ${performanceEvaluations.length} performance evaluations`);

  } catch (error) {
    console.error('❌ Error seeding procurement data:', error);
    throw error;
  }
}

async function clearProcurementData() {
  console.log('🧹 Clearing existing Procurement data...');
  
  try {
    // Clear in reverse dependency order
    await database.run('DELETE FROM quality_inspections');
    await database.run('DELETE FROM goods_receipt_items');
    await database.run('DELETE FROM goods_receipt_notes');
    await database.run('DELETE FROM purchase_order_items');
    await database.run('DELETE FROM purchase_orders');
    await database.run('DELETE FROM purchase_requisition_items');
    await database.run('DELETE FROM purchase_requisitions');
    await database.run('DELETE FROM supplier_performance');
    await database.run('DELETE FROM supplier_materials');
    await database.run('DELETE FROM suppliers');
    await database.run('DELETE FROM material_specifications');
    
    console.log('✅ Procurement data cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing procurement data:', error);
    throw error;
  }
}

// Export functions for use in other scripts
module.exports = { seedProcurementData, clearProcurementData };

// Run if called directly
if (require.main === module) {
  seedProcurementData()
    .then(() => {
      console.log('Procurement seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Procurement seeding failed:', error);
      process.exit(1);
    });
} 