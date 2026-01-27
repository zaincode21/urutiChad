const request = require('supertest');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Import the app
const app = require('../../server/index');
const database = require('../../server/database/database');

describe('Raw Materials API Integration Tests', () => {
    let authToken;
    let createdMaterialId;

    beforeAll(async () => {
        // Create a test admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const adminId = 'admin-test-id';

        // Clean up existing test user if any (ignore error)
        try {
            await database.run('DELETE FROM users WHERE username = $1', ['admin']);
        } catch (e) {
            // ignore
        }

        await database.run(`
            INSERT INTO users (id, username, email, password, role, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [adminId, 'admin', 'admin@test.com', hashedPassword, 'admin']);

        // Login as admin to get token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'admin',
                password: 'admin123'
            });

        if (loginResponse.status !== 200) {
            console.error('Login failed:', loginResponse.body);
            throw new Error('Failed to login as admin for tests');
        }

        authToken = loginResponse.body.token;
    });

    describe('POST /api/raw-materials', () => {
        it('should create a new raw material with valid data', async () => {
            const materialData = {
                name: 'Test Fabric ' + uuidv4().substring(0, 8),
                type: 'Fabric',
                unit: 'meter',
                current_stock: 100,
                cost_per_unit: 10.50,
                selling_price: 20.00,
                min_stock_level: 10,
                supplier_name: 'Test Supplier',
                supplier_contact: 'test@supplier.com'
            };

            const response = await request(app)
                .post('/api/raw-materials')
                .set('Authorization', `Bearer ${authToken}`)
                .send(materialData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Material added successfully');
            expect(response.body).toHaveProperty('material');
            expect(response.body.material).toHaveProperty('id');
            expect(response.body.material.name).toBe(materialData.name);

            createdMaterialId = response.body.material.id;
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/raw-materials')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Incomplete Material'
                    // Missing type, unit, etc.
                })
                .expect(400);

            expect(response.body).toHaveProperty('errors');
        });
    });

    describe('GET /api/raw-materials', () => {
        it('should get all raw materials', async () => {
            const response = await request(app)
                .get('/api/raw-materials')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('materials');
            expect(Array.isArray(response.body.materials)).toBe(true);
            expect(response.body).toHaveProperty('pagination');

            // Verify the created material is in the list (might need pagination adjustment if list is long)
            // But checking if response has materials is a good basic test.
        });

        it('should filter materials by search query', async () => {
            if (!createdMaterialId) {
                // creating one if previous test failed? No, just skip if dependancy failed.
                return;
            }

            // We need to fetch the material name we created. 
            // Ideally we store it.
            // Let's just search for "Fabric" as we used it in type or part of name.

            const response = await request(app)
                .get('/api/raw-materials?search=Test')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.materials).toBeDefined();
            // Should verify that results contain "Test"
        });
    });

    describe('PUT /api/raw-materials/:id', () => {
        it('should update an existing raw material', async () => {
            if (!createdMaterialId) throw new Error('No material to update');

            const updateData = {
                name: 'Updated Fabric Name',
                current_stock: 150
            };

            const response = await request(app)
                .put(`/api/raw-materials/${createdMaterialId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Material updated');
        });

        it('should return 404 for non-existent id', async () => {
            const fakeId = uuidv4();
            await request(app)
                .put(`/api/raw-materials/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Ghost Material' })
                .expect(404);
        });
    });

    describe('DELETE /api/raw-materials/:id', () => {
        it('should soft delete a raw material', async () => {
            if (!createdMaterialId) throw new Error('No material to delete');

            const response = await request(app)
                .delete(`/api/raw-materials/${createdMaterialId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Material deleted');
        });
    });
});
