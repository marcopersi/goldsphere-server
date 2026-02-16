/**
 * Product Controller - tsoa implementation
 * 
 * Handles all product-related endpoints including CRUD operations,
 * price queries, image management, and product validation.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Route,
  Path,
  Query,
  Body,
  Tags,
  SuccessResponse,
  Response,
  Security,
  Request
} from "tsoa";
import type { Request as ExpressRequest } from "express";
import { getPool } from "../dbConfig";
import { requireAuthenticatedUser } from "../utils/auditTrail";
import { ProductServiceFactory } from "../services/product";
import { Metal, ProductTypeEnum } from "@marcopersi/shared";
import {
  ProductManagementResponse,
  ProductPriceDTO,
  CreateProductByIdRequest,
  UpdateProductByIdRequest
} from "../services/product/types/ProductTypes";

// ============================================================================
// Response Interfaces
// ============================================================================

interface ProductApiResponse {
  id: string;
  name: string;
  type: string;
  productTypeId: string;
  metal: string;
  metalId: string;
  weight: number;
  weightUnit: "grams" | "troy_ounces" | "kilograms";
  purity: number;
  price: number;
  currency: string;
  producerId: string;
  producer: string;
  countryId: string | null;
  country: string;
  year?: number;
  description?: string;
  certifiedProvenance: boolean;
  imageUrl: string;
  inStock: boolean;
  stockQuantity: number;
  minimumOrderQuantity: number;
  premiumPercentage?: number;
  diameter?: number;
  thickness?: number;
  mintage?: number;
  certification?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductListApiResponse {
  success: boolean;
  data: {
    items: ProductApiResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message: string;
}

interface ProductSingleResponse {
  success: boolean;
  data: ProductApiResponse;
  message: string;
}

interface ProductPriceResponse {
  success: boolean;
  data: ProductPriceDTO;
}

interface ProductPricesResponse {
  success: boolean;
  data: ProductPriceDTO[];
  message: string;
}

interface ProductDeleteResponse {
  success: boolean;
  message: string;
}

interface ValidationResponse {
  success: boolean;
  message: string;
  data: {
    schemaType: string;
    validatedData: unknown;
  };
}

interface ProductErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

// ============================================================================
// Request Interfaces
// ============================================================================

interface CreateProductRequest {
  productName: string;
  /**
   * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ UUID format required
   */
  productTypeId: string;
  /**
   * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ UUID format required
   */
  metalId: string;
  /**
   * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ UUID format required
   */
  producerId: string;
  /**
   * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ UUID format required
   */
  countryId?: string;
  fineWeight: number;
  unitOfMeasure: string;
  /**
   * @minimum 0
   * @maximum 1
   */
  purity?: number;
  price: number;
  currency: string;
  productYear?: number;
  description?: string;
  imageFilename?: string;
  inStock?: boolean;
  stockQuantity?: number;
  minimumOrderQuantity?: number;
  premiumPercentage?: number;
  diameter?: number;
  thickness?: number;
  mintage?: number;
  certification?: string;
}

interface UpdateProductRequest {
  productName?: string;
  productTypeId?: string;
  metalId?: string;
  producerId?: string;
  countryId?: string;
  fineWeight?: number;
  unitOfMeasure?: string;
  purity?: number;
  price?: number;
  currency?: string;
  productYear?: number;
  description?: string;
  imageFilename?: string;
  inStock?: boolean;
  stockQuantity?: number;
  minimumOrderQuantity?: number;
  premiumPercentage?: number;
  diameter?: number;
  thickness?: number;
  mintage?: number;
  certification?: string;
}

interface BulkPriceRequest {
  productIds: string[];
}

