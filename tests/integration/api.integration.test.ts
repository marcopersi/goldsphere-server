import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';

let app: any;

beforeAll(async () => {
  // Setup fresh test database BEFORE importing app
  await setupTestDatabase();
  
  // Import app AFTER database setup to ensure pool replacement takes effect  
  app = (await import('../../src/app')).default;
});

afterAll(async () => {
  // Clean up test database
  await teardownTestDatabase();
});

describe('API Documentation Endpoints', () => {

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await 
      request(app as any)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /info', () => {
    it('should return API information', async () => {
      const response = await 
      request(app as any)
        .get('/info')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'GoldSphere API');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('documentation');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('GET /api-spec', () => {
    it('should return OpenAPI specification', async () => {
      const response = await 
      request(app as any)
        .get('/api-spec')
        .expect(200);

      expect(response.body).toHaveProperty('openapi', '3.0.0');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('servers');
      expect(response.body).toHaveProperty('components');
      expect(response.body.info).toHaveProperty('title', 'GoldSphere API');
      expect(response.body.info).toHaveProperty('version', '1.0.0');
    });
  });

  describe('GET /docs', () => {
    it('should serve Swagger UI HTML', async () => {
      const response = await 
      request(app as any)
        .get('/docs');

      // Accept both 200 (direct access) and 301 (redirect to /docs/)
      expect([200, 301]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.text).toContain('swagger-ui');
        expect(response.header['content-type']).toMatch(/text\/html/);
      }
    });
  });

  describe('GET /api-spec.yaml', () => {
    it('should return OpenAPI specification in YAML format', async () => {
      const response = await 
      request(app as any)
        .get('/api-spec.yaml')
        .expect(200);

      expect(response.header['content-type']).toMatch(/application\/x-yaml/);
      expect(response.text).toContain('openapi: 3.0.0');
      expect(response.text).toContain('title: GoldSphere API');
    });
  });
});

  describe('CORS Configuration', () => {
    it('should handle preflight OPTIONS request', async () => {
      // @ts-ignore - app is initialized in beforeAll
      await 
      request(app as any)
        .options('/health')
        .set('Origin', 'http://localhost:3333')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);
    });

    it('should allow requests from allowed origins', async () => {
      // @ts-ignore - app is initialized in beforeAll
      const response = await request(app as any)
        .get('/health')
        .set('Origin', 'http://localhost:3333')
        .expect(200);

      expect(response.header['access-control-allow-origin']).toBe('http://localhost:3333');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      // @ts-ignore - app is initialized in beforeAll  
      await request(app as any)
        .get('/health')
        .expect(200);
    });  // Note: This test might be flaky in CI environments
  it('should handle rate limiting gracefully', async () => {
    // Make a bunch of requests to potentially trigger rate limiting
    const requests = Array(10).fill(null).map(() => 
      
      request(app as any).get('/health')
    );

    const responses = await Promise.all(requests);
    
    // All should either succeed (200) or be rate limited (429)
    responses.forEach(response => {
      expect([200, 429]).toContain(response.status);
    });
  });
});

describe('Error Handling', () => {
  it('should return 404 for non-existent routes', async () => {
    const response = await 
      request(app as any)
      .get('/non-existent-route')
      .expect(404);

    expect(response.body).toHaveProperty('error', 'Route not found');
    expect(response.body).toHaveProperty('details');
    expect(response.body).toHaveProperty('availableEndpoints');
  });

  it('should handle malformed JSON gracefully', async () => {
    await 
      request(app as any)
      .post('/api/products/validate')
      .set('Content-Type', 'application/json')
      .send('{"invalid": json}')
      .expect(400);

    // Express should handle malformed JSON automatically
  });
});

describe('Security Headers', () => {
  it('should include security headers', async () => {
    const response = await 
      request(app as any)
      .get('/health')
      .expect(200);

    // Check for helmet security headers
    expect(response.header).toHaveProperty('x-dns-prefetch-control');
    expect(response.header).toHaveProperty('x-frame-options');
    expect(response.header).toHaveProperty('x-download-options');
    expect(response.header).toHaveProperty('x-content-type-options');
  });
});
