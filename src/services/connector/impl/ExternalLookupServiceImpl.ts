/**
 * External Lookup Service Implementation
 * 
 * Uses repositories to resolve internal IDs.
 */

import { IUserRepository } from "../../user/repository/IUserRepository";
import { IExternalDataRepository } from "../repository/IExternalDataRepository";
import { IExternalLookupService } from "../IExternalLookupService";

export class ExternalLookupServiceImpl implements IExternalLookupService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly externalDataRepository: IExternalDataRepository
  ) {}

  async resolveUserIdByEmail(email: string): Promise<string | null> {
    const user = await this.userRepository.findUserByEmail(email);
    return user?.id ?? null;
  }

  async resolveProductIdByExternalId(source: string, externalId: string): Promise<string | null> {
    const reference = await this.externalDataRepository.getExternalReference(source, "product", externalId);
    return reference?.internalId ?? null;
  }
}
