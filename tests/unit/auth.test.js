const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth, adminAuth } = require('../../server/middleware/auth');

// Mock database
const mockDb = {
  get: jest.fn(),
  all: jest.fn(),
  run: jest.fn()
};

jest.mock('../../server/database/database', () => mockDb);

describe('Authentication Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('auth middleware', () => {
    it('should return 401 if no token provided', () => {
      auth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied. No token provided.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if invalid token format', () => {
      mockReq.headers.authorization = 'InvalidToken';

      auth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied. Invalid token format.'
      });
    });

    it('should return 401 if token verification fails', () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      auth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token.'
      });
    });

    it('should set user and call next if valid token', () => {
      const testUser = { id: 'test-id', username: 'testuser', role: 'admin' };
      const token = testUtils.generateTestToken(testUser);
      mockReq.headers.authorization = `Bearer ${token}`;

      auth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe(testUser.id);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('adminAuth middleware', () => {
    it('should return 403 if user is not admin', () => {
      mockReq.user = { role: 'cashier' };

      adminAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied. Admin privileges required.'
      });
    });

    it('should call next if user is admin', () => {
      mockReq.user = { role: 'admin' };

      adminAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('Password Hashing', () => {
  it('should hash password correctly', async () => {
    const password = 'testpassword123';
    const hashedPassword = await bcrypt.hash(password, 10);

    expect(hashedPassword).not.toBe(password);
    expect(hashedPassword).toHaveLength(60);
  });

  it('should verify password correctly', async () => {
    const password = 'testpassword123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const isValid = await bcrypt.compare(password, hashedPassword);
    expect(isValid).toBe(true);
  });
});

describe('JWT Token', () => {
  it('should generate valid token', () => {
    const payload = { id: 'test-id', role: 'admin' };
    const token = testUtils.generateTestToken(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  it('should verify token correctly', () => {
    const payload = { id: 'test-id', role: 'admin' };
    const token = testUtils.generateTestToken(payload);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.role).toBe(payload.role);
  });
});
