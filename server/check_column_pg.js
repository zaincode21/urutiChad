require('dotenv').config();
const database = require('./database/database');

const checkColumn = async () => {
    try {
        console.log('Checking raw_materials table schema...');
        const result = await database.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'raw_materials' 
            AND column_name = 'selling_price';
        `);

        if (result.rows.length > 0) {
            console.log('✅ Column selling_price EXISTS in raw_materials table.');
            console.log('Type:', result.rows[0].data_type);
        } else {
            console.log('❌ Column selling_price DOES NOT EXIST in raw_materials table.');
        }
    } catch (error) {
        console.error('Error checking column:', error);
    } finally {
        // We can't easily close the pool singleton, so we rely on script termination or just hanging for a sec is fine for a one-off check
        // but database.close() exists in the file I viewed.
        if (database.close) {
            await database.close();
        }
    }
};

checkColumn();
