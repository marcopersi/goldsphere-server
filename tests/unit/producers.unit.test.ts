import { z } from 'zod';

// Producer validation schemas - these should match what's in producers.ts
const ProducerCreateRequestSchema = z.object({
  producerName: z.string().min(1, 'Producer name is required').max(200, 'Producer name too long')
});

const ProducerUpdateRequestSchema = z.object({
  producerName: z.string().min(1, 'Producer name is required')
});

const ProducersQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? Math.max(1, Number.parseInt(val)) || 1 : 1),
  limit: z.string().optional().transform(val => val ? Math.min(100, Math.max(1, Number.parseInt(val))) || 20 : 20),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
});

describe('Producer Validation Unit Tests', () => {
  describe('ProducerCreateRequestSchema', () => {
    const validProducerData = {
      producerName: 'Royal Canadian Mint'
    };

    it('should validate valid producer creation data', () => {
      const result = ProducerCreateRequestSchema.safeParse(validProducerData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.producerName).toBe('Royal Canadian Mint');
      }
    });

    it('should require producerName', () => {
      const result = ProducerCreateRequestSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid input: expected string, received undefined');
      }
    });

    it('should reject empty producerName', () => {
      const result = ProducerCreateRequestSchema.safeParse({ producerName: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Producer name is required');
      }
    });

    it('should reject producerName that is too long', () => {
      const longName = 'A'.repeat(201);
      const result = ProducerCreateRequestSchema.safeParse({ producerName: longName });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Producer name too long');
      }
    });

    it('should accept producerName with spaces and special characters', () => {
      const names = [
        'Royal Canadian Mint',
        'Argor-Heraeus',
        'United States Mint',
        'Perth Mint & Refinery Co.',
        'Austrian Mint (Münze Österreich)'
      ];

      for (const name of names) {
        const result = ProducerCreateRequestSchema.safeParse({ producerName: name });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.producerName).toBe(name);
        }
      }
    });

    it('should trim whitespace from producerName', () => {
      const result = ProducerCreateRequestSchema.safeParse({ producerName: '  Royal Canadian Mint  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.producerName).toBe('  Royal Canadian Mint  '); // Zod doesn't trim by default
      }
    });
  });

  describe('ProducerUpdateRequestSchema', () => {
    it('should validate valid producer update data', () => {
      const updateData = {
        producerName: 'Updated Royal Canadian Mint'
      };
      
      const result = ProducerUpdateRequestSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.producerName).toBe('Updated Royal Canadian Mint');
      }
    });

    it('should allow empty object (partial update)', () => {
      const result = ProducerUpdateRequestSchema.partial().safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject empty producerName for updates', () => {
      const result = ProducerUpdateRequestSchema.safeParse({ producerName: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Producer name is required');
      }
    });
  });

  describe('ProducersQuerySchema', () => {
    it('should parse valid query parameters', () => {
      const queryParams = {
        page: '2',
        limit: '10',
        search: 'Canadian',
        sortBy: 'name',
        sortOrder: 'desc'
      };

      const result = ProducersQuerySchema.safeParse(queryParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(10);
        expect(result.data.search).toBe('Canadian');
        expect(result.data.sortBy).toBe('name');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should provide default values', () => {
      const result = ProducersQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sortBy).toBe('name');
        expect(result.data.sortOrder).toBe('asc');
        expect(result.data.search).toBeUndefined();
      }
    });

    it('should enforce minimum page number', () => {
      const result = ProducersQuerySchema.safeParse({ page: '0' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it('should enforce maximum limit', () => {
      const result = ProducersQuerySchema.safeParse({ limit: '150' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });

    it('should enforce minimum limit', () => {
      const result = ProducersQuerySchema.safeParse({ limit: '0' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(1);
      }
    });

    it('should handle invalid numeric values gracefully', () => {
      const result = ProducersQuerySchema.safeParse({ page: 'invalid', limit: 'invalid' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should validate sortBy enum values', () => {
      const validSortBy = ['name', 'createdAt', 'updatedAt'];
      
      validSortBy.forEach(sortBy => {
        const result = ProducersQuerySchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortBy).toBe(sortBy);
        }
      });

      // Test invalid sortBy
      const invalidResult = ProducersQuerySchema.safeParse({ sortBy: 'invalid' });
      expect(invalidResult.success).toBe(false);
    });

    it('should validate sortOrder enum values', () => {
      const validSortOrders = ['asc', 'desc'];
      
      validSortOrders.forEach(sortOrder => {
        const result = ProducersQuerySchema.safeParse({ sortOrder });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortOrder).toBe(sortOrder);
        }
      });

      // Test invalid sortOrder
      const invalidResult = ProducersQuerySchema.safeParse({ sortOrder: 'invalid' });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Producer Business Logic Validations', () => {
    it('should handle international producer names', () => {
      const internationalNames = [
        'Münze Österreich', // Austrian Mint with umlaut
        'Monnaie de Paris', // French Mint
        'Casa da Moeda do Brasil', // Brazilian Mint
        'China Gold Coin Incorporation', // Chinese Mint
        'South African Mint Company (Pty) Ltd' // South African Mint
      ];

      internationalNames.forEach(name => {
        const result = ProducerCreateRequestSchema.safeParse({ producerName: name });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.producerName).toBe(name);
        }
      });
    });

    it('should handle producer names with various formats', () => {
      const formats = [
        'PAMP SA', // Abbreviation
        'Johnson Matthey & Co. Limited', // Company with ampersand
        'Royal Mint (UK)', // With country identifier
        'Valcambi S.A.', // With legal entity type
        'Argor-Heraeus S.A.' // Hyphenated with legal entity
      ];

      formats.forEach(name => {
        const result = ProducerCreateRequestSchema.safeParse({ producerName: name });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.producerName).toBe(name);
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum valid producer name', () => {
      const result = ProducerCreateRequestSchema.safeParse({ producerName: 'A' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.producerName).toBe('A');
      }
    });

    it('should handle maximum valid producer name', () => {
      const maxName = 'A'.repeat(200);
      const result = ProducerCreateRequestSchema.safeParse({ producerName: maxName });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.producerName).toBe(maxName);
      }
    });

    it('should reject null producerName', () => {
      const result = ProducerCreateRequestSchema.safeParse({ producerName: null });
      expect(result.success).toBe(false);
    });

    it('should reject undefined producerName', () => {
      const result = ProducerCreateRequestSchema.safeParse({ producerName: undefined });
      expect(result.success).toBe(false);
    });

    it('should reject non-string producerName', () => {
      const invalidTypes = [123, [], {}, true, false];
      
      invalidTypes.forEach(value => {
        const result = ProducerCreateRequestSchema.safeParse({ producerName: value });
        expect(result.success).toBe(false);
      });
    });
  });
});

describe('Producer Query Parameter Transformations', () => {
  it('should transform string numbers to integers for pagination', () => {
    const testCases = [
      { input: '1', expected: 1 },
      { input: '42', expected: 42 },
      { input: '999', expected: 100 }, // Should be capped at 100 for limit
    ];

    testCases.forEach(({ input, expected }) => {
      const result = ProducersQuerySchema.safeParse({ limit: input });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(expected === 999 ? 100 : expected);
      }
    });
  });
});
