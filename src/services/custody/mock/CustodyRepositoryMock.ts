/**
 * Custody Service Repository Mock
 * In-memory implementation for testing
 */

import {
  CustodyServiceEntity,
  ListCustodyServicesOptions,
  DeleteCustodyServiceValidation,
  CustodianWithServices,
  mapEntityToDTO,
} from '../types/CustodyTypes';
import { ICustodyRepository } from '../repository/ICustodyRepository';
import { AuditTrailUser } from '../../../utils/auditTrail';

export class CustodyRepositoryMock implements ICustodyRepository {
  private custodyServices: CustodyServiceEntity[] = [
    {
      id: '650e8400-e29b-41d4-a716-446655440001',
      custodyservicename: 'Premium Vault Storage',
      custodianid: '550e8400-e29b-41d4-a716-446655440001',
      custodianname: 'Loomis International',
      fee: '0.5',
      paymentfrequency: 'annual',
      currencyid: 'curr-001',
      currency: 'CHF',
      minweight: null,
      maxweight: null,
      createdat: new Date('2024-01-01'),
      updatedat: new Date('2024-01-01'),
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440002',
      custodyservicename: 'Standard Vault',
      custodianid: '550e8400-e29b-41d4-a716-446655440002',
      custodianname: 'Brinks Global Services',
      fee: '0.3',
      paymentfrequency: 'quarterly',
      currencyid: 'curr-001',
      currency: 'CHF',
      minweight: '100',
      maxweight: null,
      createdat: new Date('2024-01-02'),
      updatedat: new Date('2024-01-02'),
    },
  ];

  private activePositionsByCustodyService: Record<string, number> = {
    '650e8400-e29b-41d4-a716-446655440001': 5,
    '650e8400-e29b-41d4-a716-446655440002': 0,
  };

  async findAll(
    options: ListCustodyServicesOptions = {}
  ): Promise<{ custodyServices: CustodyServiceEntity[]; total: number }> {
    let filtered = [...this.custodyServices];

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter((cs) =>
        cs.custodyservicename.toLowerCase().includes(searchLower)
      );
    }

    if (options.custodianId) {
      filtered = filtered.filter(
        (cs) => cs.custodianid === options.custodianId
      );
    }

    if (options.minFee !== undefined) {
      const minFee = options.minFee;
      filtered = filtered.filter((cs) => parseFloat(cs.fee) >= minFee);
    }

    if (options.maxFee !== undefined) {
      const maxFee = options.maxFee;
      filtered = filtered.filter((cs) => parseFloat(cs.fee) <= maxFee);
    }

    if (options.paymentFrequency) {
      filtered = filtered.filter(
        (cs) => cs.paymentfrequency === options.paymentFrequency
      );
    }

