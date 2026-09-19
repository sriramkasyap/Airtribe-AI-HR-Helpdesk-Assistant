testEnvironment: node;
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));
jest.mock('jose', () => ({
  __esModule: true,
  jwtVerify: jest.fn(),
  SignJWT: jest.fn().mockReturnValue({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-token'),
  }),
}));
jest.mock('mongoose', () => ({
  __esModule: true,
  connect: jest.fn(),
  disconnect: jest.fn(),
  connection: {
    on: jest.fn(),
    once: jest.fn(),
    emitter: { on: jest.fn() },
  },
}));
