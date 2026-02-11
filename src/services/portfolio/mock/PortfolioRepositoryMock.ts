/**
 * Portfolio Repository Mock Implementation
 * 
 * In-memory implementation for testing without database dependency
 */

import { IPortfolioRepository } from '../repository/IPortfolioRepository';
import {
  PortfolioSummary,
  PortfolioWithPositions,
  ListPortfoliosOptions,
  GetPortfoliosResult
} from '../types/PortfolioTypes';
import { CommonPaginationSchema } from '@marcopersi/shared';
import { AuditTrailUser } from '../../../utils/auditTrail';

export class PortfolioRepositoryMock implements IPortfolioRepository {
  private readonly portfolios: Map<string, PortfolioSummary> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const portfolio1: PortfolioSummary = {
      id: 'portfolio-001',
      portfolioName: 'Gold Investment Portfolio',
      ownerId: 'user-001',
      description: 'Primary gold investment portfolio',
      isActive: true,
      totalValue: 50000.0,
      totalCost: 45000.0,
      totalGainLoss: 5000.0,
      totalGainLossPercentage: 11.11,
      positionCount: 5,
      lastUpdated: new Date('2024-01-15'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15')
    };

    const portfolio2: PortfolioSummary = {
      id: 'portfolio-002',
      portfolioName: 'Silver & Platinum Mix',
      ownerId: 'user-001',
      description: 'Diversified precious metals',
      isActive: true,
      totalValue: 25000.0,
      totalCost: 26000.0,
      totalGainLoss: -1000.0,
      totalGainLossPercentage: -3.85,
      positionCount: 3,
      lastUpdated: new Date('2024-01-10'),
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-10')
    };

    this.portfolios.set(portfolio1.id, portfolio1);
    this.portfolios.set(portfolio2.id, portfolio2);
  }

  async getAllPortfolios(options: ListPortfoliosOptions): Promise<GetPortfoliosResult> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let filtered = Array.from(this.portfolios.values());

    // Apply filters
    if (options.ownerId) {
      filtered = filtered.filter(p => p.ownerId === options.ownerId);
    }
    if (typeof options.isActive === 'boolean') {
      filtered = filtered.filter(p => p.isActive === options.isActive);
    }
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(
        p => p.portfolioName.toLowerCase().includes(searchLower) ||
             (p.description && p.description.toLowerCase().includes(searchLower))
      );
    }

    const total = filtered.length;
    const portfolios = filtered.slice(offset, offset + limit);

    const pagination = CommonPaginationSchema.parse({
      page, limit, total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: offset + portfolios.length < total,
      hasPrevious: page > 1,
    });

    return { portfolios, pagination };
  }

  async getUserPortfolios(userId: string, options: ListPortfoliosOptions): Promise<GetPortfoliosResult> {
    return this.getAllPortfolios({ ...options, ownerId: userId });
  }

  async getById(portfolioId: string): Promise<PortfolioSummary | null> {
    return this.portfolios.get(portfolioId) || null;
  }

  async getWithPositions(portfolioId: string): Promise<PortfolioWithPositions | null> {
    const summary = await this.getById(portfolioId);
    if (!summary) return null;

    // Mock positions
    const positions = [
      {
        id: 'pos-001',
        userId: summary.ownerId,
        productId: 'prod-001',
        portfolioId: portfolioId,
        product: {
          id: 'prod-001',
          name: 'Swiss Vreneli 20 Francs',
          type: 'Coin',
          metal: { id: 'm-001', name: 'Gold', symbol: 'AU' },
          price: 450.0,
          currency: 'CHF',
          weight: 0.1867,
          weightUnit: 'troy_ounces',
          purity: 0.9,
          imageUrl: 'https://example.com/vreneli.jpg'
        },
        quantity: 10,
        purchasePrice: 450.0,
        marketPrice: 480.0,
        purchaseDate: new Date('2024-01-01'),
        status: 'active',
        notes: '',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      }
    ];

    return { ...summary, positions: positions as any };
  }

  async create(
    userId: string,
    name: string,
    description: string | undefined,
    _authenticatedUser: AuditTrailUser
  ): Promise<PortfolioSummary> {
    const id = `portfolio-${Date.now()}`;
    const now = new Date();

    const portfolio: PortfolioSummary = {
      id,
      portfolioName: name,
      ownerId: userId,
      description: description || null,
      isActive: true,
      totalValue: 0,
      totalCost: 0,
      totalGainLoss: 0,
      totalGainLossPercentage: 0,
      positionCount: 0,
      lastUpdated: now,
      createdAt: now,
      updatedAt: now
    };

    this.portfolios.set(id, portfolio);
    return portfolio;
  }

  async update(
    portfolioId: string,
    updates: Partial<PortfolioSummary>,
    _authenticatedUser: AuditTrailUser
  ): Promise<PortfolioSummary | null> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      return null;
    }

    const updated = { ...portfolio, ...updates, updatedAt: new Date() };
    this.portfolios.set(portfolioId, updated);
    return updated;
  }

  async delete(portfolioId: string, _authenticatedUser: AuditTrailUser): Promise<void> {
    this.portfolios.delete(portfolioId);
  }

  async userExists(userId: string): Promise<boolean> {
    // In mock, just check if there are portfolios for this user
    return Array.from(this.portfolios.values()).some(p => p.ownerId === userId);
  }

  async nameExistsForUser(userId: string, name: string, excludePortfolioId?: string): Promise<boolean> {
    return Array.from(this.portfolios.values()).some(
      p => p.ownerId === userId && 
           p.portfolioName === name && 
           p.id !== excludePortfolioId
    );
  }

  async getPositionCount(portfolioId: string): Promise<number> {
    const portfolio = this.portfolios.get(portfolioId);
    return portfolio?.positionCount || 0;
  }

  // Test helper methods
  clear(): void {
    this.portfolios.clear();
  }

  /** Test helper: Get all portfolios from internal storage (no pagination) */
  getAllPortfoliosSync(): PortfolioSummary[] {
    return Array.from(this.portfolios.values());
  }

  reset(): void {
    this.clear();
    this.initializeMockData();
  }
}
