const database = require('../database/database');
const { v4: uuidv4 } = require('uuid');

async function seedSmartBottlingData() {
  try {
    console.log('🌱 Seeding Smart Bottling data...');

    // Enhanced sample raw materials with more variety
    const rawMaterials = [
      // Bottles - Different sizes and types
      {
        id: uuidv4(),
        name: 'Premium Glass Bottle 30ml',
        type: 'bottle',
        description: 'Elegant glass bottle for 30ml perfumes',
        unit: 'piece',
        current_stock: 750,
        cost_per_unit: 1.80,
        supplier: 'Glass Supplies Co',
        batch_number: 'GB-2024-003',
        min_stock_level: 150
      },
      {
        id: uuidv4(),
        name: 'Premium Glass Bottle 50ml',
        type: 'bottle',
        description: 'High-quality glass bottle for 50ml perfumes',
        unit: 'piece',
        current_stock: 500,
        cost_per_unit: 2.50,
        supplier: 'Glass Supplies Co',
        batch_number: 'GB-2024-001',
        min_stock_level: 100
      },
      {
        id: uuidv4(),
        name: 'Premium Glass Bottle 100ml',
        type: 'bottle',
        description: 'High-quality glass bottle for 100ml perfumes',
        unit: 'piece',
        current_stock: 300,
        cost_per_unit: 3.75,
        supplier: 'Glass Supplies Co',
        batch_number: 'GB-2024-002',
        min_stock_level: 75
      },
      {
        id: uuidv4(),
        name: 'Luxury Crystal Bottle 50ml',
        type: 'bottle',
        description: 'Premium crystal bottle for luxury perfumes',
        unit: 'piece',
        current_stock: 200,
        cost_per_unit: 8.50,
        supplier: 'Crystal Artisans',
        batch_number: 'CB-2024-001',
        min_stock_level: 50
      },
      {
        id: uuidv4(),
        name: 'Travel Spray Bottle 15ml',
        type: 'bottle',
        description: 'Compact travel spray bottle',
        unit: 'piece',
        current_stock: 1200,
        cost_per_unit: 1.20,
        supplier: 'Travel Essentials',
        batch_number: 'TB-2024-001',
        min_stock_level: 300
      },
      
      // Caps - Different styles
      {
        id: uuidv4(),
        name: 'Silver Cap Standard',
        type: 'cap',
        description: 'Standard silver cap for perfume bottles',
        unit: 'piece',
        current_stock: 800,
        cost_per_unit: 0.75,
        supplier: 'Cap Manufacturing Ltd',
        batch_number: 'SC-2024-001',
        min_stock_level: 200
      },
      {
        id: uuidv4(),
        name: 'Gold Plated Cap Premium',
        type: 'cap',
        description: 'Premium gold plated cap for luxury perfumes',
        unit: 'piece',
        current_stock: 400,
        cost_per_unit: 2.25,
        supplier: 'Luxury Caps Co',
        batch_number: 'GC-2024-001',
        min_stock_level: 100
      },
      {
        id: uuidv4(),
        name: 'Travel Spray Cap',
        type: 'cap',
        description: 'Spray cap for travel bottles',
        unit: 'piece',
        current_stock: 1200,
        cost_per_unit: 0.45,
        supplier: 'Travel Essentials',
        batch_number: 'TC-2024-001',
        min_stock_level: 300
      },
      
      // Labels - Different types
      {
        id: uuidv4(),
        name: 'Premium Label Paper',
        type: 'label',
        description: 'High-quality label paper for perfume bottles',
        unit: 'piece',
        current_stock: 1000,
        cost_per_unit: 0.50,
        supplier: 'Paper Products Inc',
        batch_number: 'PL-2024-001',
        min_stock_level: 250
      },
      {
        id: uuidv4(),
        name: 'Foil Label Premium',
        type: 'label',
        description: 'Premium foil labels for luxury perfumes',
        unit: 'piece',
        current_stock: 600,
        cost_per_unit: 1.25,
        supplier: 'Luxury Labels',
        batch_number: 'FL-2024-001',
        min_stock_level: 150
      },
      {
        id: uuidv4(),
        name: 'Travel Label Small',
        type: 'label',
        description: 'Small labels for travel bottles',
        unit: 'piece',
        current_stock: 1500,
        cost_per_unit: 0.30,
        supplier: 'Paper Products Inc',
        batch_number: 'TL-2024-001',
        min_stock_level: 400
      },
      
      // Packaging - Different types
      {
        id: uuidv4(),
        name: 'Gift Box Small',
        type: 'packaging',
        description: 'Elegant gift box for small perfume bottles',
        unit: 'piece',
        current_stock: 400,
        cost_per_unit: 1.25,
        supplier: 'Packaging Solutions',
        batch_number: 'GB-2024-001',
        min_stock_level: 100
      },
      {
        id: uuidv4(),
        name: 'Luxury Gift Box',
        type: 'packaging',
        description: 'Premium gift box for luxury perfumes',
        unit: 'piece',
        current_stock: 250,
        cost_per_unit: 3.50,
        supplier: 'Luxury Packaging',
        batch_number: 'LGB-2024-001',
        min_stock_level: 75
      },
      {
        id: uuidv4(),
        name: 'Travel Pouch',
        type: 'packaging',
        description: 'Travel pouch for travel bottles',
        unit: 'piece',
        current_stock: 800,
        cost_per_unit: 0.80,
        supplier: 'Travel Essentials',
        batch_number: 'TP-2024-001',
        min_stock_level: 200
      },
      
      // Bulk Perfumes - Different fragrances
      {
        id: uuidv4(),
        name: 'Rose Garden Perfume Bulk',
        type: 'perfume',
        description: 'Bulk rose garden perfume concentrate',
        unit: 'liter',
        current_stock: 25.5,
        cost_per_unit: 35.00,
        supplier: 'Fragrance World',
        batch_number: 'RG-2024-001',
        min_stock_level: 5.0
      },
      {
        id: uuidv4(),
        name: 'Lavender Fields Perfume Bulk',
        type: 'perfume',
        description: 'Bulk lavender fields perfume concentrate',
        unit: 'liter',
        current_stock: 18.0,
        cost_per_unit: 28.50,
        supplier: 'Fragrance World',
        batch_number: 'LF-2024-001',
        min_stock_level: 3.0
      },
      {
        id: uuidv4(),
        name: 'Oud Royal Perfume Bulk',
        type: 'perfume',
        description: 'Premium oud royal perfume concentrate',
        unit: 'liter',
        current_stock: 12.0,
        cost_per_unit: 85.00,
        supplier: 'Luxury Fragrances',
        batch_number: 'OR-2024-001',
        min_stock_level: 2.0
      },
      {
        id: uuidv4(),
        name: 'Vanilla Dreams Perfume Bulk',
        type: 'perfume',
        description: 'Sweet vanilla dreams perfume concentrate',
        unit: 'liter',
        current_stock: 22.0,
        cost_per_unit: 32.00,
        supplier: 'Fragrance World',
        batch_number: 'VD-2024-001',
        min_stock_level: 4.0
      },
      {
        id: uuidv4(),
        name: 'Citrus Fresh Perfume Bulk',
        type: 'perfume',
        description: 'Fresh citrus blend perfume concentrate',
        unit: 'liter',
        current_stock: 15.5,
        cost_per_unit: 25.00,
        supplier: 'Fragrance World',
        batch_number: 'CF-2024-001',
        min_stock_level: 3.0
      }
    ];

    for (const material of rawMaterials) {
      await database.run(`
        INSERT INTO raw_materials (
          id, name, type, description, unit, current_stock, cost_per_unit,
          supplier, batch_number, min_stock_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        material.id, material.name, material.type, material.description,
        material.unit, material.current_stock, material.cost_per_unit,
        material.supplier, material.batch_number, material.min_stock_level
      ]);

      // Record initial stock in ledger
      await database.run(`
        INSERT INTO stock_ledger (
          id, material_id, transaction_type, quantity, unit_cost, total_value,
          reference_type, reference_id, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), material.id, 'initial', material.current_stock, material.cost_per_unit,
        material.current_stock * material.cost_per_unit, 'raw_material', material.id,
        'Initial stock entry', 'system'
      ]);
    }

    console.log('✅ Raw materials seeded');

    // Enhanced bottle sizes with more options
    const bottleSizes = [
      {
        id: uuidv4(),
        size_ml: 15,
        bottle_cost: 1.20,
        label_cost: 0.30,
        packaging_cost: 0.80,
        labor_cost: 2.00
      },
      {
        id: uuidv4(),
        size_ml: 30,
        bottle_cost: 1.80,
        label_cost: 0.50,
        packaging_cost: 1.00,
        labor_cost: 2.50
      },
      {
        id: uuidv4(),
        size_ml: 50,
        bottle_cost: 2.50,
        label_cost: 0.75,
        packaging_cost: 1.25,
        labor_cost: 3.00
      },
      {
        id: uuidv4(),
        size_ml: 100,
        bottle_cost: 3.75,
        label_cost: 1.00,
        packaging_cost: 1.50,
        labor_cost: 3.50
      },
      {
        id: uuidv4(),
        size_ml: 50,
        bottle_cost: 8.50,
        label_cost: 1.25,
        packaging_cost: 3.50,
        labor_cost: 4.00
      }
    ];

    for (const size of bottleSizes) {
      await database.run(`
        INSERT INTO bottle_sizes (id, size_ml, bottle_cost, label_cost, packaging_cost, labor_cost)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [size.id, size.size_ml, size.bottle_cost, size.label_cost, size.packaging_cost, size.labor_cost]);
    }

    console.log('✅ Bottle sizes seeded');

    // Enhanced bulk perfumes with more variety
    const bulkPerfumes = [
      {
        id: uuidv4(),
        name: 'Rose Garden',
        scent_description: 'Romantic rose petals with musk undertones',
        bulk_quantity_liters: 25.5,
        cost_per_liter: 35.00,
        supplier: 'Fragrance World',
        batch_number: 'RG-2024-001',
        expiry_date: '2025-12-31'
      },
      {
        id: uuidv4(),
        name: 'Lavender Fields',
        scent_description: 'Fresh lavender with hints of vanilla',
        bulk_quantity_liters: 18.0,
        cost_per_liter: 28.50,
        supplier: 'Fragrance World',
        batch_number: 'LF-2024-001',
        expiry_date: '2025-10-15'
      },
      {
        id: uuidv4(),
        name: 'Oud Royal',
        scent_description: 'Rich oud with sandalwood and amber',
        bulk_quantity_liters: 12.0,
        cost_per_liter: 85.00,
        supplier: 'Luxury Fragrances',
        batch_number: 'OR-2024-001',
        expiry_date: '2026-06-30'
      },
      {
        id: uuidv4(),
        name: 'Vanilla Dreams',
        scent_description: 'Sweet vanilla with caramel and musk',
        bulk_quantity_liters: 22.0,
        cost_per_liter: 32.00,
        supplier: 'Fragrance World',
        batch_number: 'VD-2024-001',
        expiry_date: '2025-11-20'
      },
      {
        id: uuidv4(),
        name: 'Citrus Fresh',
        scent_description: 'Zesty citrus blend with bergamot',
        bulk_quantity_liters: 15.5,
        cost_per_liter: 25.00,
        supplier: 'Fragrance World',
        batch_number: 'CF-2024-001',
        expiry_date: '2025-09-10'
      }
    ];

    for (const perfume of bulkPerfumes) {
      await database.run(`
        INSERT INTO perfume_bulk (
          id, name, scent_description, bulk_quantity_liters, cost_per_liter,
          supplier, batch_number, expiry_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        perfume.id, perfume.name, perfume.scent_description, perfume.bulk_quantity_liters,
        perfume.cost_per_liter, perfume.supplier, perfume.batch_number, perfume.expiry_date
      ]);
    }

    console.log('✅ Bulk perfumes seeded');

    // Enhanced recipes with more variety
    const recipes = [
      {
        id: uuidv4(),
        name: '30ml Standard Recipe',
        description: 'Standard recipe for 30ml perfume bottles',
        bottle_size_id: bottleSizes[1].id, // 30ml
        materials: [
          { material_id: rawMaterials[0].id, quantity_per_unit: 1 }, // 30ml bottle
          { material_id: rawMaterials[5].id, quantity_per_unit: 1 }, // cap
          { material_id: rawMaterials[8].id, quantity_per_unit: 1 }, // label
          { material_id: rawMaterials[11].id, quantity_per_unit: 1 }, // packaging
          { material_id: rawMaterials[14].id, quantity_per_unit: 0.03 } // 30ml perfume
        ]
      },
      {
        id: uuidv4(),
        name: '50ml Standard Recipe',
        description: 'Standard recipe for 50ml perfume bottles',
        bottle_size_id: bottleSizes[2].id, // 50ml
        materials: [
          { material_id: rawMaterials[1].id, quantity_per_unit: 1 }, // 50ml bottle
          { material_id: rawMaterials[5].id, quantity_per_unit: 1 }, // cap
          { material_id: rawMaterials[8].id, quantity_per_unit: 1 }, // label
          { material_id: rawMaterials[11].id, quantity_per_unit: 1 }, // packaging
          { material_id: rawMaterials[14].id, quantity_per_unit: 0.05 } // 50ml perfume
        ]
      },
      {
        id: uuidv4(),
        name: '100ml Premium Recipe',
        description: 'Premium recipe for 100ml perfume bottles',
        bottle_size_id: bottleSizes[3].id, // 100ml
        materials: [
          { material_id: rawMaterials[2].id, quantity_per_unit: 1 }, // 100ml bottle
          { material_id: rawMaterials[5].id, quantity_per_unit: 1 }, // cap
          { material_id: rawMaterials[8].id, quantity_per_unit: 1 }, // label
          { material_id: rawMaterials[11].id, quantity_per_unit: 1 }, // packaging
          { material_id: rawMaterials[14].id, quantity_per_unit: 0.1 } // 100ml perfume
        ]
      },
      {
        id: uuidv4(),
        name: '50ml Luxury Recipe',
        description: 'Luxury recipe for 50ml premium perfumes',
        bottle_size_id: bottleSizes[4].id, // 50ml luxury
        materials: [
          { material_id: rawMaterials[3].id, quantity_per_unit: 1 }, // luxury bottle
          { material_id: rawMaterials[6].id, quantity_per_unit: 1 }, // gold cap
          { material_id: rawMaterials[9].id, quantity_per_unit: 1 }, // foil label
          { material_id: rawMaterials[12].id, quantity_per_unit: 1 }, // luxury packaging
          { material_id: rawMaterials[16].id, quantity_per_unit: 0.05 } // oud perfume
        ]
      },
      {
        id: uuidv4(),
        name: '15ml Travel Recipe',
        description: 'Travel recipe for 15ml spray bottles',
        bottle_size_id: bottleSizes[0].id, // 15ml
        materials: [
          { material_id: rawMaterials[4].id, quantity_per_unit: 1 }, // travel bottle
          { material_id: rawMaterials[7].id, quantity_per_unit: 1 }, // spray cap
          { material_id: rawMaterials[10].id, quantity_per_unit: 1 }, // small label
          { material_id: rawMaterials[13].id, quantity_per_unit: 1 }, // travel pouch
          { material_id: rawMaterials[14].id, quantity_per_unit: 0.015 } // 15ml perfume
        ]
      }
    ];

    for (const recipe of recipes) {
      await database.run(`
        INSERT INTO bottling_recipes (id, name, description, bottle_size_id)
        VALUES (?, ?, ?, ?)
      `, [recipe.id, recipe.name, recipe.description, recipe.bottle_size_id]);

      // Add recipe materials
      for (const material of recipe.materials) {
        await database.run(`
          INSERT INTO recipe_materials (id, recipe_id, material_id, quantity_per_unit)
          VALUES (?, ?, ?, ?)
        `, [uuidv4(), recipe.id, material.material_id, material.quantity_per_unit]);
      }
    }

    console.log('✅ Recipes seeded');

    // Enhanced bottling batches with more variety and realistic data
    const batches = [
      {
        id: uuidv4(),
        batch_number: 'BATCH20241201-001',
        recipe_id: recipes[1].id, // 50ml Standard
        bulk_perfume_id: bulkPerfumes[0].id, // Rose Garden
        quantity_produced: 100,
        total_cost: 850.00,
        unit_cost: 8.50,
        selling_price: 12.75,
        notes: 'First batch of Rose Garden 50ml',
        created_by: 'system'
      },
      {
        id: uuidv4(),
        batch_number: 'BATCH20241201-002',
        recipe_id: recipes[2].id, // 100ml Premium
        bulk_perfume_id: bulkPerfumes[1].id, // Lavender Fields
        quantity_produced: 50,
        total_cost: 675.00,
        unit_cost: 13.50,
        selling_price: 20.25,
        notes: 'First batch of Lavender Fields 100ml',
        created_by: 'system'
      },
      {
        id: uuidv4(),
        batch_number: 'BATCH20241202-001',
        recipe_id: recipes[3].id, // 50ml Luxury
        bulk_perfume_id: bulkPerfumes[2].id, // Oud Royal
        quantity_produced: 75,
        total_cost: 1875.00,
        unit_cost: 25.00,
        selling_price: 45.00,
        notes: 'Luxury Oud Royal 50ml batch',
        created_by: 'system'
      },
      {
        id: uuidv4(),
        batch_number: 'BATCH20241202-002',
        recipe_id: recipes[0].id, // 30ml Standard
        bulk_perfume_id: bulkPerfumes[3].id, // Vanilla Dreams
        quantity_produced: 150,
        total_cost: 675.00,
        unit_cost: 4.50,
        selling_price: 8.50,
        notes: 'Vanilla Dreams 30ml batch',
        created_by: 'system'
      },
      {
        id: uuidv4(),
        batch_number: 'BATCH20241203-001',
        recipe_id: recipes[4].id, // 15ml Travel
        bulk_perfume_id: bulkPerfumes[4].id, // Citrus Fresh
        quantity_produced: 200,
        total_cost: 480.00,
        unit_cost: 2.40,
        selling_price: 5.50,
        notes: 'Citrus Fresh travel spray batch',
        created_by: 'system'
      },
      {
        id: uuidv4(),
        batch_number: 'BATCH20241203-002',
        recipe_id: recipes[1].id, // 50ml Standard
        bulk_perfume_id: bulkPerfumes[0].id, // Rose Garden
        quantity_produced: 80,
        total_cost: 680.00,
        unit_cost: 8.50,
        selling_price: 12.75,
        notes: 'Second batch of Rose Garden 50ml',
        created_by: 'system'
      },
      {
        id: uuidv4(),
        batch_number: 'BATCH20241204-001',
        recipe_id: recipes[2].id, // 100ml Premium
        bulk_perfume_id: bulkPerfumes[1].id, // Lavender Fields
        quantity_produced: 60,
        total_cost: 810.00,
        unit_cost: 13.50,
        selling_price: 20.25,
        notes: 'Second batch of Lavender Fields 100ml',
        created_by: 'system'
      },
      {
        id: uuidv4(),
        batch_number: 'BATCH20241204-002',
        recipe_id: recipes[3].id, // 50ml Luxury
        bulk_perfume_id: bulkPerfumes[2].id, // Oud Royal
        quantity_produced: 40,
        total_cost: 1000.00,
        unit_cost: 25.00,
        selling_price: 45.00,
        notes: 'Second luxury Oud Royal batch',
        created_by: 'system'
      }
    ];

    for (const batch of batches) {
      await database.run(`
        INSERT INTO bottling_batches (
          id, batch_number, recipe_id, bulk_perfume_id, quantity_produced,
          total_cost, unit_cost, selling_price, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        batch.id, batch.batch_number, batch.recipe_id, batch.bulk_perfume_id,
        batch.quantity_produced, batch.total_cost, batch.unit_cost, batch.selling_price,
        batch.notes, batch.created_by
      ]);

      // Add detailed cost components based on recipe type
      let costComponents = [];
      
      if (batch.recipe_id === recipes[3].id) { // Luxury recipe
        costComponents = [
          { component_type: 'material', component_name: 'Luxury Bottle', quantity: batch.quantity_produced, unit_cost: 8.50, total_cost: batch.quantity_produced * 8.50 },
          { component_type: 'material', component_name: 'Gold Cap', quantity: batch.quantity_produced, unit_cost: 2.25, total_cost: batch.quantity_produced * 2.25 },
          { component_type: 'material', component_name: 'Foil Label', quantity: batch.quantity_produced, unit_cost: 1.25, total_cost: batch.quantity_produced * 1.25 },
          { component_type: 'material', component_name: 'Luxury Packaging', quantity: batch.quantity_produced, unit_cost: 3.50, total_cost: batch.quantity_produced * 3.50 },
          { component_type: 'material', component_name: 'Oud Perfume', quantity: batch.quantity_produced * 0.05, unit_cost: 85.00, total_cost: batch.quantity_produced * 0.05 * 85.00 },
          { component_type: 'labor', component_name: 'Labor Cost', quantity: 1, unit_cost: batch.quantity_produced * 4.00, total_cost: batch.quantity_produced * 4.00 },
          { component_type: 'overhead', component_name: 'Overhead Cost', quantity: 1, unit_cost: batch.total_cost * 0.15, total_cost: batch.total_cost * 0.15 }
        ];
      } else if (batch.recipe_id === recipes[4].id) { // Travel recipe
        costComponents = [
          { component_type: 'material', component_name: 'Travel Bottle', quantity: batch.quantity_produced, unit_cost: 1.20, total_cost: batch.quantity_produced * 1.20 },
          { component_type: 'material', component_name: 'Spray Cap', quantity: batch.quantity_produced, unit_cost: 0.45, total_cost: batch.quantity_produced * 0.45 },
          { component_type: 'material', component_name: 'Small Label', quantity: batch.quantity_produced, unit_cost: 0.30, total_cost: batch.quantity_produced * 0.30 },
          { component_type: 'material', component_name: 'Travel Pouch', quantity: batch.quantity_produced, unit_cost: 0.80, total_cost: batch.quantity_produced * 0.80 },
          { component_type: 'material', component_name: 'Citrus Perfume', quantity: batch.quantity_produced * 0.015, unit_cost: 25.00, total_cost: batch.quantity_produced * 0.015 * 25.00 },
          { component_type: 'labor', component_name: 'Labor Cost', quantity: 1, unit_cost: batch.quantity_produced * 2.00, total_cost: batch.quantity_produced * 2.00 },
          { component_type: 'overhead', component_name: 'Overhead Cost', quantity: 1, unit_cost: batch.total_cost * 0.1, total_cost: batch.total_cost * 0.1 }
        ];
      } else { // Standard recipes
        costComponents = [
          { component_type: 'material', component_name: 'Bottle', quantity: batch.quantity_produced, unit_cost: 2.50, total_cost: batch.quantity_produced * 2.50 },
          { component_type: 'material', component_name: 'Cap', quantity: batch.quantity_produced, unit_cost: 0.75, total_cost: batch.quantity_produced * 0.75 },
          { component_type: 'material', component_name: 'Label', quantity: batch.quantity_produced, unit_cost: 0.50, total_cost: batch.quantity_produced * 0.50 },
          { component_type: 'material', component_name: 'Packaging', quantity: batch.quantity_produced, unit_cost: 1.25, total_cost: batch.quantity_produced * 1.25 },
          { component_type: 'material', component_name: 'Perfume', quantity: batch.quantity_produced * 0.05, unit_cost: 35.00, total_cost: batch.quantity_produced * 0.05 * 35.00 },
          { component_type: 'labor', component_name: 'Labor Cost', quantity: 1, unit_cost: batch.quantity_produced * 3.00, total_cost: batch.quantity_produced * 3.00 },
          { component_type: 'overhead', component_name: 'Overhead Cost', quantity: 1, unit_cost: batch.total_cost * 0.1, total_cost: batch.total_cost * 0.1 }
        ];
      }

      for (const component of costComponents) {
        await database.run(`
          INSERT INTO cost_components (
            id, batch_id, component_type, component_name, quantity, unit_cost, total_cost
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(), batch.id, component.component_type, component.component_name,
          component.quantity, component.unit_cost, component.total_cost
        ]);
      }
    }

    console.log('✅ Bottling batches seeded');

    console.log('🎉 Smart Bottling data seeding completed successfully!');
    console.log('\n📊 Enhanced sample data created:');
    console.log(`   • ${rawMaterials.length} raw materials (bottles, caps, labels, packaging, perfumes)`);
    console.log(`   • ${bottleSizes.length} bottle sizes (15ml to 100ml, including luxury)`);
    console.log(`   • ${bulkPerfumes.length} bulk perfumes (5 different fragrances)`);
    console.log(`   • ${recipes.length} recipes (standard, premium, luxury, travel)`);
    console.log(`   • ${batches.length} bottling batches (various sizes and fragrances)`);
    console.log('\n✨ Features available for testing:');
    console.log('   • Multiple bottle sizes and types');
    console.log('   • Different fragrance options');
    console.log('   • Standard and luxury packaging');
    console.log('   • Travel spray options');
    console.log('   • Detailed cost breakdowns');
    console.log('   • Stock tracking and forecasting');

  } catch (error) {
    console.error('❌ Error seeding Smart Bottling data:', error);
    throw error;
  }
}

// Run the seeding function
if (require.main === module) {
  seedSmartBottlingData()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedSmartBottlingData }; 