/**
 * Admin Connectors Controller - tsoa implementation
 * 
 * Admin endpoints for external connector configuration and sync.
 */

import {
  Body,
  Controller,
  Get,
  Path,
  Post,
  Put,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags
} from "tsoa";
import { getPool } from "../dbConfig";
import { createLogger } from "../utils/logger";
import { ConnectorServiceFactory } from "../services/connector";
import { connectorCreateSchema, connectorSyncSchema, connectorUpdateSchema } from "../services/connector/validation/connectorSchemas";
import {
  ConnectorCreateRequest,
  ConnectorCreateResponse,
  ConnectorListResponse,
  ConnectorRunsResponse,
  ConnectorSyncRequest,
  ConnectorSyncResponse,
  ConnectorTestResponse,
  ConnectorUpdateRequest,
  ConnectorUpdateResponse
} from "../services/connector/types/ConnectorTypes";

interface ConnectorsErrorResponse {
  success: false;
  error: string;
  details?: string;
}

const logger = createLogger("AdminConnectorsController");
const connectorService = ConnectorServiceFactory.create(getPool());

@Route("admin/connectors")
@Tags("Admin Connectors")
@Security("bearerAuth", ["admin"])
export class AdminConnectorsController extends Controller {
  @Get()
  @SuccessResponse(200, "Connectors retrieved")
  @Response<ConnectorsErrorResponse>(500, "Server error")
  public async listConnectors(): Promise<ConnectorListResponse> {
    try {
      const connectors = await connectorService.listConnectors();
      return { success: true, connectors };
    } catch (error) {
      logger.error("Failed to list connectors", error);
      this.setStatus(500);
      throw new Error("Failed to list connectors");
    }
  }

  @Post()
  @SuccessResponse(201, "Connector created")
  @Response<ConnectorsErrorResponse>(400, "Invalid request")
  @Response<ConnectorsErrorResponse>(500, "Server error")
  public async createConnector(
    @Request() request: any,
    @Body() body: ConnectorCreateRequest
  ): Promise<ConnectorCreateResponse> {
    try {
      const parsed = connectorCreateSchema.safeParse(body);
      if (!parsed.success) {
        this.setStatus(400);
        throw new Error("Invalid connector payload");
      }

      const connector = await connectorService.createConnector(parsed.data, request?.user);
      this.setStatus(201);
      return { success: true, connector };
    } catch (error) {
      logger.error("Failed to create connector", error);
      this.setStatus(400);
      throw new Error("Failed to create connector");
    }
  }

  @Put("{id}")
  @SuccessResponse(200, "Connector updated")
  @Response<ConnectorsErrorResponse>(400, "Invalid request")
  @Response<ConnectorsErrorResponse>(404, "Connector not found")
  @Response<ConnectorsErrorResponse>(500, "Server error")
  public async updateConnector(
    @Path() id: string,
    @Request() request: any,
    @Body() body: ConnectorUpdateRequest
  ): Promise<ConnectorUpdateResponse> {
    try {
      const parsed = connectorUpdateSchema.safeParse(body);
      if (!parsed.success) {
        this.setStatus(400);
        throw new Error("Invalid connector payload");
      }

      const connector = await connectorService.updateConnector(id, parsed.data, request?.user);
      return { success: true, connector };
    } catch (error) {
      logger.error("Failed to update connector", error, { id });
      if (error instanceof Error && error.message.includes("not found")) {
        this.setStatus(404);
        throw new Error("Connector not found");
      }
      this.setStatus(400);
      throw new Error("Failed to update connector");
    }
  }

  @Post("{id}/test")
  @SuccessResponse(200, "Connection test executed")
  @Response<ConnectorsErrorResponse>(404, "Connector not found")
  @Response<ConnectorsErrorResponse>(500, "Server error")
  public async testConnector(
    @Path() id: string
  ): Promise<ConnectorTestResponse> {
    try {
      return await connectorService.testConnector(id);
    } catch (error) {
      logger.error("Failed to test connector", error, { id });
      if (error instanceof Error && error.message.includes("not found")) {
        this.setStatus(404);
        throw new Error("Connector not found");
      }
      this.setStatus(500);
      throw new Error("Failed to test connector");
    }
  }

  @Post("{id}/sync")
  @SuccessResponse(200, "Sync started")
  @Response<ConnectorsErrorResponse>(400, "Invalid request")
  @Response<ConnectorsErrorResponse>(404, "Connector not found")
  @Response<ConnectorsErrorResponse>(500, "Server error")
  public async syncConnector(
    @Path() id: string,
    @Body() body: ConnectorSyncRequest
  ): Promise<ConnectorSyncResponse> {
    try {
      const parsed = connectorSyncSchema.safeParse(body);
      if (!parsed.success) {
        this.setStatus(400);
        throw new Error("Invalid sync payload");
      }

      return await connectorService.syncConnector(id, parsed.data);
    } catch (error) {
      logger.error("Failed to start sync", error, { id });
      if (error instanceof Error && error.message.includes("not found")) {
        this.setStatus(404);
        throw new Error("Connector not found");
      }
      this.setStatus(400);
      throw new Error("Failed to start sync");
    }
  }

  @Get("{id}/runs")
  @SuccessResponse(200, "Sync runs retrieved")
  @Response<ConnectorsErrorResponse>(404, "Connector not found")
  @Response<ConnectorsErrorResponse>(500, "Server error")
  public async listSyncRuns(
    @Path() id: string
  ): Promise<ConnectorRunsResponse> {
    try {
      const runs = await connectorService.listSyncRuns(id);
      return {
        success: true,
        runs: runs.map(run => ({
          id: run.id,
          status: run.status,
          startedAt: run.startedAt.toISOString(),
          finishedAt: run.finishedAt?.toISOString(),
          stats: run.statsJson
        }))
      };
    } catch (error) {
      logger.error("Failed to list sync runs", error, { id });
      if (error instanceof Error && error.message.includes("not found")) {
        this.setStatus(404);
        throw new Error("Connector not found");
      }
      this.setStatus(500);
      throw new Error("Failed to list sync runs");
    }
  }
}
