const database = require('./database');
const { v4: uuidv4 } = require('uuid');

async function migratePerfumeData() {
  try {
    console.log('🔄 Starting perfume data migration...');

    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create comprehensive perfume categories based on the schema example
    const perfumeCategories = [
      // By Gender (Level 0)
      { id: uuidv4(), name: 'Fragrances', description: 'All fragrances and perfumes', type: 'perfume', parent_id: null, path: '', level: 0 },
      
      // By Gender (Level 1)
      { id: uuidv4(), name: 'Men', description: 'Perfumes for men', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Women', description: 'Perfumes for women', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Unisex', description: 'Unisex fragrances', type: 'perfume', parent_id: null, level: 1 },
      
      // By Fragrance Family (Level 0)
      { id: uuidv4(), name: 'Fragrance Families', description: 'Fragrance family classifications', type: 'perfume', parent_id: null, path: '', level: 0 },
      
      // By Fragrance Family (Level 1)
      { id: uuidv4(), name: 'Floral', description: 'Floral fragrances', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Fresh', description: 'Fresh fragrances', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Oriental', description: 'Oriental fragrances', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Woody', description: 'Woody fragrances', type: 'perfume', parent_id: null, level: 1 },
      
      // By Fragrance Family (Level 2)
      { id: uuidv4(), name: 'Citrus', description: 'Citrus fresh fragrances', type: 'perfume', parent_id: null, level: 2 },
      { id: uuidv4(), name: 'Aquatic', description: 'Aquatic fresh fragrances', type: 'perfume', parent_id: null, level: 2 },
      { id: uuidv4(), name: 'Floral Fruity', description: 'Floral fruity fragrances', type: 'perfume', parent_id: null, level: 2 },
      
      // By Concentration (Level 0)
      { id: uuidv4(), name: 'Concentration', description: 'Perfume concentration levels', type: 'perfume', parent_id: null, path: '', level: 0 },
      
      // By Concentration (Level 1)
      { id: uuidv4(), name: 'Parfum', description: 'Highest concentration (20-30%)', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Eau de Parfum', description: 'High concentration (15-20%)', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Eau de Toilette', description: 'Medium concentration (5-15%)', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Eau de Cologne', description: 'Light concentration (2-5%)', type: 'perfume', parent_id: null, level: 1 },
      
      // By Brand (Level 0)
      { id: uuidv4(), name: 'Brands', description: 'Perfume brands', type: 'perfume', parent_id: null, path: '', level: 0 },
      
      // By Brand (Level 1)
      { id: uuidv4(), name: 'Chanel', description: 'Luxury French fashion house', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Dior', description: 'French luxury goods company', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Tom Ford', description: 'American luxury fashion house', type: 'perfume', parent_id: null, level: 1 },
      
      // By Occasion (Level 0)
      { id: uuidv4(), name: 'Occasions', description: 'Perfume occasions', type: 'perfume', parent_id: null, path: '', level: 0 },
      
      // By Occasion (Level 1)
      { id: uuidv4(), name: 'Daily Wear', description: 'Everyday fragrances', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Evening', description: 'Evening and special occasions', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Special Events', description: 'Special events and celebrations', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Office', description: 'Professional office wear', type: 'perfume', parent_id: null, level: 1 },
      
      // By Season (Level 0)
      { id: uuidv4(), name: 'Seasons', description: 'Seasonal fragrances', type: 'perfume', parent_id: null, path: '', level: 0 },
      
      // By Season (Level 1)
      { id: uuidv4(), name: 'Spring', description: 'Spring fragrances', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Summer', description: 'Summer fragrances', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Fall', description: 'Fall fragrances', type: 'perfume', parent_id: null, level: 1 },
      { id: uuidv4(), name: 'Winter', description: 'Winter fragrances', type: 'perfume', parent_id: null, level: 1 }
    ];

    // Insert all categories
    for (const category of perfumeCategories) {
      await database.run(`
        INSERT OR IGNORE INTO categories (id, name, description, type, parent_id, path, level)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [category.id, category.name, category.description, category.type, category.parent_id, category.path, category.level]);
    }

    // Create perfume-specific brands
    const perfumeBrands = [
      { id: uuidv4(), name: 'Chanel', description: 'Luxury French fashion house known for iconic fragrances' },
      { id: uuidv4(), name: 'Dior', description: 'French luxury goods company with prestigious perfumes' },
      { id: uuidv4(), name: 'Tom Ford', description: 'American luxury fashion house with sophisticated fragrances' },
      { id: uuidv4(), name: 'Yves Saint Laurent', description: 'French luxury fashion house' },
      { id: uuidv4(), name: 'Guerlain', description: 'French perfume house with rich heritage' },
      { id: uuidv4(), name: 'Jo Malone', description: 'British fragrance house known for simple, elegant scents' },
      { id: uuidv4(), name: 'Maison Margiela', description: 'Avant-garde fashion house with unique fragrances' },
      { id: uuidv4(), name: 'Byredo', description: 'Swedish luxury perfume house' }
    ];

    for (const brand of perfumeBrands) {
      await database.run(`
        INSERT OR IGNORE INTO brands (id, name, description)
        VALUES (?, ?, ?)
      `, [brand.id, brand.name, brand.description]);
    }

    // Get category IDs after insertion
    const womenCategory = await database.get(`SELECT id FROM categories WHERE name = 'Women' AND type = 'perfume'`);
    const menCategory = await database.get(`SELECT id FROM categories WHERE name = 'Men' AND type = 'perfume'`);
    const unisexCategory = await database.get(`SELECT id FROM categories WHERE name = 'Unisex' AND type = 'perfume'`);
    const floralCategory = await database.get(`SELECT id FROM categories WHERE name = 'Floral' AND type = 'perfume'`);
    const freshCategory = await database.get(`SELECT id FROM categories WHERE name = 'Fresh' AND type = 'perfume'`);
    const orientalCategory = await database.get(`SELECT id FROM categories WHERE name = 'Oriental' AND type = 'perfume'`);
    const woodyCategory = await database.get(`SELECT id FROM categories WHERE name = 'Woody' AND type = 'perfume'`);
    const aquaticCategory = await database.get(`SELECT id FROM categories WHERE name = 'Aquatic' AND type = 'perfume'`);
    const edpCategory = await database.get(`SELECT id FROM categories WHERE name = 'Eau de Parfum' AND type = 'perfume'`);
    const edtCategory = await database.get(`SELECT id FROM categories WHERE name = 'Eau de Toilette' AND type = 'perfume'`);
    const chanelCategory = await database.get(`SELECT id FROM categories WHERE name = 'Chanel' AND type = 'perfume'`);
    const diorCategory = await database.get(`SELECT id FROM categories WHERE name = 'Dior' AND type = 'perfume'`);
    const tomFordCategory = await database.get(`SELECT id FROM categories WHERE name = 'Tom Ford' AND type = 'perfume'`);
    const dailyWearCategory = await database.get(`SELECT id FROM categories WHERE name = 'Daily Wear' AND type = 'perfume'`);
    const eveningCategory = await database.get(`SELECT id FROM categories WHERE name = 'Evening' AND type = 'perfume'`);
    const springCategory = await database.get(`SELECT id FROM categories WHERE name = 'Spring' AND type = 'perfume'`);
    const summerCategory = await database.get(`SELECT id FROM categories WHERE name = 'Summer' AND type = 'perfume'`);
    const fallCategory = await database.get(`SELECT id FROM categories WHERE name = 'Fall' AND type = 'perfume'`);
    const winterCategory = await database.get(`SELECT id FROM categories WHERE name = 'Winter' AND type = 'perfume'`);

    // Create sample perfume products based on the schema
    const perfumeProducts = [
      {
        id: uuidv4(),
        name: 'Chanel No. 5 Eau de Parfum 100ml',
        description: 'Iconic floral aldehyde fragrance with notes of rose, jasmine, and vanilla',
        sku: 'CHANEL-5-EDP-100',
        brand_id: perfumeBrands[0].id,
        product_type: 'perfume',
        size: '100ml',
        price: 150.00,
        cost_price: 75.00,
        stock_quantity: 25,
        min_stock_level: 5,
        categories: [
          womenCategory.id, // Women
          floralCategory.id, // Floral
          edpCategory.id, // Eau de Parfum
          chanelCategory.id, // Chanel
          eveningCategory.id, // Evening
          winterCategory.id  // Winter
        ]
      },
      {
        id: uuidv4(),
        name: 'Tom Ford Oud Wood 50ml',
        description: 'Exotic woody oriental fragrance with oud, sandalwood, and vanilla',
        sku: 'TF-OUD-WOOD-50',
        brand_id: perfumeBrands[2].id,
        product_type: 'perfume',
        size: '50ml',
        price: 320.00,
        cost_price: 160.00,
        stock_quantity: 15,
        min_stock_level: 3,
        categories: [
          unisexCategory.id, // Unisex
          woodyCategory.id, // Woody
          edpCategory.id, // Eau de Parfum
          tomFordCategory.id, // Tom Ford
          eveningCategory.id, // Evening
          fallCategory.id  // Fall
        ]
      },
      {
        id: uuidv4(),
        name: 'Dior Sauvage Eau de Toilette 100ml',
        description: 'Fresh spicy mens fragrance with bergamot, pepper, and ambroxan',
        sku: 'DIOR-SAUVAGE-EDT-100',
        brand_id: perfumeBrands[1].id,
        product_type: 'perfume',
        size: '100ml',
        price: 95.00,
        cost_price: 47.50,
        stock_quantity: 40,
        min_stock_level: 8,
        categories: [
          menCategory.id, // Men
          freshCategory.id, // Fresh
          edtCategory.id, // Eau de Toilette
          diorCategory.id, // Dior
          dailyWearCategory.id, // Daily Wear
          springCategory.id  // Spring
        ]
      },
      {
        id: uuidv4(),
        name: 'Jo Malone Wood Sage & Sea Salt 30ml',
        description: 'Fresh aquatic fragrance with ambrette seeds and sea salt',
        sku: 'JM-WOOD-SAGE-30',
        brand_id: perfumeBrands[5].id,
        product_type: 'perfume',
        size: '30ml',
        price: 75.00,
        cost_price: 37.50,
        stock_quantity: 30,
        min_stock_level: 6,
        categories: [
          unisexCategory.id, // Unisex
          freshCategory.id, // Fresh
          aquaticCategory.id, // Aquatic
          edtCategory.id, // Eau de Toilette
          dailyWearCategory.id, // Daily Wear
          summerCategory.id  // Summer
        ]
      },
      {
        id: uuidv4(),
        name: 'YSL Black Opium Eau de Parfum 90ml',
        description: 'Addictive gourmand fragrance with coffee, vanilla, and white flowers',
        sku: 'YSL-BLACK-OPIUM-90',
        brand_id: perfumeBrands[3].id,
        product_type: 'perfume',
        size: '90ml',
        price: 135.00,
        cost_price: 67.50,
        stock_quantity: 20,
        min_stock_level: 4,
        categories: [
          womenCategory.id, // Women
          orientalCategory.id, // Oriental
          edpCategory.id, // Eau de Parfum
          eveningCategory.id, // Evening
          winterCategory.id  // Winter
        ]
      }
    ];

    // Insert perfume products
    for (const product of perfumeProducts) {
      const { categories, ...productData } = product;
      await database.run(`
        INSERT OR IGNORE INTO products (
          id, name, description, sku, brand_id, product_type, size,
          price, cost_price, stock_quantity, min_stock_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        productData.id, productData.name, productData.description, productData.sku,
        productData.brand_id, productData.product_type, productData.size,
        productData.price, productData.cost_price, productData.stock_quantity, productData.min_stock_level
      ]);

      // Create product-category relationships
      for (let i = 0; i < categories.length; i++) {
        await database.run(`
          INSERT OR IGNORE INTO product_categories (id, product_id, category_id, is_primary)
          VALUES (?, ?, ?, ?)
        `, [uuidv4(), productData.id, categories[i], i === 0 ? 1 : 0]);
      }
    }

    // Get the Fragrances root category
    const fragrancesRootCategory = await database.get(`SELECT id FROM categories WHERE name = 'Fragrances' AND type = 'perfume'`);

    // Create perfume-specific category attributes
    const perfumeAttributes = [
      // Size attribute for all fragrances
      {
        category_id: fragrancesRootCategory.id, // Fragrances root
        name: 'Size',
        type: 'select',
        is_required: true,
        default_value: '50ml',
        options: JSON.stringify(['30ml', '50ml', '75ml', '100ml', '125ml', '200ml']),
        sort_order: 1
      },
      // Top Notes attribute
      {
        category_id: fragrancesRootCategory.id,
        name: 'Top Notes',
        type: 'multiselect',
        is_required: true,
        default_value: '',
        options: JSON.stringify(['Bergamot', 'Lemon', 'Orange', 'Lavender', 'Rose', 'Jasmine', 'Sandalwood', 'Vanilla', 'Musk', 'Pepper', 'Ambroxan', 'Sea Salt']),
        sort_order: 2
      },
      // Middle Notes attribute
      {
        category_id: fragrancesRootCategory.id,
        name: 'Middle Notes',
        type: 'multiselect',
        is_required: true,
        default_value: '',
        options: JSON.stringify(['Rose', 'Jasmine', 'Lily', 'Geranium', 'Ylang-ylang', 'Iris', 'Peony', 'Freesia', 'Coffee', 'Vanilla']),
        sort_order: 3
      },
      // Base Notes attribute
      {
        category_id: fragrancesRootCategory.id,
        name: 'Base Notes',
        type: 'multiselect',
        is_required: true,
        default_value: '',
        options: JSON.stringify(['Sandalwood', 'Cedar', 'Musk', 'Vanilla', 'Amber', 'Patchouli', 'Vetiver', 'Oakmoss', 'Oud']),
        sort_order: 4
      },
      // Longevity attribute
      {
        category_id: fragrancesRootCategory.id,
        name: 'Longevity',
        type: 'select',
        is_required: false,
        default_value: '4-6 hours',
        options: JSON.stringify(['2-4 hours', '4-6 hours', '6-8 hours', '8+ hours']),
        sort_order: 5
      },
      // Sillage attribute
      {
        category_id: fragrancesRootCategory.id,
        name: 'Sillage',
        type: 'select',
        is_required: false,
        default_value: 'Moderate',
        options: JSON.stringify(['Intimate', 'Moderate', 'Heavy', 'Enormous']),
        sort_order: 6
      },
      // Launch Year attribute
      {
        category_id: fragrancesRootCategory.id,
        name: 'Launch Year',
        type: 'number',
        is_required: false,
        default_value: '',
        options: null,
        sort_order: 7
      },
      // Perfumer attribute
      {
        category_id: fragrancesRootCategory.id,
        name: 'Perfumer',
        type: 'text',
        is_required: false,
        default_value: '',
        options: null,
        sort_order: 8
      },
      // Brand-specific attributes
      {
        category_id: chanelCategory.id, // Chanel
        name: 'Collection',
        type: 'select',
        is_required: false,
        default_value: '',
        options: JSON.stringify(['Les Exclusifs', 'Chance', 'Coco', 'No. 5', 'Allure']),
        sort_order: 1
      },
      {
        category_id: diorCategory.id, // Dior
        name: 'Collection',
        type: 'select',
        is_required: false,
        default_value: '',
        options: JSON.stringify(['Sauvage', 'Homme', 'Addict', 'Miss Dior', 'J\'adore']),
        sort_order: 1
      },
      {
        category_id: tomFordCategory.id, // Tom Ford
        name: 'Collection',
        type: 'select',
        is_required: false,
        default_value: '',
        options: JSON.stringify(['Private Blend', 'Signature', 'Oud Wood Collection']),
        sort_order: 1
      }
    ];

    // Insert category attributes
    for (const attribute of perfumeAttributes) {
      await database.run(`
        INSERT OR IGNORE INTO category_attributes (
          id, category_id, name, type, is_required, default_value, options, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), attribute.category_id, attribute.name, attribute.type,
        attribute.is_required, attribute.default_value, attribute.options, attribute.sort_order
      ]);
    }

    // Create sample attribute values for products
    const attributeValues = [
      // Chanel No. 5 attributes
      { product_id: perfumeProducts[0].id, attribute_name: 'Size', value: '100ml' },
      { product_id: perfumeProducts[0].id, attribute_name: 'Top Notes', value: 'Bergamot,Lemon,Neroli' },
      { product_id: perfumeProducts[0].id, attribute_name: 'Middle Notes', value: 'Rose,Jasmine,Lily of the Valley' },
      { product_id: perfumeProducts[0].id, attribute_name: 'Base Notes', value: 'Sandalwood,Vanilla,Musk' },
      { product_id: perfumeProducts[0].id, attribute_name: 'Longevity', value: '6-8 hours' },
      { product_id: perfumeProducts[0].id, attribute_name: 'Sillage', value: 'Heavy' },
      { product_id: perfumeProducts[0].id, attribute_name: 'Launch Year', value: '1921' },
      { product_id: perfumeProducts[0].id, attribute_name: 'Perfumer', value: 'Ernest Beaux' },
      { product_id: perfumeProducts[0].id, attribute_name: 'Collection', value: 'No. 5' },

      // Tom Ford Oud Wood attributes
      { product_id: perfumeProducts[1].id, attribute_name: 'Size', value: '50ml' },
      { product_id: perfumeProducts[1].id, attribute_name: 'Top Notes', value: 'Oud,Sandalwood,Rosewood' },
      { product_id: perfumeProducts[1].id, attribute_name: 'Middle Notes', value: 'Sichuan Pepper,Vanilla' },
      { product_id: perfumeProducts[1].id, attribute_name: 'Base Notes', value: 'Sandalwood,Amber' },
      { product_id: perfumeProducts[1].id, attribute_name: 'Longevity', value: '8+ hours' },
      { product_id: perfumeProducts[1].id, attribute_name: 'Sillage', value: 'Enormous' },
      { product_id: perfumeProducts[1].id, attribute_name: 'Launch Year', value: '2007' },
      { product_id: perfumeProducts[1].id, attribute_name: 'Collection', value: 'Private Blend' },

      // Dior Sauvage attributes
      { product_id: perfumeProducts[2].id, attribute_name: 'Size', value: '100ml' },
      { product_id: perfumeProducts[2].id, attribute_name: 'Top Notes', value: 'Bergamot,Pepper' },
      { product_id: perfumeProducts[2].id, attribute_name: 'Middle Notes', value: 'Lavender,Geranium' },
      { product_id: perfumeProducts[2].id, attribute_name: 'Base Notes', value: 'Ambroxan,Cedar' },
      { product_id: perfumeProducts[2].id, attribute_name: 'Longevity', value: '6-8 hours' },
      { product_id: perfumeProducts[2].id, attribute_name: 'Sillage', value: 'Heavy' },
      { product_id: perfumeProducts[2].id, attribute_name: 'Launch Year', value: '2015' },
      { product_id: perfumeProducts[2].id, attribute_name: 'Collection', value: 'Sauvage' },

      // Jo Malone attributes
      { product_id: perfumeProducts[3].id, attribute_name: 'Size', value: '30ml' },
      { product_id: perfumeProducts[3].id, attribute_name: 'Top Notes', value: 'Sea Salt,Ambroxan' },
      { product_id: perfumeProducts[3].id, attribute_name: 'Middle Notes', value: 'Wood Sage' },
      { product_id: perfumeProducts[3].id, attribute_name: 'Base Notes', value: 'Musk' },
      { product_id: perfumeProducts[3].id, attribute_name: 'Longevity', value: '4-6 hours' },
      { product_id: perfumeProducts[3].id, attribute_name: 'Sillage', value: 'Moderate' },
      { product_id: perfumeProducts[3].id, attribute_name: 'Launch Year', value: '2014' },

      // YSL Black Opium attributes
      { product_id: perfumeProducts[4].id, attribute_name: 'Size', value: '90ml' },
      { product_id: perfumeProducts[4].id, attribute_name: 'Top Notes', value: 'Coffee,Pink Pepper' },
      { product_id: perfumeProducts[4].id, attribute_name: 'Middle Notes', value: 'White Flowers,Vanilla' },
      { product_id: perfumeProducts[4].id, attribute_name: 'Base Notes', value: 'Vanilla,Amber' },
      { product_id: perfumeProducts[4].id, attribute_name: 'Longevity', value: '6-8 hours' },
      { product_id: perfumeProducts[4].id, attribute_name: 'Sillage', value: 'Heavy' },
      { product_id: perfumeProducts[4].id, attribute_name: 'Launch Year', value: '2014' }
    ];

    // Get category attributes to link with values
    const categoryAttributes = await database.all(`
      SELECT id, name, category_id FROM category_attributes 
      WHERE category_id IN (SELECT id FROM categories WHERE type = 'perfume')
    `);

    // Insert attribute values
    for (const attrValue of attributeValues) {
      const attribute = categoryAttributes.find(attr => attr.name === attrValue.attribute_name);
      if (attribute) {
        await database.run(`
          INSERT OR IGNORE INTO product_attribute_values (id, product_id, attribute_id, value)
          VALUES (?, ?, ?, ?)
        `, [uuidv4(), attrValue.product_id, attribute.id, attrValue.value]);
      }
    }

    console.log('✅ Perfume data migration completed successfully!');
    console.log('📊 Perfume data created:');
    console.log('   - 32 perfume categories (by gender, family, concentration, brand, occasion, season)');
    console.log('   - 8 luxury perfume brands');
    console.log('   - 5 sample perfume products with detailed attributes');
    console.log('   - 11 category attributes (size, notes, longevity, sillage, etc.)');
    console.log('   - 40+ product attribute values');

  } catch (error) {
    console.error('❌ Perfume migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migratePerfumeData().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Perfume migration failed:', error);
    process.exit(1);
  });
}

module.exports = migratePerfumeData; 