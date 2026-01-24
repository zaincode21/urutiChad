const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import the app
const app = require('../../server/index');

describe('Authentication API Integration Tests', () => {
  let testUser, authToken;

  beforeAll(async () => {
    // Create a test user
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    testUser = {
      id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'admin'
    };
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', 'admin');
      expect(response.body.user).toHaveProperty('role');
    });

    it('should return 401 with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken;

    beforeEach(async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      
      authToken = loginResponse.body.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username');
      expect(response.body.user).toHaveProperty('role');
    });

    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/auth/profile')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    let authToken;

    beforeEach(async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      
      authToken = loginResponse.body.token;
    });

    it('should access products endpoint with valid token', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('products');
    });

    it('should access customers endpoint with valid token', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('customers');
    });

    it('should access orders endpoint with valid token', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('orders');
    });

    it('should return 401 for protected routes without token', async () => {
      await request(app)
        .get('/api/products')
        .expect(401);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
    });
  });
});
