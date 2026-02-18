/**
 * Producers Controller - tsoa implementation
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Put,
  Query,
  Response,
  Route,
  SuccessResponse,
  Tags
} from "tsoa";
import { z } from "zod";
import { getPool } from "../dbConfig";
import { createLogger } from "../utils/logger";

const logger = createLogger("ProducersController");

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUrlString = (value: string): boolean => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const ProducerCreateRequestSchema = z.object({
  producerName: z.string().min(1, "Producer name is required").max(200, "Producer name too long"),
  countryId: z.string().refine(val => uuidPattern.test(val), "Invalid country ID format").optional(),
  status: z.enum(["active", "inactive"]).optional(),
  websiteURL: z
    .string()
    .max(500, "URL too long")
    .refine(isValidUrlString, "Invalid URL format")
    .optional()
    .nullable()
});

const ProducerUpdateRequestSchema = z.object({
  producerName: z.string().min(1, "Producer name is required").max(200, "Producer name too long").optional(),
  countryId: z.string().refine(val => uuidPattern.test(val), "Invalid country ID format").optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
  websiteURL: z
    .string()
    .max(500, "URL too long")
    .refine(isValidUrlString, "Invalid URL format")
    .optional()
    .nullable()
});

const ProducersQuerySchema = z.object({
  page: z.string().optional().transform(val => (val ? Math.max(1, Number.parseInt(val)) || 1 : 1)),
  limit: z.string().optional().transform(val => (val ? Math.min(100, Math.max(1, Number.parseInt(val))) || 20 : 20)),
  search: z.string().optional(),
  sortBy: z.enum(["name", "createdAt", "updatedAt", "status"]).optional().default("name"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc")
});

interface ProducersErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

interface ProducerRow {
  id: string;
  producerName: string;
  status: string;
  countryId: string | null;
  countryName: string | null;
  websiteURL: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ProducersListResponse {
  success: true;
  data: {
    items: ProducerRow[];
    pagination: PaginationInfo;
  };
}

interface ProducersApiResponse {
  success: true;
  data: ProducerRow;
  message?: string;
}

function isValidUuid(id: string): boolean {
  return uuidPattern.test(id);
}

function isExpectedError(message: string): boolean {
  return [
    "Invalid query parameters",
    "Invalid producer data",
    "Producer with this name already exists",
    "Invalid producer ID format",
    "Producer not found",
    "No valid fields to update",
    "Cannot delete producer with existing products"
  ].includes(message);
}

@Route("producers")
@Tags("References")
export class ProducersController extends Controller {
  @Get("/")
  @SuccessResponse(200, "Producers list")
  @Response<ProducersErrorResponse>(400, "Invalid query parameters")
  @Response<ProducersErrorResponse>(500, "Server error")
  public async listProducers(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() search?: string,
    @Query() sortBy?: "name" | "createdAt" | "updatedAt" | "status",
    @Query() sortOrder?: "asc" | "desc"
  ): Promise<ProducersListResponse> {
    const validation = ProducersQuerySchema.safeParse({
      page: page?.toString(),
      limit: limit?.toString(),
      search,
      sortBy,
      sortOrder
    });

    if (!validation.success) {
      this.setStatus(400);
      throw new Error("Invalid query parameters");
    }

    const { page: qPage, limit: qLimit, search: qSearch, sortBy: qSortBy, sortOrder: qSortOrder } = validation.data;

    let whereClause = "WHERE 1=1";
    const queryParams: Array<string | number> = [];
    let paramIndex = 1;

    if (qSearch) {
      whereClause += ` AND LOWER(producerName) LIKE LOWER($${paramIndex})`;
      queryParams.push(`%${qSearch}%`);
      paramIndex++;
    }

    const sortColumn = {
      name: "producerName",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      status: "status"
    }[qSortBy] || "producerName";

    const orderClause = `ORDER BY ${sortColumn} ${qSortOrder.toUpperCase()}`;

    try {
      const countQuery = `SELECT COUNT(*) as total FROM producer ${whereClause}`;
      const countResult = await getPool().query(countQuery, queryParams);
      const total = Number.parseInt(countResult.rows[0].total);

      const offset = (qPage - 1) * qLimit;
      const totalPages = Math.ceil(total / qLimit);

      const dataQuery = `
        SELECT 
          producer.id,
          producer.producerName,
          producer.status,
          producer.countryId,
          c.countryname,
          producer.websiteURL,
          producer.createdAt,
          producer.updatedAt
        FROM producer 
        LEFT JOIN country c ON producer.countryId = c.id
        ${whereClause}
        ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(qLimit, offset);
      const result = await getPool().query(dataQuery, queryParams);

      const items = result.rows.map((row: { [key: string]: unknown }) => ({
        id: row.id as string,
        producerName: row.producername as string,
        status: row.status as string,
        countryId: (row.countryid as string) || null,
        countryName: (row.countryname as string) || null,
        websiteURL: (row.websiteurl as string) || null,
        createdAt: row.createdat as Date,
        updatedAt: row.updatedat as Date
      }));

      return {
        success: true,
        data: {
          items,
          pagination: {
            page: qPage,
            limit: qLimit,
            total,
            totalPages,
            hasNext: qPage < totalPages,
            hasPrev: qPage > 1
          }
        }
      };
    } catch (error) {
      logger.error("Failed to fetch producers", error);
      this.setStatus(500);
      throw new Error("Failed to fetch producers");
    }
  }

  @Post("/")
  @SuccessResponse(201, "Producer created")
  @Response<ProducersErrorResponse>(400, "Invalid producer data")
  @Response<ProducersErrorResponse>(409, "Producer already exists")
  @Response<ProducersErrorResponse>(500, "Server error")
  public async createProducer(
    @Body() requestBody: z.infer<typeof ProducerCreateRequestSchema>
  ): Promise<ProducersApiResponse | ProducersErrorResponse> {
    const validation = ProducerCreateRequestSchema.safeParse(requestBody);
    if (!validation.success) {
      this.setStatus(400);
      return {
        success: false,
        error: "Invalid producer data"
      };
    }

    try {
      const existingProducer = await getPool().query(
        "SELECT id FROM producer WHERE LOWER(producerName) = LOWER($1)",
        [validation.data.producerName]
      );

      if (existingProducer.rows.length > 0) {
        this.setStatus(409);
        return {
          success: false,
          error: "Producer with this name already exists"
        };
      }

      const insertResult = await getPool().query(
        `
        WITH inserted AS (
          INSERT INTO producer (
            producerName,
            status,
            countryId,
            websiteURL
          ) VALUES (
            $1,
            COALESCE($2, 'active'),
            $3,
            $4
          ) RETURNING id, producerName, status, countryId, websiteURL, createdAt, updatedAt
        )
        SELECT inserted.*, c.countryname
        FROM inserted
        LEFT JOIN country c ON inserted.countryId = c.id
      `,
        [
          validation.data.producerName,
          validation.data.status,
          validation.data.countryId,
          validation.data.websiteURL
        ]
      );

      const newProducer = insertResult.rows[0];

      this.setStatus(201);
      return {
        success: true,
        data: {
          id: newProducer.id,
          producerName: newProducer.producername,
          status: newProducer.status,
          countryId: newProducer.countryid,
          countryName: newProducer.countryname || null,
          websiteURL: newProducer.websiteurl,
          createdAt: newProducer.createdat,
          updatedAt: newProducer.updatedat
        },
        message: "Producer created successfully"
      };
    } catch (error) {
      if (error instanceof Error && isExpectedError(error.message)) {
        throw error;
      }
      logger.error("Failed to create producer", error);
      this.setStatus(500);
      throw new Error("Failed to create producer");
    }
  }

  @Get("/{id}")
  @SuccessResponse(200, "Producer details")
  @Response<ProducersErrorResponse>(400, "Invalid producer ID")
  @Response<ProducersErrorResponse>(404, "Producer not found")
  @Response<ProducersErrorResponse>(500, "Server error")
  public async getProducerById(@Path() id: string): Promise<ProducersApiResponse | ProducersErrorResponse> {
    if (!isValidUuid(id)) {
      this.setStatus(400);
      return {
        success: false,
        error: "Invalid producer ID format"
      };
    }

    try {
      const result = await getPool().query(
        `
        SELECT 
          producer.id,
          producer.producerName,
          producer.status,
          producer.countryId,
          c.countryname,
          producer.websiteURL,
          producer.createdAt,
          producer.updatedAt
        FROM producer 
        LEFT JOIN country c ON producer.countryId = c.id
        WHERE producer.id = $1
      `,
        [id]
      );

      if (result.rows.length === 0) {
        this.setStatus(404);
        return {
          success: false,
          error: "Producer not found"
        };
      }

      const producer = result.rows[0];

      return {
        success: true,
        data: {
          id: producer.id,
          producerName: producer.producername,
          status: producer.status,
          countryId: producer.countryid,
          countryName: producer.countryname || null,
          websiteURL: producer.websiteurl,
          createdAt: producer.createdat,
          updatedAt: producer.updatedat
        }
      };
    } catch (error) {
      if (error instanceof Error && isExpectedError(error.message)) {
        throw error;
      }
      logger.error("Failed to fetch producer", error, { id });
      this.setStatus(500);
      throw new Error("Failed to fetch producer");
    }
  }

  @Put("/{id}")
  @SuccessResponse(200, "Producer updated")
  @Response<ProducersErrorResponse>(400, "Invalid producer data")
  @Response<ProducersErrorResponse>(404, "Producer not found")
  @Response<ProducersErrorResponse>(409, "Producer already exists")
  @Response<ProducersErrorResponse>(500, "Server error")
  public async updateProducer(
    @Path() id: string,
    @Body() requestBody: z.infer<typeof ProducerUpdateRequestSchema>
  ): Promise<ProducersApiResponse | ProducersErrorResponse> {
    if (!isValidUuid(id)) {
      this.setStatus(400);
      return {
        success: false,
        error: "Invalid producer ID format"
      };
    }

    const validation = ProducerUpdateRequestSchema.safeParse(requestBody);
    if (!validation.success) {
      this.setStatus(400);
      return {
        success: false,
        error: "Invalid producer data"
      };
    }

    try {
      const existingResult = await getPool().query(
        "SELECT id FROM producer WHERE id = $1",
        [id]
      );
      if (existingResult.rows.length === 0) {
        this.setStatus(404);
        return {
          success: false,
          error: "Producer not found"
        };
      }

      if (validation.data.producerName) {
        const conflictResult = await getPool().query(
          "SELECT id FROM producer WHERE LOWER(producerName) = LOWER($1) AND id != $2",
          [validation.data.producerName, id]
        );

        if (conflictResult.rows.length > 0) {
          this.setStatus(409);
          return {
            success: false,
            error: "Producer with this name already exists"
          };
        }
      }

      const updateFields: string[] = [];
      const updateValues: Array<string | number | null> = [];
      let paramIndex = 1;

      const fieldMapping: Record<string, string> = {
        producerName: "producerName",
        countryId: "countryId",
        status: "status",
        websiteURL: "websiteURL"
      };

      Object.entries(validation.data).forEach(([key, value]) => {
        if (value !== undefined && fieldMapping[key]) {
          updateFields.push(`${fieldMapping[key]} = $${paramIndex}`);
          updateValues.push(value as string | number | null);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        this.setStatus(400);
        throw new Error("No valid fields to update");
      }

      updateFields.push("updatedAt = CURRENT_TIMESTAMP");
      updateValues.push(id);

      const updateQuery = `
        WITH updated AS (
          UPDATE producer 
          SET ${updateFields.join(", ")}
          WHERE id = $${paramIndex}
          RETURNING id, producerName, status, countryId, websiteURL, createdAt, updatedAt
        )
        SELECT updated.*, c.countryname
        FROM updated
        LEFT JOIN country c ON updated.countryId = c.id
      `;

      const result = await getPool().query(updateQuery, updateValues);
      const updatedProducer = result.rows[0];

      return {
        success: true,
        data: {
          id: updatedProducer.id,
          producerName: updatedProducer.producername,
          status: updatedProducer.status,
          countryId: updatedProducer.countryid,
          countryName: updatedProducer.countryname || null,
          websiteURL: updatedProducer.websiteurl,
          createdAt: updatedProducer.createdat,
          updatedAt: updatedProducer.updatedat
        },
        message: "Producer updated successfully"
      };
    } catch (error) {
      if (error instanceof Error && isExpectedError(error.message)) {
        throw error;
      }
      logger.error("Failed to update producer", error, { id });
      this.setStatus(500);
      throw new Error("Failed to update producer");
    }
  }

  @Delete("/{id}")
  @SuccessResponse(200, "Producer deleted")
  @Response<ProducersErrorResponse>(400, "Invalid producer ID")
  @Response<ProducersErrorResponse>(404, "Producer not found")
  @Response<ProducersErrorResponse>(409, "Cannot delete producer with existing products")
  @Response<ProducersErrorResponse>(500, "Server error")
  public async deleteProducer(@Path() id: string): Promise<{ success: true; message: string } | ProducersErrorResponse> {
    if (!isValidUuid(id)) {
      this.setStatus(400);
      return {
        success: false,
        error: "Invalid producer ID format"
      };
    }

    try {
      const existingResult = await getPool().query(
        "SELECT id, producerName FROM producer WHERE id = $1",
        [id]
      );
      if (existingResult.rows.length === 0) {
        this.setStatus(404);
        return {
          success: false,
          error: "Producer not found"
        };
      }

      const producerName = existingResult.rows[0].producername;

      const productCheck = await getPool().query(
        "SELECT id FROM product WHERE producerId = $1 LIMIT 1",
        [id]
      );
      if (productCheck.rows.length > 0) {
        this.setStatus(409);
        return {
          success: false,
          error: "Cannot delete producer with existing products"
        };
      }

      await getPool().query("DELETE FROM producer WHERE id = $1", [id]);

      return {
        success: true,
        message: `Producer '${producerName}' deleted successfully`
      };
    } catch (error) {
      if (error instanceof Error && isExpectedError(error.message)) {
        throw error;
      }
      logger.error("Failed to delete producer", error, { id });
      this.setStatus(500);
      throw new Error("Failed to delete producer");
    }
  }
}
