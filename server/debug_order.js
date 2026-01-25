const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const database = require('./database/database');

const fs = require('fs');

function log(message) {
    console.log(message);
    fs.appendFileSync('debug_output.txt', (typeof message === 'object' ? JSON.stringify(message, null, 2) : message) + '\n');
}

async function debugOrder(orderNumber) {
    try {
        // Clear previous output
        fs.writeFileSync('debug_output.txt', '');

        log(`Searching for order: ${orderNumber}`);
        const order = await database.get('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);

        if (!order) {
            log('Order not found!');
            return;
        }

        log('Order found:');
        log({
            id: order.id,
            customer_id: order.customer_id,
            created_at: order.created_at
        });

        if (order.customer_id) {
            const customer = await database.get('SELECT id, first_name, last_name, measurements FROM customers WHERE id = $1', [order.customer_id]);
            log('Customer Details:');
            log(customer);
            if (customer && customer.measurements) {
                log('Measurements found:');
                log(customer.measurements);
            } else {
                log('❌ No measurements found for this customer.');
            }
        } else {
            log('❌ No customer linked to this order.');
        }

    } catch (error) {
        log('Debug failed: ' + error);
    }
}

// Get order number from args or use the one provided by user
const orderNum = process.argv[2] || 'ORD-1769352520952';
debugOrder(orderNum);
