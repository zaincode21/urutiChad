const database = require('../server/database/database');

async function checkDuplicates() {
    try {
        console.log('🔍 Checking for duplicates...\n');

        // 1. Check for duplicates in perfume_bulk (by name)
        console.log('--- Analyzing perfume_bulk ---');
        const bulkDuplicates = await database.all(`
      SELECT name, COUNT(*) as count, STRING_AGG(id::text, ', ') as ids
      FROM perfume_bulk 
      WHERE is_active = true
      GROUP BY name 
      HAVING COUNT(*) > 1
    `);

        if (bulkDuplicates.length > 0) {
            console.log('⚠️  Found Duplicate Bulk Perfumes:');
            bulkDuplicates.forEach(d => {
                console.log(`- Name: "${d.name}" | Count: ${d.count} | IDs: ${d.ids}`);
            });
        } else {
            console.log('✅ No duplicate bulk perfumes found.');
        }

        // 2. Check for duplicates in products (by SKU)
        console.log('\n--- Analyzing products (by SKU) ---');
        const skuDuplicates = await database.all(`
      SELECT sku, COUNT(*) as count, STRING_AGG(id::text, ', ') as ids, STRING_AGG(name, ', ') as names
      FROM products 
      WHERE is_active = true
      GROUP BY sku 
      HAVING COUNT(*) > 1
    `);

        if (skuDuplicates.length > 0) {
            console.log('⚠️  Found Duplicate Products by SKU:');
            skuDuplicates.forEach(d => {
                console.log(`- SKU: ${d.sku} | Count: ${d.count} | Names: ${d.names}`);
            });
        } else {
            console.log('✅ No duplicate products by SKU found.');
        }

        // 3. Check for potential duplicates in products (by Name and Size)
        // This catches same product created multiple times with different SKUs
        console.log('\n--- Analyzing products (by Name & Size) ---');
        const nameDuplicates = await database.all(`
      SELECT name, size, COUNT(*) as count, STRING_AGG(sku, ', ') as skus
      FROM products 
      WHERE is_active = true
      GROUP BY name, size 
      HAVING COUNT(*) > 1
    `);

        if (nameDuplicates.length > 0) {
            console.log('⚠️  Found Potential Duplicate Products (Same Name & Size):');
            nameDuplicates.forEach(d => {
                console.log(`- Name: "${d.name}", Size: ${d.size} | Count: ${d.count} | SKUs: ${d.skus}`);
            });
        } else {
            console.log('✅ No duplicate products by Name & Size found.');
        }

        console.log('\n🏁 Check complete.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking duplicates:', error);
        process.exit(1);
    }
}

// Give the database connection a moment to initialize
setTimeout(checkDuplicates, 1000);
