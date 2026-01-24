const database = require('../server/database/database');

async function deleteOutOfStockProducts() {
    try {
        console.log('🔍 Finding out-of-stock products...\n');

        // 1. Find all products with 0 stock
        const outOfStockProducts = await database.all(`
      SELECT p.id, p.name, p.sku, p.stock_quantity, p.current_stock, p.product_type,
             COUNT(oi.id) as order_count
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      WHERE p.stock_quantity = 0 
        AND p.current_stock = 0
        AND p.is_active = true
      GROUP BY p.id, p.name, p.sku, p.stock_quantity, p.current_stock, p.product_type
    `);

        if (outOfStockProducts.length === 0) {
            console.log('✅ No out-of-stock products found.');
            process.exit(0);
        }

        console.log(`Found ${outOfStockProducts.length} out-of-stock products:\n`);

        // Categorize products
        const withSales = outOfStockProducts.filter(p => p.order_count > 0);
        const withoutSales = outOfStockProducts.filter(p => p.order_count === 0);

        console.log('📊 Summary:');
        console.log(`   - Products with sales history: ${withSales.length} (will be SOFT deleted)`);
        console.log(`   - Products without sales: ${withoutSales.length} (will be HARD deleted)\n`);

        // Show some examples
        if (withSales.length > 0) {
            console.log('🛒 Products with sales (first 5):');
            withSales.slice(0, 5).forEach(p => {
                console.log(`   - ${p.name} (${p.sku}) - ${p.order_count} orders`);
            });
            console.log('');
        }

        if (withoutSales.length > 0) {
            console.log('🗑️  Products without sales (first 5):');
            withoutSales.slice(0, 5).forEach(p => {
                console.log(`   - ${p.name} (${p.sku})`);
            });
            console.log('');
        }

        // Confirm deletion
        console.log('⚠️  This will:');
        console.log(`   1. SOFT delete ${withSales.length} products (set is_active = false)`);
        console.log(`   2. HARD delete ${withoutSales.length} products (remove from database)`);
        console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

        await new Promise(resolve => setTimeout(resolve, 5000));

        const transaction = await database.pool.connect();
        await transaction.query('BEGIN');

        try {
            let softDeleted = 0;
            let hardDeleted = 0;

            // Soft delete products with sales
            for (const product of withSales) {
                await transaction.query(`
          UPDATE products 
          SET is_active = false, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $1
        `, [product.id]);
                softDeleted++;
            }

            // Hard delete products without sales
            for (const product of withoutSales) {
                // Delete from shop_inventory first
                await transaction.query('DELETE FROM shop_inventory WHERE product_id = $1', [product.id]);
                // Delete from product_categories
                await transaction.query('DELETE FROM product_categories WHERE product_id = $1', [product.id]);
                // Delete from product_attribute_values
                await transaction.query('DELETE FROM product_attribute_values WHERE product_id = $1', [product.id]);
                // Delete the product
                await transaction.query('DELETE FROM products WHERE id = $1', [product.id]);
                hardDeleted++;
            }

            await transaction.query('COMMIT');

            console.log('✅ Deletion completed:');
            console.log(`   - Soft deleted: ${softDeleted} products`);
            console.log(`   - Hard deleted: ${hardDeleted} products`);

            process.exit(0);

        } catch (error) {
            await transaction.query('ROLLBACK');
            throw error;
        } finally {
            transaction.release();
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Give DB time to initialize
setTimeout(deleteOutOfStockProducts, 2000);
