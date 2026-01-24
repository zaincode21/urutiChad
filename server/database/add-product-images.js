const database = require('./database');

async function addProductImages() {
  try {
    console.log('🔄 Adding product images...');

    // Sample image URLs for different product types
    const sampleImages = [
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1592945403244-b3faa74b2c98?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1590736969955-71cc94901354?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1590736969955-71cc94901354?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop'
    ];

    // Get all products
    const products = await database.all('SELECT id, name, product_type FROM products WHERE is_active = 1');

    console.log(`Found ${products.length} products to update`);

    // Update each product with a sample image
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const imageUrl = sampleImages[i % sampleImages.length];
      
      // Update the product's image_url field
      await database.run(`
        UPDATE products 
        SET image_url = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [imageUrl, product.id]);

      // Also add to product_images table
      await database.run(`
        INSERT OR IGNORE INTO product_images (id, product_id, image_url, alt_text, is_primary, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        require('crypto').randomUUID(),
        product.id,
        imageUrl,
        product.name,
        1, // is_primary
        0  // sort_order
      ]);

      console.log(`✅ Added image to: ${product.name}`);
    }

    console.log('✅ Product images added successfully!');

  } catch (error) {
    console.error('❌ Failed to add product images:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  addProductImages().then(() => {
    console.log('🎉 Product images script completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = { addProductImages }; 