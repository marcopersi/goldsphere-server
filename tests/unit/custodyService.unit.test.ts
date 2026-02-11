/**
 * Custody Service Unit Tests
 * 
 * Tests business logic and validation for custody services
 */

import { CustodyServiceImpl } from '../../src/services/custody/impl/CustodyServiceImpl';
import { ICustodyRepository } from '../../src/services/custody/repository/ICustodyRepository';
import { CustodyServiceEntity, CustodianWithServices } from '../../src/services/custody/types/CustodyTypes';
import { AuditTrailUser } from '../../src/utils/auditTrail';

describe('CustodyServiceImpl Unit Tests', () => {
  const testUser: AuditTrailUser = { id: 'test-user-id', email: 'test@example.com', role: 'admin' };
  let service: CustodyServiceImpl;
  let mockRepository: jest.Mocked<ICustodyRepository>;

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCustodianId: jest.fn(),
      findDefault: jest.fn(),
      getCustodiansWithServices: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      canDelete: jest.fn(),
      serviceNameExists: jest.fn(),
      custodianExists: jest.fn(),
      currencyExists: jest.fn(),
      getCurrencyIdByCode: jest.fn(),
    } as any;

    service = new CustodyServiceImpl(mockRepository);
  });

  describe('getDefaultCustodyService()', () => {
    it('should return default custody service', async () => {
      const mockEntity: CustodyServiceEntity = {
        id: 'default-id',
        custodyservicename: 'Home Delivery',
        custodianid: 'custodian-id',
        custodianname: 'Home Delivery',
        fee: '20',
        paymentfrequency: 'onetime',
        currencyid: 'currency-id',
        currency: 'CHF',
        minweight: null,
        maxweight: null,
        createdat: new Date(),
        updatedat: new Date(),
      };

      mockRepository.findDefault.mockResolvedValue(mockEntity);

      const result = await service.getDefaultCustodyService();

      expect(result.success).toBe(true);
      expect(result.data?.custodyServiceName).toBe('Home Delivery');
      expect(result.data?.fee).toBe(20);
      expect(result.data?.paymentFrequency).toBe('onetime');
      expect(mockRepository.findDefault).toHaveBeenCalledTimes(1);
    });

    it('should return error when default service not found', async () => {
      mockRepository.findDefault.mockResolvedValue(null);

      const result = await service.getDefaultCustodyService();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Default custody service not found');
    });

    it('should handle repository errors', async () => {
      mockRepository.findDefault.mockRejectedValue(new Error('Database error'));

      const result = await service.getDefaultCustodyService();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch default custody service');
    });
  });

  describe('getCustodiansWithServices()', () => {
    it('should return all custodians with their services', async () => {
      const mockCustodians: CustodianWithServices[] = [
        {
          custodianId: 'custodian-1',
          custodianName: 'Bank of Switzerland',
          services: [
            {
              id: 'service-1',
              custodyServiceName: 'Monthly Service',
              custodianId: 'custodian-1',
              custodianName: 'Bank of Switzerland',
              fee: 10,
              paymentFrequency: 'monthly',
              currencyId: 'currency-id',
              currency: 'USD',
              minWeight: null,
              maxWeight: 10000,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
        {
          custodianId: 'custodian-2',
          custodianName: 'Loomis',
          services: [],
        },
      ];

      mockRepository.getCustodiansWithServices.mockResolvedValue(mockCustodians);

      const result = await service.getCustodiansWithServices();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustodians);
      expect(result.data?.length).toBe(2);
      expect(result.message).toContain('Retrieved 2 custodians');
    });

    it('should filter custodians by search term', async () => {
      const mockCustodians: CustodianWithServices[] = [
        {
          custodianId: 'custodian-1',
          custodianName: 'Bank of Switzerland',
          services: [],
        },
      ];

      mockRepository.getCustodiansWithServices.mockResolvedValue(mockCustodians);

      const result = await service.getCustodiansWithServices('Switzerland');

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(mockRepository.getCustodiansWithServices).toHaveBeenCalledWith('Switzerland');
    });

    it('should handle empty results', async () => {
      mockRepository.getCustodiansWithServices.mockResolvedValue([]);

      const result = await service.getCustodiansWithServices();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.message).toContain('Retrieved 0 custodians');
    });

    it('should handle repository errors', async () => {
      mockRepository.getCustodiansWithServices.mockRejectedValue(new Error('Connection timeout'));

      const result = await service.getCustodiansWithServices();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch custodians with services');
      expect(result.error).toContain('Connection timeout');
    });
  });

  describe('getCustodyServiceById()', () => {
    it('should return custody service by ID', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const mockEntity: CustodyServiceEntity = {
        id: validUUID,
        custodyservicename: 'Premium Vault',
        custodianid: '650e8400-e29b-41d4-a716-446655440000',
        custodianname: 'Loomis',
        fee: '50',
        paymentfrequency: 'monthly',
        currencyid: '750e8400-e29b-41d4-a716-446655440000',
        currency: 'USD',
        minweight: '100',
        maxweight: '5000',
        createdat: new Date(),
        updatedat: new Date(),
      };

      mockRepository.findById.mockResolvedValue(mockEntity);

      const result = await service.getCustodyServiceById(validUUID);

      expect(result.success).toBe(true);
      expect(result.data?.custodyServiceName).toBe('Premium Vault');
      expect(result.data?.fee).toBe(50);
      expect(mockRepository.findById).toHaveBeenCalledWith(validUUID);
    });

    it('should return error for non-existent service', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.getCustodyServiceById(validUUID);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Custody service not found');
    });

    it('should handle repository errors', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      mockRepository.findById.mockRejectedValue(new Error('Database connection error'));

      const result = await service.getCustodyServiceById(validUUID);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch custody service');
    });
  });

  describe('createCustodyService()', () => {
    const validCreateData = {
      custodyServiceName: 'New Service',
      custodianId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
      fee: 25,
      paymentFrequency: 'monthly' as const,
      currency: 'USD',
      minWeight: 50,
      maxWeight: 1000,
    };

    it('should create custody service with valid data', async () => {
      const mockCreatedEntity: CustodyServiceEntity = {
        id: 'new-service-id',
        custodyservicename: validCreateData.custodyServiceName,
        custodianid: validCreateData.custodianId,
        custodianname: 'Custodian Name',
        fee: validCreateData.fee.toString(),
        paymentfrequency: validCreateData.paymentFrequency,
        currencyid: 'currency-id',
        currency: validCreateData.currency,
        minweight: validCreateData.minWeight?.toString() || null,
        maxweight: validCreateData.maxWeight?.toString() || null,
        createdat: new Date(),
        updatedat: new Date(),
      };

      mockRepository.custodianExists.mockResolvedValue(true);
      mockRepository.getCurrencyIdByCode.mockResolvedValue('currency-id');
      mockRepository.serviceNameExists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue(mockCreatedEntity);

      const result = await service.createCustodyService(validCreateData, testUser);

      expect(result.success).toBe(true);
      expect(result.data?.custodyServiceName).toBe('New Service');
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should reject empty service name', async () => {
      const result = await service.createCustodyService({
        ...validCreateData,
        custodyServiceName: '',
      }, testUser);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Custody service name is required');
    });

    it('should reject negative fee', async () => {
      const result = await service.createCustodyService({
        ...validCreateData,
        fee: -10,
      }, testUser);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Fee must be a positive number');
    });

    it('should reject zero fee', async () => {
      const result = await service.createCustodyService({
        ...validCreateData,
        fee: 0,
      }, testUser);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Fee must be a positive number');
    });

    it('should reject when custodian does not exist', async () => {
      mockRepository.custodianExists.mockResolvedValue(false);

      const result = await service.createCustodyService(validCreateData, testUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Custodian not found');
    });

    it('should reject invalid currency code', async () => {
      mockRepository.custodianExists.mockResolvedValue(true);
      mockRepository.getCurrencyIdByCode.mockResolvedValue(null);

      const result = await service.createCustodyService(validCreateData, testUser);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Currency 'USD' not found");
    });

    it('should reject when minWeight > maxWeight', async () => {
      const result = await service.createCustodyService({
        ...validCreateData,
        minWeight: 1000,
        maxWeight: 100,
      }, testUser);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Minimum weight cannot be greater than maximum weight');
    });

    it('should accept service without weight limits', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      mockRepository.custodianExists.mockResolvedValue(true);
      mockRepository.getCurrencyIdByCode.mockResolvedValue('currency-id');
      mockRepository.serviceNameExists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue({
        id: 'new-id',
        custodyservicename: 'No Limits Service',
        custodianid: validUUID,
        custodianname: 'Custodian',
        fee: '10',
        paymentfrequency: 'quarterly',
        currencyid: 'currency-id',
        currency: 'CHF',
        minweight: null,
        maxweight: null,
        createdat: new Date(),
        updatedat: new Date(),
      });

      const result = await service.createCustodyService({
        custodyServiceName: 'No Limits Service',
        custodianId: validUUID,
        fee: 10,
        paymentFrequency: 'quarterly',
        currency: 'CHF',
      }, testUser);

      expect(result.success).toBe(true);
    });
  });
});
