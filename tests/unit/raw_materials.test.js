const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Mock middlewares
jest.mock('../../server/middleware/auth', () => ({
    auth: (req, res, next) => { req.user = { id: 'test-user' }; next(); },
    managerAuth: (req, res, next) => { req.user = { id: 'test-manager', role: 'manager' }; next(); }
}));

// Mock database
const mockDatabase = {
    all: jest.fn(),
    get: jest.fn(),
    run: jest.fn()
};
jest.mock('../../server/database/database', () => mockDatabase);

// Import the route - we need to mount it on an app because we mocked the DB it uses
const rawMaterialsRouter = require('../../server/routes/raw_materials');

const app = express();
app.use(express.json());
app.use('/api/raw-materials', rawMaterialsRouter);

describe('Raw Materials API Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/raw-materials', () => {
        it('should return a list of materials with pagination', async () => {
            const mockMaterials = [
                { id: '1', name: 'Fabric A', type: 'Fabric' },
                { id: '2', name: 'Button B', type: 'Accessories' }
            ];

            mockDatabase.all.mockResolvedValue(mockMaterials);
            mockDatabase.get.mockResolvedValue({ total: 2 });

            const response = await request(app)
                .get('/api/raw-materials')
                .expect(200);

            expect(response.body.materials).toHaveLength(2);
            expect(response.body.materials[0].name).toBe('Fabric A');
            expect(response.body.pagination.total).toBe(2);
            expect(mockDatabase.all).toHaveBeenCalled();
        });

        it('should handle search filters', async () => {
            mockDatabase.all.mockResolvedValue([]);
            mockDatabase.get.mockResolvedValue({ total: 0 });

            await request(app)
                .get('/api/raw-materials?search=Silk')
                .expect(200);

            // Verify query construction in the mock call
            const callArgs = mockDatabase.all.mock.calls[0];
            const query = callArgs[0];
            const params = callArgs[1];
            expect(query).toContain('ILIKE');
            expect(params).toContain('%Silk%');
        });
    });

    describe('POST /api/raw-materials', () => {
        it('should create a new material', async () => {
            const newMaterial = {
                name: 'New Fabric',
                type: 'Fabric',
                unit: 'm',
                current_stock: 50,
                cost_per_unit: 5,
                selling_price: 10
            };

            mockDatabase.run.mockResolvedValue({ lastID: 'new-id', changes: 1 });

            const response = await request(app)
                .post('/api/raw-materials')
                .send(newMaterial)
                .expect(201);

            expect(response.body.message).toBe('Material added successfully');
            expect(mockDatabase.run).toHaveBeenCalledTimes(2); // One for raw_materials, one for products
        });

        it('should validate required fields', async () => {
            await request(app)
                .post('/api/raw-materials')
                .send({ name: 'Incomplete' }) // Missing type, unit etc
                .expect(400);

            expect(mockDatabase.run).not.toHaveBeenCalled();
        });
    });

    describe('PUT /api/raw-materials/:id', () => {
        it('should update a material', async () => {
            mockDatabase.get.mockResolvedValue({ id: 'mat-1', name: 'Old Name' });
            mockDatabase.run.mockResolvedValue({ changes: 1 });

            const response = await request(app)
                .put('/api/raw-materials/mat-1')
                .send({ name: 'Updated Name', current_stock: 60 })
                .expect(200);

            expect(response.body.message).toBe('Material updated');
            expect(mockDatabase.run).toHaveBeenCalled();
        });

        it('should return 404 if material not found', async () => {
            mockDatabase.get.mockResolvedValue(null);

            await request(app)
                .put('/api/raw-materials/non-existent')
                .send({ name: 'Update' })
                .expect(404);
        });
    });

    describe('DELETE /api/raw-materials/:id', () => {
        it('should soft delete a material', async () => {
            mockDatabase.run.mockResolvedValue({ changes: 1 });

            const response = await request(app)
                .delete('/api/raw-materials/mat-1')
                .expect(200);

            expect(response.body.message).toBe('Material deleted');
            expect(mockDatabase.run).toHaveBeenCalledTimes(2); // One for raw_materials, one for products
        });
    });
});