    if (options.currency) {
      filtered = filtered.filter((cs) => cs.currency === options.currency);
    }

    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      custodyServices: paginated,
      total: filtered.length,
    };
  }

  async findById(id: string): Promise<CustodyServiceEntity | null> {
    return this.custodyServices.find((cs) => cs.id === id) || null;
  }

  async findByCustodianId(
    custodianId: string
  ): Promise<CustodyServiceEntity[]> {
    return this.custodyServices.filter(
      (cs) => cs.custodianid === custodianId
    );
  }

  async findDefault(): Promise<CustodyServiceEntity | null> {
    return (
      this.custodyServices.find((cs) =>
        cs.custodianname?.toLowerCase().includes('home delivery')
      ) || null
    );
  }

  async getCustodiansWithServices(): Promise<CustodianWithServices[]> {
    const custodiansMap = new Map<string, CustodianWithServices>();

    for (const service of this.custodyServices) {
      if (!service.custodianid || !service.custodianname) continue;

      let custodian = custodiansMap.get(service.custodianid);

      if (!custodian) {
        custodian = {
          custodianId: service.custodianid,
          custodianName: service.custodianname,
          services: [],
        };
        custodiansMap.set(service.custodianid, custodian);
      }

      custodian.services.push(mapEntityToDTO(service));
    }

    return Array.from(custodiansMap.values());
  }

  async create(data: {
    custodyServiceName: string;
    custodianId: string;
    fee: number;
    paymentFrequency: 'monthly' | 'quarterly' | 'annual' | 'onetime';
    currencyId: string;
    minWeight?: number | null;
    maxWeight?: number | null;
  }, _authenticatedUser: AuditTrailUser): Promise<CustodyServiceEntity> {
    const newService: CustodyServiceEntity = {
      id: `650e8400-e29b-41d4-a716-${Date.now().toString().padStart(12, '0')}`,
      custodyservicename: data.custodyServiceName,
      custodianid: data.custodianId,
      custodianname: 'Test Custodian',
      fee: data.fee.toString(),
      paymentfrequency: data.paymentFrequency,
      currencyid: data.currencyId,
      currency: 'CHF',
      minweight: data.minWeight?.toString() || null,
      maxweight: data.maxWeight?.toString() || null,
      createdat: new Date(),
      updatedat: new Date(),
    };
    this.custodyServices.push(newService);
    return newService;
  }

  async update(
    id: string,
    data: {
      custodyServiceName?: string;
      fee?: number;
      paymentFrequency?: 'monthly' | 'quarterly' | 'annual' | 'onetime';
    },
    _authenticatedUser: AuditTrailUser
  ): Promise<CustodyServiceEntity> {
    const service = await this.findById(id);
    if (!service) {
      throw new Error('Custody service not found');
    }

    if (data.custodyServiceName !== undefined) {
      service.custodyservicename = data.custodyServiceName;
    }
    if (data.fee !== undefined) {
      service.fee = data.fee.toString();
    }
    if (data.paymentFrequency !== undefined) {
      service.paymentfrequency = data.paymentFrequency;
    }

    service.updatedat = new Date();
    return service;
  }

  async delete(id: string, _authenticatedUser: AuditTrailUser): Promise<void> {
    const index = this.custodyServices.findIndex((cs) => cs.id === id);
    if (index !== -1) {
      this.custodyServices.splice(index, 1);
      delete this.activePositionsByCustodyService[id];
    }
  }

  async canDelete(id: string): Promise<DeleteCustodyServiceValidation> {
    const count = this.activePositionsByCustodyService[id] || 0;

    if (count > 0) {
      return {
        canDelete: false,
        reason: 'Cannot delete custody service with active positions',
        activePositionCount: count,
      };
    }

    return { canDelete: true };
  }

  async serviceNameExists(
    custodianId: string,
    serviceName: string,
    excludeId?: string
  ): Promise<boolean> {
    return this.custodyServices.some(
      (cs) =>
        cs.custodianid === custodianId &&
        cs.custodyservicename.toLowerCase() === serviceName.toLowerCase() &&
        cs.id !== excludeId
    );
  }

  async custodianExists(custodianId: string): Promise<boolean> {
    return this.custodyServices.some((cs) => cs.custodianid === custodianId);
  }

  async currencyExists(): Promise<boolean> {
    return true; // Mock always returns true
  }
  
  async getCurrencyIdByCode(isoCode: string): Promise<string | null> {
    // Mock currency mapping
    const currencies: Record<string, string> = {
      'USD': 'bff9d8e0-e29b-41d4-a716-446655440001',
      'EUR': 'bff9d8e0-e29b-41d4-a716-446655440002',
      'CHF': 'bff9d8e0-e29b-41d4-a716-446655440003'
    };
    return currencies[isoCode] || null;
  }

  // Test helper methods
  reset(): void {
    this.custodyServices = [
      {
        id: '650e8400-e29b-41d4-a716-446655440001',
        custodyservicename: 'Premium Vault Storage',
        custodianid: '550e8400-e29b-41d4-a716-446655440001',
        custodianname: 'Loomis International',
        fee: '0.5',
        paymentfrequency: 'annual',
        currencyid: 'curr-001',
        currency: 'CHF',
        minweight: null,
        maxweight: null,
        createdat: new Date('2024-01-01'),
        updatedat: new Date('2024-01-01'),
      },
    ];
    this.activePositionsByCustodyService = {
      '650e8400-e29b-41d4-a716-446655440001': 5,
    };
  }

  setActivePositionCount(custodyServiceId: string, count: number): void {
    this.activePositionsByCustodyService[custodyServiceId] = count;
  }
}
