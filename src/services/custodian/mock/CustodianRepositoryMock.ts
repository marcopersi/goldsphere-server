/**
 * Custodian Repository Mock
 * In-memory implementation for testing
 */

import {
  CustodianEntity,
  ListCustodiansOptions,
  DeleteCustodianValidation,
} from '../types/CustodianTypes';
import { ICustodianRepository } from '../repository/ICustodianRepository';
import { AuditTrailUser } from '../../../utils/auditTrail';

export class CustodianRepositoryMock implements ICustodianRepository {
  private custodians: CustodianEntity[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      custodianname: 'Loomis International',
      createdat: new Date('2024-01-01T10:00:00Z'),
      updatedat: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      custodianname: 'Brinks Global Services',
      createdat: new Date('2024-01-02T10:00:00Z'),
      updatedat: new Date('2024-01-02T10:00:00Z'),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      custodianname: 'Home Delivery',
      createdat: new Date('2024-01-03T10:00:00Z'),
      updatedat: new Date('2024-01-03T10:00:00Z'),
    },
  ];

  private custodyServicesByCustodian: Record<string, number> = {
    '550e8400-e29b-41d4-a716-446655440001': 2,
    '550e8400-e29b-41d4-a716-446655440002': 1,
    '550e8400-e29b-41d4-a716-446655440003': 1,
  };

  async findAll(
    options: ListCustodiansOptions = {}
  ): Promise<{ custodians: CustodianEntity[]; total: number }> {
    let filtered = [...this.custodians];

    // Apply search filter
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter((c) =>
        c.custodianname.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    const sortBy = options.sortBy || 'custodianName';
    const sortOrder = options.sortOrder || 'asc';

    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortBy === 'createdAt') {
        aVal = a.createdat.getTime();
        bVal = b.createdat.getTime();
      } else {
        aVal = a.custodianname.toLowerCase();
        bVal = b.custodianname.toLowerCase();
      }

      if (sortOrder === 'desc') {
        return aVal < bVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });

    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      custodians: paginated,
      total: filtered.length,
    };
  }

  async findById(id: string): Promise<CustodianEntity | null> {
    return this.custodians.find((c) => c.id === id) || null;
  }

  async findByName(name: string): Promise<CustodianEntity | null> {
    return (
      this.custodians.find(
        (c) => c.custodianname.toLowerCase() === name.toLowerCase()
      ) || null
    );
  }

  async create(name: string, _authenticatedUser?: AuditTrailUser): Promise<CustodianEntity> {
    const newCustodian: CustodianEntity = {
      id: `550e8400-e29b-41d4-a716-${Date.now().toString().padStart(12, '0')}`,
      custodianname: name,
      createdat: new Date(),
      updatedat: new Date(),
    };
    this.custodians.push(newCustodian);
    return newCustodian;
  }

  async update(id: string, name: string, _authenticatedUser?: AuditTrailUser): Promise<CustodianEntity> {
    const custodian = await this.findById(id);
    if (!custodian) {
      throw new Error('Custodian not found');
    }

    custodian.custodianname = name;
    custodian.updatedat = new Date();
    return custodian;
  }

  async delete(id: string, _authenticatedUser?: AuditTrailUser): Promise<void> {
    const index = this.custodians.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.custodians.splice(index, 1);
      delete this.custodyServicesByCustodian[id];
    }
  }

  async canDelete(id: string): Promise<DeleteCustodianValidation> {
    const count = this.custodyServicesByCustodian[id] || 0;

    if (count > 0) {
      return {
        canDelete: false,
        reason: 'Cannot delete custodian with existing custody services',
        custodyServiceCount: count,
      };
    }

    return { canDelete: true };
  }

  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    return this.custodians.some(
      (c) =>
        c.custodianname.toLowerCase() === name.toLowerCase() &&
        c.id !== excludeId
    );
  }

  // Test helper methods
  reset(): void {
    this.custodians = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        custodianname: 'Loomis International',
        createdat: new Date('2024-01-01T10:00:00Z'),
        updatedat: new Date('2024-01-01T10:00:00Z'),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        custodianname: 'Brinks Global Services',
        createdat: new Date('2024-01-02T10:00:00Z'),
        updatedat: new Date('2024-01-02T10:00:00Z'),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        custodianname: 'Home Delivery',
        createdat: new Date('2024-01-03T10:00:00Z'),
        updatedat: new Date('2024-01-03T10:00:00Z'),
      },
    ];
    this.custodyServicesByCustodian = {
      '550e8400-e29b-41d4-a716-446655440001': 2,
      '550e8400-e29b-41d4-a716-446655440002': 1,
      '550e8400-e29b-41d4-a716-446655440003': 1,
    };
  }

  setCustodyServiceCount(custodianId: string, count: number): void {
    this.custodyServicesByCustodian[custodianId] = count;
  }
}
