/**
 * Connector DTO validation schemas
 */

import { z } from "zod";

const baseUrlSchema = z.string().url();

export const connectorCreateSchema = z.object({
  type: z.literal("woocommerce"),
  baseUrl: baseUrlSchema,
  consumerKey: z.string().min(1),
  consumerSecret: z.string().min(1),
  syncProducts: z.boolean(),
  syncOrders: z.boolean()
});

export const connectorUpdateSchema = z.object({
  baseUrl: baseUrlSchema,
  consumerKey: z.string().min(1).optional(),
  consumerSecret: z.string().min(1).optional(),
  syncProducts: z.boolean(),
  syncOrders: z.boolean()
});

export const connectorSyncSchema = z.object({
  syncProducts: z.boolean(),
  syncOrders: z.boolean()
});
