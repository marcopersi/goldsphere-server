/**
 * Order Status Controller - tsoa implementation
 */

import { Controller, Get, Response, Route, SuccessResponse, Tags } from "tsoa";
import { getPool } from "../dbConfig";
import { createLogger } from "../utils/logger";

const logger = createLogger("OrderStatusController");

interface OrderStatusErrorResponse {
  error: string;
  details?: string;
}

interface OrderStatusRow {
  orderstatus: string;
}

@Route("orderstatus")
@Tags("References")
export class OrderStatusController extends Controller {
  @Get("/")
  @SuccessResponse(200, "Order statuses")
  @Response<OrderStatusErrorResponse>(500, "Server error")
  public async listOrderStatus(): Promise<OrderStatusRow[]> {
    try {
      const result = await getPool().query(
        "SELECT enumlabel AS orderstatus FROM pg_enum WHERE enumtypid = 'orderstatus'::regtype;"
      );
      return result.rows;
    } catch (error) {
      logger.error("Failed to fetch order status", error);
      this.setStatus(500);
      throw new Error("Failed to fetch order status");
    }
  }
}
