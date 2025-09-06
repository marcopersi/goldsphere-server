/**
 * Integration test for last_login functionality
 * Tests that the last_login timestamp is updated upon successful login
 */

import request from 'supertest';
import app from '../../src/app';
import { getPool } from '../../src/dbConfig';

describe('Login last_login Integration Tests', () => {
  const testUserEmail = 'bank.technical@goldsphere.vault';
  const testUserPassword = 'GoldspherePassword';

  test('should update last_login timestamp on successful login', async () => {
    // Clear the last_login first to ensure we have a clean state
    await getPool().query(
      'UPDATE users SET last_login = NULL WHERE email = $1',
      [testUserEmail]
    );

    // Get the current last_login value (should be null now)
    const beforeLoginResult = await getPool().query(
      'SELECT id, last_login FROM users WHERE email = $1',
      [testUserEmail]
    );
    
    expect(beforeLoginResult.rows.length).toBe(1);
    const userId = beforeLoginResult.rows[0].id;
    const lastLoginBefore = beforeLoginResult.rows[0].last_login;
    expect(lastLoginBefore).toBeNull();

    // Perform login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUserEmail,
        password: testUserPassword
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.token).toBeDefined();

    // Check that last_login was updated
    const afterLoginResult = await getPool().query(
      'SELECT last_login, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_login)) as seconds_ago FROM users WHERE id = $1',
      [userId]
    );

    expect(afterLoginResult.rows.length).toBe(1);
    const lastLoginAfter = afterLoginResult.rows[0].last_login;
    const secondsAgo = parseFloat(afterLoginResult.rows[0].seconds_ago);

    // Verify last_login was updated
    expect(lastLoginAfter).not.toBeNull();
    
    // Verify the timestamp is recent (within last 5 seconds)
    expect(secondsAgo).toBeLessThan(5);
    expect(secondsAgo).toBeGreaterThanOrEqual(0);
  });

  test('should not update last_login on failed login', async () => {
    // Set a known timestamp first
    const testTimestamp = '2023-01-01 12:00:00';
    await getPool().query(
      'UPDATE users SET last_login = $1 WHERE email = $2',
      [testTimestamp, testUserEmail]
    );

    // Get current last_login value
    const beforeLoginResult = await getPool().query(
      'SELECT id, last_login FROM users WHERE email = $1',
      [testUserEmail]
    );
    
    expect(beforeLoginResult.rows.length).toBe(1);
    const userId = beforeLoginResult.rows[0].id;
    const lastLoginBefore = beforeLoginResult.rows[0].last_login;

    // Attempt login with wrong password
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUserEmail,
        password: 'wrongpassword'
      });

    expect(loginResponse.status).toBe(401);
    expect(loginResponse.body.error).toBe('Invalid credentials');

    // Check that last_login was NOT updated
    const afterLoginResult = await getPool().query(
      'SELECT last_login FROM users WHERE id = $1',
      [userId]
    );

    expect(afterLoginResult.rows.length).toBe(1);
    const lastLoginAfter = afterLoginResult.rows[0].last_login;

    // Verify last_login was NOT changed
    expect(lastLoginAfter).toEqual(lastLoginBefore);
  });

  test('should handle multiple successive logins correctly', async () => {
    // Clear the last_login first
    await getPool().query(
      'UPDATE users SET last_login = NULL WHERE email = $1',
      [testUserEmail]
    );

    // First login
    const firstLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUserEmail,
        password: testUserPassword
      });

    expect(firstLoginResponse.status).toBe(200);

    // Get timestamp after first login
    const firstLoginResult = await getPool().query(
      'SELECT last_login FROM users WHERE email = $1',
      [testUserEmail]
    );
    const firstLoginTime = firstLoginResult.rows[0].last_login;
    expect(firstLoginTime).not.toBeNull();

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1100)); // Wait 1.1 seconds

    // Second login
    const secondLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUserEmail,
        password: testUserPassword
      });

    expect(secondLoginResponse.status).toBe(200);

    // Get timestamp after second login
    const secondLoginResult = await getPool().query(
      'SELECT last_login FROM users WHERE email = $1',
      [testUserEmail]
    );
    const secondLoginTime = secondLoginResult.rows[0].last_login;

    // Verify second login updated the timestamp
    expect(new Date(secondLoginTime)).toBeInstanceOf(Date);
    expect(new Date(secondLoginTime).getTime()).toBeGreaterThan(new Date(firstLoginTime).getTime());
    
    // Verify the difference is reasonable (between 1-3 seconds)
    const timeDiff = new Date(secondLoginTime).getTime() - new Date(firstLoginTime).getTime();
    expect(timeDiff).toBeGreaterThan(1000); // More than 1 second
    expect(timeDiff).toBeLessThan(5000); // Less than 5 seconds
  });
});
