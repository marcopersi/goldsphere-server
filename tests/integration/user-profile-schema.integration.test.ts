import { setupTestDatabase, teardownTestDatabase, getTestPool } from './db-setup';

describe('User profile schema migration (PR1)', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should provide required profile and address columns', async () => {
    const pool = getTestPool();
    expect(pool).toBeTruthy();

    const profileColumns = await pool!.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'user_profiles'
       ORDER BY column_name`
    );

    const addressColumns = await pool!.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'user_addresses'
       ORDER BY column_name`
    );

    const profileColumnNames = profileColumns.rows.map((row: { column_name: string }) => row.column_name);
    const addressColumnNames = addressColumns.rows.map((row: { column_name: string }) => row.column_name);

    expect(profileColumnNames).toEqual(
      expect.arrayContaining(['phone', 'gender', 'preferred_currency', 'preferred_payment_method'])
    );

    expect(addressColumnNames).toEqual(
      expect.arrayContaining(['house_number', 'address_line2', 'po_box'])
    );
  });

  it('should persist new profile and address fields', async () => {
    const pool = getTestPool();
    expect(pool).toBeTruthy();

    const email = `schema-test-${Date.now()}@example.com`;

    const userResult = await pool!.query(
      `INSERT INTO users (email, passwordhash, role, email_verified)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [email, 'hash', 'customer', false]
    );

    const userId = userResult.rows[0].id as string;

    await pool!.query(
      `INSERT INTO user_profiles (
        user_id, title, first_name, last_name, birth_date,
        phone, gender, preferred_currency, preferred_payment_method
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        'Herr',
        'Max',
        'Mustermann',
        '1990-01-01',
        '+41791234567',
        'prefer_not_to_say',
        'CHF',
        'bank_transfer',
      ]
    );

    await pool!.query(
      `INSERT INTO user_addresses (
        user_id, countryId, postal_code, city, state, street,
        house_number, address_line2, po_box, is_primary
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        userId,
        null,
        '8001',
        'Zürich',
        'ZH',
        'Bahnhofstrasse',
        '10A',
        '3rd floor',
        'PO-BOX-123',
        true,
      ]
    );

    const persistedProfile = await pool!.query(
      `SELECT phone, gender, preferred_currency, preferred_payment_method
       FROM user_profiles
       WHERE user_id = $1`,
      [userId]
    );

    const persistedAddress = await pool!.query(
      `SELECT house_number, address_line2, po_box
       FROM user_addresses
       WHERE user_id = $1 AND is_primary = true`,
      [userId]
    );

    expect(persistedProfile.rows[0]).toMatchObject({
      phone: '+41791234567',
      gender: 'prefer_not_to_say',
      preferred_currency: 'CHF',
      preferred_payment_method: 'bank_transfer',
    });

    expect(persistedAddress.rows[0]).toMatchObject({
      house_number: '10A',
      address_line2: '3rd floor',
      po_box: 'PO-BOX-123',
    });
  });

  it('should reject invalid phone values via E.164 check', async () => {
    const pool = getTestPool();
    expect(pool).toBeTruthy();

    const email = `schema-test-invalid-phone-${Date.now()}@example.com`;

    const userResult = await pool!.query(
      `INSERT INTO users (email, passwordhash, role, email_verified)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [email, 'hash', 'customer', false]
    );

    const userId = userResult.rows[0].id as string;

    await expect(
      pool!.query(
        `INSERT INTO user_profiles (
          user_id, title, first_name, last_name, birth_date,
          phone, gender, preferred_currency, preferred_payment_method
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          'Frau',
          'Erika',
          'Muster',
          '1991-01-01',
          '0791234567',
          'female',
          'EUR',
          'card',
        ]
      )
    ).rejects.toThrow();
  });
});
