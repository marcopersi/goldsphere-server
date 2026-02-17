import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from '../integration/db-setup';

/**
 * Contract tests to ensure critical endpoints exist and respond.
 * These are lightweight checks that run before each commit.
 */

describe('Endpoint contracts', () => {
  let app: any;
  let token: string;

  const isIsoTimestamp = (value: unknown): boolean => {
    return typeof value === 'string' && value.includes('T') && !Number.isNaN(Date.parse(value));
  };

  const assertPortfolioContract = (portfolio: any): void => {
    expect(portfolio).toHaveProperty('id');
    expect(portfolio).toHaveProperty('ownerId');
    expect(portfolio).toHaveProperty('portfolioName');
    expect(portfolio).toHaveProperty('isActive');
    expect(portfolio).toHaveProperty('totalValue');
    expect(portfolio).toHaveProperty('totalCost');
    expect(portfolio).toHaveProperty('totalGainLoss');
    expect(portfolio).toHaveProperty('totalGainLossPercentage');
    expect(portfolio).toHaveProperty('positionCount');
    expect(portfolio).toHaveProperty('createdAt');
    expect(portfolio).toHaveProperty('updatedAt');
    expect(portfolio).toHaveProperty('lastUpdated');

    expect(typeof portfolio.totalValue).toBe('number');
    expect(typeof portfolio.totalCost).toBe('number');
    expect(typeof portfolio.totalGainLoss).toBe('number');
    expect(typeof portfolio.totalGainLossPercentage).toBe('number');
    expect(typeof portfolio.positionCount).toBe('number');

    expect(isIsoTimestamp(portfolio.createdAt)).toBe(true);
    expect(isIsoTimestamp(portfolio.updatedAt)).toBe(true);
    expect(isIsoTimestamp(portfolio.lastUpdated)).toBe(true);
  };

  const assertOrderItemContract = (item: any): void => {
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('productId');
    expect(item).toHaveProperty('productName');
    expect(item).toHaveProperty('quantity');
    expect(item).toHaveProperty('unitPrice');
    expect(item).toHaveProperty('totalPrice');
  };

  const assertOrderContract = (order: any): void => {
    expect(order).toHaveProperty('id');
    expect(order).toHaveProperty('userId');
    expect(order).toHaveProperty('type');
    expect(order).toHaveProperty('status');
    expect(order).toHaveProperty('orderNumber');
    expect(order).toHaveProperty('currency');
    expect(order).toHaveProperty('subtotal');
    expect(order).toHaveProperty('taxes');
    expect(order).toHaveProperty('totalAmount');
    expect(order).toHaveProperty('createdAt');
    expect(order).toHaveProperty('updatedAt');
    expect(Array.isArray(order.items)).toBe(true);

    if (order.items.length > 0) {
      assertOrderItemContract(order.items[0]);
    }
  };

  const assertDetailedOrderContract = (order: any): void => {
    expect(order).toHaveProperty('id');
    expect(order).toHaveProperty('userId');
    expect(order).toHaveProperty('type');
    expect(order).toHaveProperty('status');
    expect(order).toHaveProperty('paymentStatus');
    expect(order).toHaveProperty('items');
    expect(order).toHaveProperty('subtotal');
    expect(order).toHaveProperty('totalAmount');
    expect(order).toHaveProperty('user');
    expect(order).toHaveProperty('createdAt');
    expect(order).toHaveProperty('updatedAt');
    expect(Array.isArray(order.items)).toBe(true);
    expect(isIsoTimestamp(order.createdAt)).toBe(true);
    expect(isIsoTimestamp(order.updatedAt)).toBe(true);

    if (order.items.length > 0) {
      assertOrderItemContract(order.items[0]);
    }
  };

  const assertTransactionContract = (transaction: any): void => {
    expect(transaction).toHaveProperty('id');
    expect(transaction).toHaveProperty('positionId');
    expect(transaction).toHaveProperty('userId');
    expect(transaction).toHaveProperty('type');
    expect(transaction).toHaveProperty('date');
    expect(transaction).toHaveProperty('quantity');
    expect(transaction).toHaveProperty('price');
    expect(transaction).toHaveProperty('fees');
    expect(transaction).toHaveProperty('createdAt');
    expect(transaction).toHaveProperty('total');

    expect(isIsoTimestamp(transaction.date)).toBe(true);
    expect(isIsoTimestamp(transaction.createdAt)).toBe(true);
  };

  const assertUserContract = (user: any): void => {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('role');
  };

  const assertCustodyServiceContract = (service: any): void => {
    expect(service).toHaveProperty('id');
    expect(service).toHaveProperty('custodyServiceName');
    expect(service).toHaveProperty('custodianId');
    expect(service).toHaveProperty('custodianName');
    expect(service).toHaveProperty('fee');
    expect(service).toHaveProperty('paymentFrequency');
    expect(service).toHaveProperty('currency');
    expect(service).toHaveProperty('createdAt');
    expect(service).toHaveProperty('updatedAt');
    expect(isIsoTimestamp(service.createdAt)).toBe(true);
    expect(isIsoTimestamp(service.updatedAt)).toBe(true);
  };

  const assertCustodianContract = (custodian: any): void => {
    expect(custodian).toHaveProperty('id');
    expect(custodian).toHaveProperty('name');
    expect(custodian).toHaveProperty('createdAt');
    expect(custodian).toHaveProperty('updatedAt');
    expect(isIsoTimestamp(custodian.createdAt)).toBe(true);
    expect(isIsoTimestamp(custodian.updatedAt)).toBe(true);
  };

  beforeAll(async () => {
    // Setup fresh test database BEFORE importing app
    await setupTestDatabase();
    
    // Import app AFTER database setup to ensure pool replacement takes effect  
    app = (await import('../../src/app')).default;

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bank.technical@goldsphere.vault', password: 'GoldspherePassword' })
      .expect(200);
    token = res.body.data.accessToken;
  }, 30000);

  afterAll(async () => {
    // Clean up test database
    await teardownTestDatabase();
  });

  it('GET /api/portfolios/my returns current user portfolio with positions', async () => {
    const res = await request(app)
      .get('/api/portfolios/my')
      .set('Authorization', `Bearer ${token}`);

    if (res.status !== 200) {
      console.error('Error response:', res.status, res.body);
    }
    
    expect(res.status).toBe(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    const data = res.body.data;
    expect(Array.isArray(data)).toBe(true);
    
    // Contract test should be flexible - portfolios might be empty for test users
    if (data.length > 0) {
      const portfolio = data[0];
      assertPortfolioContract(portfolio);
      expect(Array.isArray(portfolio.positions)).toBe(true);
    }
  }, 30000);

  it('GET /api/portfolios returns strict portfolio list contract', async () => {
    const res = await request(app)
      .get('/api/portfolios?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data.portfolios)).toBe(true);
    expect(res.body.data).toHaveProperty('pagination');
    expect(res.body.data.pagination).toHaveProperty('page');
    expect(res.body.data.pagination).toHaveProperty('limit');
    expect(res.body.data.pagination).toHaveProperty('total');
    expect(res.body.data.pagination).toHaveProperty('totalPages');

    if (res.body.data.portfolios.length > 0) {
      assertPortfolioContract(res.body.data.portfolios[0]);
    }
  }, 30000);

  it('GET /api/portfolios/{id} returns strict portfolio detail contract', async () => {
    const listRes = await request(app)
      .get('/api/portfolios?page=1&limit=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(listRes.body?.data?.portfolios)).toBe(true);
    if (listRes.body.data.portfolios.length === 0) {
      return;
    }

    const portfolioId = listRes.body.data.portfolios[0].id;
    const detailRes = await request(app)
      .get(`/api/portfolios/${portfolioId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(detailRes.body).toHaveProperty('success', true);
    expect(detailRes.body).toHaveProperty('data');
    expect(detailRes.body.data).toHaveProperty('portfolio');
    assertPortfolioContract(detailRes.body.data.portfolio);
  }, 30000);

  it('GET /api/portfolios/{id}/summary returns strict summary contract', async () => {
    const listRes = await request(app)
      .get('/api/portfolios?page=1&limit=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(listRes.body?.data?.portfolios)).toBe(true);
    if (listRes.body.data.portfolios.length === 0) {
      return;
    }

    const portfolioId = listRes.body.data.portfolios[0].id;
    const summaryRes = await request(app)
      .get(`/api/portfolios/${portfolioId}/summary`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(summaryRes.body).toHaveProperty('success', true);
    expect(summaryRes.body).toHaveProperty('data');
    assertPortfolioContract(summaryRes.body.data);
    expect(Array.isArray(summaryRes.body.data.positions)).toBe(true);
  }, 30000);

  it('GET /api/orders/my returns strict order list contract', async () => {
    const res = await request(app)
      .get('/api/orders/my')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('orders');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.orders)).toBe(true);

    const pagination = res.body.pagination;
    expect(pagination).toHaveProperty('page');
    expect(pagination).toHaveProperty('limit');
    expect(pagination).toHaveProperty('total');
    expect(pagination).toHaveProperty('totalPages');
    expect(pagination).toHaveProperty('hasNext');
    expect(pagination).toHaveProperty('hasPrevious');

    if (res.body.orders.length > 0) {
      assertOrderContract(res.body.orders[0]);
    }
  }, 30000);

  it('GET /api/orders/{id} returns strict order detail contract', async () => {
    const ordersRes = await request(app)
      .get('/api/orders/my')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(ordersRes.body.orders)).toBe(true);
    if (ordersRes.body.orders.length === 0) {
      return;
    }

    const orderId = ordersRes.body.orders[0].id;
    const detailRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(detailRes.body).toHaveProperty('success', true);
    expect(detailRes.body).toHaveProperty('data');
    assertOrderContract(detailRes.body.data);
  }, 30000);

  it('GET /api/orders/{id}/detailed returns strict detailed order contract', async () => {
    const ordersRes = await request(app)
      .get('/api/orders/my?page=1&limit=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(ordersRes.body.orders)).toBe(true);
    if (ordersRes.body.orders.length === 0) {
      return;
    }

    const orderId = ordersRes.body.orders[0].id;
    const detailRes = await request(app)
      .get(`/api/orders/${orderId}/detailed`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(detailRes.body).toHaveProperty('success', true);
    expect(detailRes.body).toHaveProperty('data');
    assertDetailedOrderContract(detailRes.body.data);
  }, 30000);

  it('GET /api/transactions returns strict ISO timestamp contract', async () => {
    const res = await request(app)
      .get('/api/transactions?page=1&limit=20')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length > 0) {
      const transaction = res.body.data[0];
      assertTransactionContract(transaction);
    }
  }, 30000);

  it('GET /api/transactions/{id} returns strict transaction detail contract', async () => {
    const listRes = await request(app)
      .get('/api/transactions?page=1&limit=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(listRes.body.data)).toBe(true);
    if (listRes.body.data.length === 0) {
      return;
    }

    const transactionId = listRes.body.data[0].id;
    const detailRes = await request(app)
      .get(`/api/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(detailRes.body).toHaveProperty('success', true);
    expect(detailRes.body).toHaveProperty('data');
    assertTransactionContract(detailRes.body.data);
    expect(detailRes.body.data).toHaveProperty('analysis');
  }, 30000);

  it('GET /api/users returns strict user list contract', async () => {
    const res = await request(app)
      .get('/api/users?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('limit');
    expect(res.body.pagination).toHaveProperty('totalCount');
    expect(res.body.pagination).toHaveProperty('totalPages');

    if (res.body.data.length > 0) {
      assertUserContract(res.body.data[0]);
    }
  }, 30000);

  it('GET /api/custody/custodyServices returns strict custody service paginated contract', async () => {
    const res = await request(app)
      .get('/api/custody/custodyServices?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data.custodyServices)).toBe(true);
    expect(res.body.data).toHaveProperty('pagination');
    expect(res.body.data.pagination).toHaveProperty('currentPage');
    expect(res.body.data.pagination).toHaveProperty('itemsPerPage');
    expect(res.body.data.pagination).toHaveProperty('totalItems');
    expect(res.body.data.pagination).toHaveProperty('totalPages');

    if (res.body.data.custodyServices.length > 0) {
      assertCustodyServiceContract(res.body.data.custodyServices[0]);
    }
  }, 30000);

  it('GET /api/custodians/custodians returns strict custodian paginated contract', async () => {
    const res = await request(app)
      .get('/api/custodians/custodians?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data.custodians)).toBe(true);
    expect(res.body.data).toHaveProperty('pagination');
    expect(res.body.data.pagination).toHaveProperty('currentPage');
    expect(res.body.data.pagination).toHaveProperty('itemsPerPage');
    expect(res.body.data.pagination).toHaveProperty('totalItems');
    expect(res.body.data.pagination).toHaveProperty('totalPages');

    if (res.body.data.custodians.length > 0) {
      assertCustodianContract(res.body.data.custodians[0]);
    }
  }, 30000);
});
