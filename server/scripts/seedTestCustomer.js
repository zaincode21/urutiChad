const database = require('../database/database');

async function seedTestCustomer() {
  try {
    console.log('🎂 Seeding test customer with today\'s birthday...');
    
    // Get today's date
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const birthday = `${today.getFullYear()}-${month}-${day}`;
    
    // Create test customer with today's birthday
    const testCustomer = {
      id: 'test-customer-birthday',
      first_name: 'Test',
      last_name: 'Birthday',
      email: 'test.birthday@example.com',
      phone: '+1234567890',
      address: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      country: 'Test Country',
      postal_code: '12345',
      loyalty_points: 100,
      loyalty_tier: 'silver',
      total_spent: 500.00,
      birthday: birthday,
      anniversary_date: null,
      is_active: 1
    };
    
    // Insert test customer
    await database.run(`
      INSERT OR REPLACE INTO customers (
        id, first_name, last_name, email, phone, address, city, state, 
        country, postal_code, loyalty_points, loyalty_tier, total_spent, 
        birthday, anniversary_date, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      testCustomer.id,
      testCustomer.first_name,
      testCustomer.last_name,
      testCustomer.email,
      testCustomer.phone,
      testCustomer.address,
      testCustomer.city,
      testCustomer.state,
      testCustomer.country,
      testCustomer.postal_code,
      testCustomer.loyalty_points,
      testCustomer.loyalty_tier,
      testCustomer.total_spent,
      testCustomer.birthday,
      testCustomer.anniversary_date,
      testCustomer.is_active
    ]);
    
    console.log(`✅ Test customer created successfully:`);
    console.log(`   - Name: ${testCustomer.first_name} ${testCustomer.last_name}`);
    console.log(`   - Email: ${testCustomer.email}`);
    console.log(`   - Birthday: ${testCustomer.birthday}`);
    console.log(`   - Loyalty Tier: ${testCustomer.loyalty_tier}`);
    
    // Also create a test customer with anniversary today
    const testAnniversaryCustomer = {
      id: 'test-customer-anniversary',
      first_name: 'Test',
      last_name: 'Anniversary',
      email: 'test.anniversary@example.com',
      phone: '+1234567891',
      address: '456 Anniversary Ave',
      city: 'Anniversary City',
      state: 'AN',
      country: 'Test Country',
      postal_code: '54321',
      loyalty_points: 200,
      loyalty_tier: 'gold',
      total_spent: 1000.00,
      birthday: null,
      anniversary_date: birthday,
      is_active: 1
    };
    
    // Insert anniversary test customer
    await database.run(`
      INSERT OR REPLACE INTO customers (
        id, first_name, last_name, email, phone, address, city, state, 
        country, postal_code, loyalty_points, loyalty_tier, total_spent, 
        birthday, anniversary_date, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      testAnniversaryCustomer.id,
      testAnniversaryCustomer.first_name,
      testAnniversaryCustomer.last_name,
      testAnniversaryCustomer.email,
      testAnniversaryCustomer.phone,
      testAnniversaryCustomer.address,
      testAnniversaryCustomer.city,
      testAnniversaryCustomer.state,
      testAnniversaryCustomer.country,
      testAnniversaryCustomer.postal_code,
      testAnniversaryCustomer.loyalty_points,
      testAnniversaryCustomer.loyalty_tier,
      testAnniversaryCustomer.total_spent,
      testAnniversaryCustomer.birthday,
      testAnniversaryCustomer.anniversary_date,
      testAnniversaryCustomer.is_active
    ]);
    
    console.log(`✅ Test anniversary customer created successfully:`);
    console.log(`   - Name: ${testAnniversaryCustomer.first_name} ${testAnniversaryCustomer.last_name}`);
    console.log(`   - Email: ${testAnniversaryCustomer.email}`);
    console.log(`   - Anniversary: ${testAnniversaryCustomer.anniversary_date}`);
    console.log(`   - Loyalty Tier: ${testAnniversaryCustomer.loyalty_tier}`);
    
    console.log('\n🎉 Test customers seeded successfully!');
    console.log('You can now test the birthday and anniversary email system.');
    
  } catch (error) {
    console.error('❌ Error seeding test customer:', error);
  } finally {
    await database.close();
  }
}

// Run the seed function
seedTestCustomer();
