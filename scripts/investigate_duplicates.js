const database = require('../server/database/database');

async function investigate() {
    try {
        console.log('🔍 Investigating Duplicates...\n');

        const opiumIds = ['75c8f535-909f-4378-ae18-95c0a314123d', '48d388d0-10f5-445e-9f1c-e68d07752255'];
        const eauIds = ['16a2967f-5fab-4272-b99b-d5d6f856c00c', '38fa0a1a-520e-42f9-8cfc-a564a45e2289'];
        const bombshellIds = ['PERF-BOM-30ML', 'PERF-BOMBSHEL-30ML']; // These are SKUs

        console.log('--- Bulk Perfume: Opium ---');
        for (const id of opiumIds) {
            const p = await database.get('SELECT * FROM perfume_bulk WHERE id = $1', [id]);
            const bottlingCount = await database.get('SELECT COUNT(*) as c FROM perfume_bottling WHERE bulk_perfume_id = $1', [id]);
            console.log(`ID: ${id}`);
            console.log(`   Created: ${p.created_at}, Stock: ${p.bulk_quantity_ml}ML, Cost: ${p.cost_per_ml}`);
            console.log(`   Bottling Records: ${bottlingCount.c}`);
        }

        console.log('\n--- Bulk Perfume: Eau Capitale ---');
        for (const id of eauIds) {
            const p = await database.get('SELECT * FROM perfume_bulk WHERE id = $1', [id]);
            const bottlingCount = await database.get('SELECT COUNT(*) as c FROM perfume_bottling WHERE bulk_perfume_id = $1', [id]);
            console.log(`ID: ${id}`);
            console.log(`   Created: ${p.created_at}, Stock: ${p.bulk_quantity_ml}ML, Cost: ${p.cost_per_ml}`);
            console.log(`   Bottling Records: ${bottlingCount.c}`);
        }

        console.log('\n--- Product: Bombshell 30ml ---');
        for (const sku of bombshellIds) {
            const p = await database.get('SELECT * FROM products WHERE sku = $1', [sku]);
            if (p) {
                const orderCount = await database.get('SELECT COUNT(*) as c FROM order_items WHERE product_id = $1', [p.id]);
                const inventory = await database.get('SELECT SUM(quantity) as q FROM shop_inventory WHERE product_id = $1', [p.id]);
                console.log(`SKU: ${sku} (ID: ${p.id})`);
                console.log(`   Created: ${p.created_at}, Stock: ${p.stock_quantity}, Active: ${p.is_active}`);
                console.log(`   Sales: ${orderCount.c}, Shop Inventory: ${inventory.q || 0}`);
            } else {
                console.log(`SKU: ${sku} - Not Found`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

// Allow DB init
setTimeout(investigate, 2000);
