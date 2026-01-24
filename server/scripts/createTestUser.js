const database = require('../database/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function createTestUser() {
  try {
    console.log('👤 Creating test user...');
    
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const testUser = {
      id: userId,
      username: 'admin',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'admin',
      first_name: 'Test',
      last_name: 'Admin',
      phone: '+1234567890',
      shop_id: null,
      is_active: 1
    };
    
    // Insert test user
    await database.run(`
      INSERT OR REPLACE INTO users (
        id, username, email, password, role, first_name, last_name, 
        phone, shop_id, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      testUser.id,
      testUser.username,
      testUser.email,
      testUser.password,
      testUser.role,
      testUser.first_name,
      testUser.last_name,
      testUser.phone,
      testUser.shop_id,
      testUser.is_active
    ]);
    
    console.log(`✅ Test user created successfully:`);
    console.log(`   - Username: ${testUser.username}`);
    console.log(`   - Email: ${testUser.email}`);
    console.log(`   - Password: admin123`);
    console.log(`   - Role: ${testUser.role}`);
    console.log(`   - ID: ${testUser.id}`);
    
    // Also create a regular user for testing
    const regularUserId = uuidv4();
    const regularUserHashedPassword = await bcrypt.hash('user123', 10);
    
    const regularUser = {
      id: regularUserId,
      username: 'user',
      email: 'user@test.com',
      password: regularUserHashedPassword,
      role: 'cashier',
      first_name: 'Test',
      last_name: 'User',
      phone: '+1234567891',
      shop_id: null,
      is_active: 1
    };
    
    // Insert regular test user
    await database.run(`
      INSERT OR REPLACE INTO users (
        id, username, email, password, role, first_name, last_name, 
        phone, shop_id, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      regularUser.id,
      regularUser.username,
      regularUser.email,
      regularUser.password,
      regularUser.role,
      regularUser.first_name,
      regularUser.last_name,
      regularUser.phone,
      regularUser.shop_id,
      regularUser.is_active
    ]);
    
    console.log(`✅ Regular test user created successfully:`);
    console.log(`   - Username: ${regularUser.username}`);
    console.log(`   - Email: ${regularUser.email}`);
    console.log(`   - Password: user123`);
    console.log(`   - Role: ${regularUser.role}`);
    console.log(`   - ID: ${regularUser.id}`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('Admin: admin / admin123');
    console.log('User: user / user123');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    process.exit(0);
  }
}

createTestUser();


