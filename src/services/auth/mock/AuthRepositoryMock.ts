/**
 * Auth Repository Mock
 * In-memory mock for unit testing
 */

import { IAuthRepository } from '../repository/IAuthRepository';
import { AuthUserRecord } from '../types';

export class AuthRepositoryMock implements IAuthRepository {
  private users: Map<string, AuthUserRecord> = new Map();
  private lastLoginUpdates: Map<string, Date> = new Map();

  constructor(initialUsers?: AuthUserRecord[]) {
    if (initialUsers) {
      initialUsers.forEach((user) => this.users.set(user.email, user));
    }
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.users.get(email) || null;
  }

  async updateLastLogin(userId: string): Promise<void> {
    this.lastLoginUpdates.set(userId, new Date());
  }

  async isUserActive(userId: string): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.id === userId) {
        return user.status === 'active';
      }
    }
    return false;
  }

  // Test helper methods
  addUser(user: AuthUserRecord): void {
    this.users.set(user.email, user);
  }

  removeUser(email: string): void {
    this.users.delete(email);
  }

  getLastLoginUpdate(userId: string): Date | undefined {
    return this.lastLoginUpdates.get(userId);
  }

  clear(): void {
    this.users.clear();
    this.lastLoginUpdates.clear();
  }
}
