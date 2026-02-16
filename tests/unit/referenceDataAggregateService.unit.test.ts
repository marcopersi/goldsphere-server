import type { Pool } from 'pg';
import { ReferenceDataAggregateService } from '../../src/services/reference/ReferenceDataAggregateService';
import { UserRole, UserTitle } from '../../src/services/user/types/UserEnums';

describe('ReferenceDataAggregateService', () => {
  it('should include dynamic role and title options in aggregated data', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM producer')) {
        return {
          rows: [{ id: 'producer-1', name: 'Test Producer' }],
        };
      }

      if (sql.includes('FROM currency')) {
        return {
          rows: [{ id: 'currency-1', isocode2: 'CH', isocode3: 'CHF', isonumericcode: 756 }],
        };
      }

      throw new Error(`Unexpected SQL query: ${sql}`);
    });

    const pool = { query } as unknown as Pool;
    const service = new ReferenceDataAggregateService(pool);

    const result = await service.getAll();

    expect(query).toHaveBeenCalledTimes(2);

    const roleValues = result.roles.map((role) => role.value);
    expect(roleValues).toEqual(Object.values(UserRole));
    expect(result.roles.every((role) => role.displayName === role.value)).toBe(true);

    const titleValues = result.titles.map((title) => title.value);
    expect(titleValues).toEqual(Object.values(UserTitle));
    expect(result.titles.every((title) => title.displayName === title.value)).toBe(true);
  });
});
