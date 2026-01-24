const database = require('../server/database/database');

async function cleanup() {
    const transaction = await database.pool.connect();
    try {
        console.log('🧹 Starting Duplicate Cleanup...\n');
        await transaction.query('BEGIN');

        // 1. Opium
        // Target (Keep): 75c8f535... (Older)
        // Source (Delete): 48d388d0... (Newer)
        const opiumKeep = '75c8f535-909f-4378-ae18-95c0a314123d';
        const opiumDelete = '48d388d0-10f5-445e-9f1c-e68d07752255';

        const opiumSource = await database.get('SELECT bulk_quantity_ml FROM perfume_bulk WHERE id = $1', [opiumDelete]);
        console.log(`Merging Opium: Adding ${opiumSource.bulk_quantity_ml}ML to main record...`);

        // Add stock to target
        await transaction.query('UPDATE perfume_bulk SET bulk_quantity_ml = bulk_quantity_ml + $1 WHERE id = $2', [opiumSource.bulk_quantity_ml, opiumKeep]);
        // Move history
        await transaction.query('UPDATE perfume_bottling SET bulk_perfume_id = $1 WHERE bulk_perfume_id = $2', [opiumKeep, opiumDelete]);
        // Delete source
        await transaction.query('DELETE FROM perfume_bulk WHERE id = $1', [opiumDelete]);
        console.log('✅ Opium merged and duplicate deleted.');


        // 2. Eau Capitale
        // Target (Keep): 38fa0a1a... (Older, has 6800ml)
        // Source (Delete): 16a2967f... (Newer, has 694ml)
        const eauKeep = '38fa0a1a-520e-42f9-8cfc-a564a45e2289';
        const eauDelete = '16a2967f-5fab-4272-b99b-d5d6f856c00c';

        const eauSource = await database.get('SELECT bulk_quantity_ml FROM perfume_bulk WHERE id = $1', [eauDelete]);
        console.log(`Merging Eau Capitale: Adding ${eauSource.bulk_quantity_ml}ML to main record...`);

        // Add stock
        await transaction.query('UPDATE perfume_bulk SET bulk_quantity_ml = bulk_quantity_ml + $1 WHERE id = $2', [eauSource.bulk_quantity_ml, eauKeep]);
        // Move history
        await transaction.query('UPDATE perfume_bottling SET bulk_perfume_id = $1 WHERE bulk_perfume_id = $2', [eauKeep, eauDelete]);
        // Delete source
        await transaction.query('DELETE FROM perfume_bulk WHERE id = $1', [eauDelete]);
        console.log('✅ Eau Capitale merged and duplicate deleted.');


        // 3. Bombshell
        // Keep: PERF-BOM-30ML (Standard SKU)
        // Delete: PERF-BOMBSHEL-30ML (Weird SKU)
        const bombDeleteSku = 'PERF-BOMBSHEL-30ML';
        console.log(`Removing duplicate product SKU: ${bombDeleteSku}`);

        // Check if it has any lingering links just in case (though investigation said 0)
        await transaction.query('DELETE FROM shop_inventory WHERE product_id IN (SELECT id FROM products WHERE sku = $1)', [bombDeleteSku]);
        await transaction.query('DELETE FROM product_categories WHERE product_id IN (SELECT id FROM products WHERE sku = $1)', [bombDeleteSku]);
        await transaction.query('DELETE FROM product_attribute_values WHERE product_id IN (SELECT id FROM products WHERE sku = $1)', [bombDeleteSku]);
        await transaction.query('DELETE FROM products WHERE sku = $1', [bombDeleteSku]);
        console.log('✅ Duplicate Bombshell product deleted.');

        await transaction.query('COMMIT');
        console.log('\n✨ Cleanup successfully completed.');
        process.exit(0);

    } catch (error) {
        await transaction.query('ROLLBACK');
        console.error('❌ Error during cleanup (Rolled back):', error);
        process.exit(1);
    } finally {
        transaction.release();
    }
}

// Allow DB init
setTimeout(cleanup, 2000);