interface ImageUploadRequest {
  imageBase64: string;
  contentType: "image/jpeg" | "image/jpg" | "image/png" | "image/gif" | "image/webp";
  filename: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getProductManagementService() {
  return ProductServiceFactory.createProductManagementService(getPool());
}

function generateImageUrl(productId: string, imageFilename: string | null | undefined): string {
  if (imageFilename) {
    return `/api/products/${productId}/image`;
  }
  return "";
}

function getEnumKey(enumInstance: Metal | ProductTypeEnum, enumClass: typeof Metal | typeof ProductTypeEnum): string {
  const match = Object.entries(enumClass).find(([_, val]) => val === enumInstance);
  return match ? match[0] : String(enumInstance);
}

function transformToApiResponse(product: ProductManagementResponse): ProductApiResponse {
  const metalKey = getEnumKey(product.metal, Metal);
  const productTypeKey = getEnumKey(product.productType, ProductTypeEnum);

  return {
    id: product.id,
    name: product.name,
    type: productTypeKey,
    productTypeId: product.productTypeId,
    metal: metalKey,
    metalId: product.metalId,
    weight: product.weight,
    weightUnit: product.weightUnit as "grams" | "troy_ounces" | "kilograms",
    purity: product.purity,
    price: product.price,
    currency: product.currency,
    producerId: product.producerId,
    producer: product.producer,
    countryId: product.countryId || null,
    country: (product.country || "").toLowerCase(),
    year: product.year ?? undefined,
    description: product.description ?? undefined,
    certifiedProvenance: product.certifiedProvenance,
    imageUrl: generateImageUrl(product.id, product.imageFilename),
    inStock: product.inStock ?? true,
    stockQuantity: product.stockQuantity,
    minimumOrderQuantity: product.minimumOrderQuantity,
    premiumPercentage: product.premiumPercentage ?? undefined,
    diameter: product.diameter ?? undefined,
    thickness: product.thickness ?? undefined,
    mintage: product.mintage ?? undefined,
    certification: product.certification ?? undefined,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}

// ============================================================================
// Controller
// ============================================================================

@Route("products")
@Tags("Products")
export class ProductController extends Controller {
  /**
   * Get all products with pagination and filters
   * @param page Page number (default: 1)
   * @param limit Items per page (default: 20, max: 100)
   * @param sortBy Sort field
   * @param sortOrder Sort order
   * @param search Search in name and description
   * @param metalId Filter by metal ID
   * @param productTypeId Filter by product type ID
   * @param producerId Filter by producer ID
   * @param inStock Filter by stock availability
   * @param minPrice Minimum price filter
   * @param maxPrice Maximum price filter
   */
  @Get()
  @SuccessResponse(200, "Paginated list of products")
  @Response<ProductErrorResponse>(400, "Invalid query parameters")
  @Response<ProductErrorResponse>(500, "Server error")
  public async getProducts(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() sortBy?: "name" | "price" | "createdAt",
    @Query() sortOrder?: "asc" | "desc",
    @Query() search?: string,
    @Query() metalId?: string,
    @Query() productTypeId?: string,
    @Query() producerId?: string,
    @Query() inStock?: boolean,
    @Query() minPrice?: number,
    @Query() maxPrice?: number
  ): Promise<ProductListApiResponse | ProductErrorResponse> {
    try {
      const filter: Record<string, unknown> = {};
      if (search) filter.search = search;
      if (metalId) filter.metalId = metalId;
      if (productTypeId) filter.productTypeId = productTypeId;
      if (producerId) filter.producerId = producerId;
      if (inStock !== undefined) filter.inStock = inStock;
      if (minPrice !== undefined) filter.minPrice = minPrice;
      if (maxPrice !== undefined) filter.maxPrice = maxPrice;

      const options = {
        page,
        limit,
        sortBy,
        sortOrder,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      };

      const result = await getProductManagementService().listProducts(options);
      const transformedItems = result.items.map(transformToApiResponse);

      return {
        success: true,
        data: {
          items: transformedItems,
          pagination: {
            page: result.pagination.page,
            limit: result.pagination.limit,
            total: result.pagination.total,
            totalPages: result.pagination.totalPages
          }
        },
        message: `Found ${result.pagination.total} products`
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (
        errorMessage.includes("Page number") ||
        errorMessage.includes("Limit must") ||
        errorMessage.includes("price") ||
        errorMessage.includes("Minimum price")
      ) {
        this.setStatus(400);
        return { success: false, error: errorMessage };
      }
      this.setStatus(500);
      return { success: false, error: "Failed to list products", details: errorMessage };
    }
  }

  /**
   * Get product by ID
   * @param id Product ID
   */
  @Get("{id}")
  @SuccessResponse(200, "Product details")
  @Response<ProductErrorResponse>(400, "Invalid product ID format")
  @Response<ProductErrorResponse>(404, "Product not found")
  @Response<ProductErrorResponse>(500, "Server error")
  public async getProductById(@Path() id: string): Promise<ProductSingleResponse | ProductErrorResponse> {
    try {
      const product = await getProductManagementService().getProductById(id);

      if (!product) {
        this.setStatus(404);
        return { success: false, error: "Product not found" };
      }

      return {
        success: true,
        data: transformToApiResponse(product),
        message: "Product retrieved successfully"
      };
    } catch (error) {
      const errorMessage = (error as Error).message;

      if (errorMessage.includes("Invalid product ID format") || errorMessage.includes("Valid product ID is required")) {
        this.setStatus(400);
        return { success: false, error: "Invalid product ID format" };
      }

      this.setStatus(500);
      return { success: false, error: "Failed to fetch product", details: errorMessage };
    }
  }

  /**
   * Get product price by ID
   * @param id Product ID
   */
  @Get("price/{id}")
  @SuccessResponse(200, "Product price")
  @Response<ProductErrorResponse>(400, "Invalid product ID format")
  @Response<ProductErrorResponse>(404, "Product not found")
  @Response<ProductErrorResponse>(500, "Server error")
  public async getProductPrice(@Path() id: string): Promise<ProductPriceResponse | ProductErrorResponse> {
    try {
      const priceData = await getProductManagementService().getProductPrice(id);

      if (!priceData) {
        this.setStatus(404);
        return { success: false, error: "Product not found" };
      }

      return {
        success: true,
        data: priceData
      };
    } catch (error) {
      const errorMessage = (error as Error).message;

      if (errorMessage.includes("Invalid product ID format") || errorMessage.includes("Valid product ID is required")) {
        this.setStatus(400);
        return { success: false, error: "Invalid product ID format" };
      }

      this.setStatus(500);
      return { success: false, error: "Failed to fetch product price", details: errorMessage };
    }
  }

  /**
   * Get prices for multiple products
   * @param requestBody Array of product IDs
   */
  @Post("prices")
  @SuccessResponse(200, "Product prices")
  @Response<ProductErrorResponse>(400, "Invalid product IDs")
  @Response<ProductErrorResponse>(500, "Server error")
  public async getProductPrices(@Body() requestBody: BulkPriceRequest): Promise<ProductPricesResponse | ProductErrorResponse> {
    try {
      const { productIds } = requestBody;

      if (!Array.isArray(productIds) || productIds.length === 0) {
        this.setStatus(400);
        return { success: false, error: "Invalid product IDs - must be non-empty array" };
      }

      const priceArray = await getProductManagementService().getProductPrices(productIds);

      return {
        success: true,
        data: priceArray,
        message: `Retrieved prices for ${priceArray.length} products`
      };
    } catch (error) {
      const errorMessage = (error as Error).message;

      if (
        errorMessage.includes("Maximum 100 product IDs") ||
        errorMessage.includes("Invalid product ID format") ||
        errorMessage.includes("Product IDs array is required")
      ) {
        this.setStatus(400);
        return { success: false, error: errorMessage };
      }

      this.setStatus(500);
      return { success: false, error: "Failed to fetch product prices", details: errorMessage };
    }
  }

  /**
   * Create a new product
   * @param requestBody Product data
   */
  @Post()
  @Security("bearerAuth")
  @SuccessResponse(201, "Product created")
  @Response<ProductErrorResponse>(400, "Invalid product data")
  @Response<ProductErrorResponse>(401, "Unauthorized")
  @Response<ProductErrorResponse>(500, "Server error")
  public async createProduct(
    @Body() requestBody: CreateProductRequest,
    @Request() request: ExpressRequest
  ): Promise<ProductSingleResponse | ProductErrorResponse> {
    try {
      const authenticatedUser = requireAuthenticatedUser(request);
      const createRequest: CreateProductByIdRequest = {
        name: requestBody.productName,
        productTypeId: requestBody.productTypeId,
        metalId: requestBody.metalId,
        producerId: requestBody.producerId,
        countryId: requestBody.countryId,
        weight: requestBody.fineWeight,
        weightUnit: requestBody.unitOfMeasure,
        purity: requestBody.purity ?? 0.999,
        price: requestBody.price,
        currency: requestBody.currency,
        year: requestBody.productYear,
        description: requestBody.description,
        imageFilename: requestBody.imageFilename,
        inStock: requestBody.inStock ?? true,
        stockQuantity: requestBody.stockQuantity,
        minimumOrderQuantity: requestBody.minimumOrderQuantity,
        premiumPercentage: requestBody.premiumPercentage,
        diameter: requestBody.diameter,
        thickness: requestBody.thickness,
        mintage: requestBody.mintage,
        certification: requestBody.certification
      };

      const createdProduct = await getProductManagementService().createProductById(createRequest, authenticatedUser);

      this.setStatus(201);
      return {
        success: true,
        data: transformToApiResponse(createdProduct),
        message: "Product created successfully"
      };
    } catch (error) {
      const errorMessage = (error as Error).message;

      // PostgreSQL foreign key violation
      if (errorMessage.includes("foreign key constraint") || errorMessage.includes("violates foreign key")) {
        this.setStatus(400);
        return { success: false, error: "One or more referenced entities not found" };
      }

      if (errorMessage.includes("Invalid") && (errorMessage.includes("metalId") || errorMessage.includes("metal ID"))) {
        this.setStatus(400);
        return { success: false, error: "Invalid metal ID" };
      }

      if (errorMessage.includes("Invalid") && (errorMessage.includes("productTypeId") || errorMessage.includes("productType ID"))) {
        this.setStatus(400);
        return { success: false, error: "Invalid product type ID" };
      }

      if (errorMessage.includes("Invalid") && (errorMessage.includes("producerId") || errorMessage.includes("producer ID"))) {
        this.setStatus(400);
        return { success: false, error: "Invalid producer ID" };
      }

      if (errorMessage.includes("Invalid") && (errorMessage.includes("countryId") || errorMessage.includes("country ID"))) {
        this.setStatus(400);
        return { success: false, error: "Invalid country ID" };
      }

      this.setStatus(500);
      return { success: false, error: "Failed to create product", details: errorMessage };
    }
  }

  /**
   * Update product by ID
   * @param id Product ID
   * @param requestBody Updated product data
   */
  @Put("{id}")
  @Security("bearerAuth")
  @SuccessResponse(200, "Product updated")
  @Response<ProductErrorResponse>(400, "Invalid product data")
  @Response<ProductErrorResponse>(401, "Unauthorized")
  @Response<ProductErrorResponse>(404, "Product not found")
  @Response<ProductErrorResponse>(500, "Server error")
  public async updateProduct(
    @Path() id: string,
    @Body() requestBody: UpdateProductRequest,
    @Request() request: ExpressRequest
  ): Promise<ProductSingleResponse | ProductErrorResponse> {
    try {
      const authenticatedUser = requireAuthenticatedUser(request);
      // Validate update data
      if (requestBody.price !== undefined && requestBody.price < 0) {
        this.setStatus(400);
        return { success: false, error: "Price cannot be negative" };
      }
      
      if (requestBody.fineWeight !== undefined && requestBody.fineWeight <= 0) {
        this.setStatus(400);
        return { success: false, error: "Weight must be greater than 0" };
      }
      
      if (requestBody.purity !== undefined && (requestBody.purity < 0 || requestBody.purity > 1)) {
        this.setStatus(400);
        return { success: false, error: "Purity must be between 0 and 1" };
      }
      
      const updateRequest: UpdateProductByIdRequest = {
        name: requestBody.productName,
        productTypeId: requestBody.productTypeId,
        metalId: requestBody.metalId,
        producerId: requestBody.producerId,
        countryId: requestBody.countryId,
        weight: requestBody.fineWeight,
        weightUnit: requestBody.unitOfMeasure,
        purity: requestBody.purity,
        price: requestBody.price,
        currency: requestBody.currency,
        year: requestBody.productYear,
        description: requestBody.description,
        imageFilename: requestBody.imageFilename,
        inStock: requestBody.inStock,
        stockQuantity: requestBody.stockQuantity,
        minimumOrderQuantity: requestBody.minimumOrderQuantity,
        premiumPercentage: requestBody.premiumPercentage,
        diameter: requestBody.diameter,
        thickness: requestBody.thickness,
        mintage: requestBody.mintage,
        certification: requestBody.certification
      };

      // Remove undefined values
      const cleanRequest = Object.fromEntries(
        Object.entries(updateRequest).filter(([_, v]) => v !== undefined)
      ) as UpdateProductByIdRequest;

      const updatedProduct = await getProductManagementService().updateProductById(id, cleanRequest, authenticatedUser);

      return {
        success: true,
        data: transformToApiResponse(updatedProduct),
        message: "Product updated successfully"
      };
    } catch (error) {
      const errorMessage = (error as Error).message;

      if (errorMessage.includes("Invalid product ID format") || errorMessage.includes("Valid product ID is required")) {
        this.setStatus(400);
        return { success: false, error: "Invalid product ID format" };
      }

      if (errorMessage.includes("not found")) {
        this.setStatus(404);
        return { success: false, error: "Product not found" };
      }

      if (
        errorMessage.includes("Invalid") &&
        (errorMessage.includes("metalId") ||
          errorMessage.includes("productTypeId") ||
          errorMessage.includes("producerId") ||
          errorMessage.includes("countryId"))
      ) {
        this.setStatus(400);
        return { success: false, error: "One or more referenced entities not found" };
      }

      if (errorMessage.includes("No fields to update")) {
        this.setStatus(400);
        return { success: false, error: "No fields to update" };
      }

      this.setStatus(500);
      return { success: false, error: "Failed to update product", details: errorMessage };
    }
  }

  /**
   * Delete product by ID
   * @param id Product ID
   */
  @Delete("{id}")
  @Security("bearerAuth")
  @SuccessResponse(200, "Product deleted")
  @Response<ProductErrorResponse>(400, "Invalid product ID format")
  @Response<ProductErrorResponse>(401, "Unauthorized")
  @Response<ProductErrorResponse>(404, "Product not found")
  @Response<ProductErrorResponse>(409, "Cannot delete product with existing orders")
  @Response<ProductErrorResponse>(500, "Server error")
  public async deleteProduct(
    @Path() id: string,
    @Request() request: ExpressRequest
  ): Promise<ProductDeleteResponse | ProductErrorResponse> {
    try {
      const authenticatedUser = requireAuthenticatedUser(request);
      // Get product name before deletion for response message
      const product = await getProductManagementService().getProductById(id);

      if (!product) {
        this.setStatus(404);
        return { success: false, error: "Product not found" };
      }

      const productName = product.name;

      // Delete the product
      await getProductManagementService().deleteProduct(id, authenticatedUser);

      return {
        success: true,
        message: `Product '${productName}' deleted successfully`
      };
    } catch (error) {
      const errorMessage = (error as Error).message;

      if (errorMessage.includes("Invalid product ID format") || errorMessage.includes("Valid product ID is required")) {
        this.setStatus(400);
        return { success: false, error: "Invalid product ID format" };
      }

      if (errorMessage.includes("Cannot delete product with existing orders")) {
        this.setStatus(409);
        return { success: false, error: "Cannot delete product with existing orders" };
      }

      if (errorMessage.includes("not found")) {
        this.setStatus(404);
        return { success: false, error: "Product not found" };
      }

      if ((error as { success?: boolean }).success === false) {
        return error as ProductErrorResponse;
      }

      this.setStatus(500);
      return { success: false, error: "Failed to delete product", details: errorMessage };
    }
  }

  /**
   * Validate product data against schemas
   * @param requestBody Product data to validate
   */
  @Post("validate")
  @SuccessResponse(200, "Product data is valid")
  @Response<ProductErrorResponse>(400, "Validation failed")
  @Response<ProductErrorResponse>(500, "Server error")
  public async validateProduct(@Body() requestBody: CreateProductRequest): Promise<ValidationResponse | ProductErrorResponse> {
    // Additional UUID validation beyond tsoa
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(requestBody.productTypeId)) {
      this.setStatus(400);
      return {
        success: false,
        error: "Validation failed",
        details: "productTypeId must be a valid UUID"
      };
    }
    
    if (!uuidRegex.test(requestBody.metalId)) {
      this.setStatus(400);
      return {
        success: false,
        error: "Validation failed",
        details: "metalId must be a valid UUID"
      };
    }
    
    if (!uuidRegex.test(requestBody.producerId)) {
      this.setStatus(400);
      return {
        success: false,
        error: "Validation failed",
        details: "producerId must be a valid UUID"
      };
    }
    
    if (requestBody.countryId && !uuidRegex.test(requestBody.countryId)) {
      this.setStatus(400);
      return {
        success: false,
        error: "Validation failed",
        details: "countryId must be a valid UUID"
      };
    }
    
    // Validate purity range
    if (requestBody.purity !== undefined && (requestBody.purity < 0 || requestBody.purity > 1)) {
      this.setStatus(400);
      return {
        success: false,
        error: "Validation failed",
        details: "purity must be between 0 and 1"
      };
    }
    
    // If we reach here, tsoa validation passed
    return {
      success: true,
      message: "Product data is valid according to ProductCreateRequest schema",
      data: {
        schemaType: "ProductCreateRequest",
        validatedData: requestBody
      }
    };
  }

  /**
   * Get product image
   * @param id Product ID
   */
  @Get("{id}/image")
  @SuccessResponse(200, "Image retrieved successfully")
  @Response(404, "Product or image not found")
  @Response(500, "Server error")
  public async getProductImage(
    @Path() id: string
  ): Promise<Buffer> {
    const imageData = await getProductManagementService().getProductImage(id);

    if (!imageData) {
      const error: any = new Error("Image not found");
      error.status = 404;
      throw error;
    }

    // Set headers for binary image response
    this.setHeader('Content-Type', imageData.contentType);
    this.setHeader('Content-Disposition', `inline; filename="${imageData.filename}"`);
    this.setHeader('Content-Length', imageData.data.length.toString());
    
    // Return raw binary data
    this.setStatus(200);
    return imageData.data;
  }

  /**
   * Upload product image
   * @param id Product ID
   * @param requestBody Image data
   */
  @Post("{id}/image")
  @Security("bearerAuth")
  @SuccessResponse(200, "Image uploaded successfully")
  @Response<ProductErrorResponse>(400, "Invalid image data")
  @Response<ProductErrorResponse>(401, "Unauthorized")
  @Response<ProductErrorResponse>(404, "Product not found")
  @Response<ProductErrorResponse>(500, "Server error")
  public async uploadProductImage(
    @Path() id: string,
    @Body() requestBody: ImageUploadRequest,
    @Request() request: ExpressRequest
  ): Promise<ProductDeleteResponse | ProductErrorResponse> {
    try {
      const authenticatedUser = requireAuthenticatedUser(request);
      const { imageBase64, contentType, filename } = requestBody;

      if (!imageBase64 || !contentType || !filename) {
        this.setStatus(400);
        return {
          success: false,
          error: "Missing required fields",
          details: "imageBase64, contentType, and filename are required"
        };
      }

      await getProductManagementService().uploadImage(id, imageBase64, contentType, filename, authenticatedUser);

      return {
        success: true,
        message: "Image uploaded successfully"
      };
    } catch (error) {
      const errorMessage = (error as Error).message;

      if (errorMessage.includes("not found")) {
        this.setStatus(404);
        return { success: false, error: "Product not found", details: errorMessage };
      }

      if (errorMessage.includes("Invalid") || errorMessage.includes("exceeds")) {
        this.setStatus(400);
        return { success: false, error: "Invalid image data", details: errorMessage };
      }

      this.setStatus(500);
      return { success: false, error: "Failed to upload image", details: errorMessage };
    }
  }
}
