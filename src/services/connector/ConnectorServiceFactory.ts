/**
 * Connector Service Factory
 * 
 * Factory for creating connector services with DI.
 */

import { Pool } from "pg";
import { IConnectorService } from "./IConnectorService";
import { IExternalSyncService } from "./IExternalSyncService";
import { ConnectorServiceImpl } from "./impl/ConnectorServiceImpl";
import { ExternalSyncServiceImpl } from "./impl/ExternalSyncServiceImpl";
import { ExternalMappingServiceImpl } from "./impl/ExternalMappingServiceImpl";
import { ExternalLookupServiceImpl } from "./impl/ExternalLookupServiceImpl";
import { IExternalConnectorRepository } from "./repository/IExternalConnectorRepository";
import { ExternalConnectorRepositoryImpl } from "./repository/ExternalConnectorRepositoryImpl";
import { IExternalDataRepository } from "./repository/IExternalDataRepository";
import { ExternalDataRepositoryImpl } from "./repository/ExternalDataRepositoryImpl";
import { IWooCommerceClientFactory } from "./client/IWooCommerceClientFactory";
import { WooCommerceClientFactoryImpl } from "./client/WooCommerceClientFactoryImpl";
import { UserRepositoryImpl } from "../user/repository/UserRepositoryImpl";

export class ConnectorServiceFactory {
  static create(pool: Pool): IConnectorService {
    const repository: IExternalConnectorRepository = new ExternalConnectorRepositoryImpl(pool);
    const dataRepository: IExternalDataRepository = new ExternalDataRepositoryImpl(pool);
    const mappingService = new ExternalMappingServiceImpl();
    const userRepository = new UserRepositoryImpl(pool);
    const lookupService = new ExternalLookupServiceImpl(userRepository, dataRepository);
    const wooClientFactory: IWooCommerceClientFactory = new WooCommerceClientFactoryImpl();
    const syncService: IExternalSyncService = new ExternalSyncServiceImpl(
      repository,
      dataRepository,
      mappingService,
      wooClientFactory,
      lookupService
    );

    return new ConnectorServiceImpl(repository, syncService, wooClientFactory);
  }

  static createRepository(pool: Pool): IExternalConnectorRepository {
    return new ExternalConnectorRepositoryImpl(pool);
  }
}
