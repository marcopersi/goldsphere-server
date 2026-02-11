/**
 * External Lookup Service Interface
 * 
 * Resolves internal IDs from external references.
 */

export interface IExternalLookupService {
  resolveUserIdByEmail(email: string): Promise<string | null>;
  resolveProductIdByExternalId(source: string, externalId: string): Promise<string | null>;
}
