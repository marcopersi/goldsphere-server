/**
 * Admin Controller - tsoa implementation
 * 
 * Administrative endpoints for product image management
 * and bulk data imports.
 */

import {
  Controller,
  Post,
  Route,
  Path,
  Tags,
  SuccessResponse,
  Response,
  Security,
  UploadedFile
} from "tsoa";
import { getPool } from "../dbConfig";
import fs from "node:fs";
import path from "node:path";

// ============================================================================
// Response Interfaces
// ============================================================================

interface AdminErrorResponse {
  success: false;
  error: string;
  details?: string;
}

interface ImageUploadResponse {
  success: true;
  message: string;
  data: {
    filename: string;
    contentType: string;
  };
}

interface LoadImagesResult {
  filename: string;
  productName: string;
  status: string;
}

interface LoadImagesResponse {
  message: string;
  results: LoadImagesResult[];
}

interface CsvImportResponse {
  message: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

// Validate UUID format
function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================================================
// Controller
// ============================================================================

@Route("admin")
@Tags("Admin")
@Security("bearerAuth", ["admin"])
export class AdminController extends Controller {
  /**
   * Upload image for a product
   * @param id Product ID (UUID)
   * @param image Image file (max 5MB)
   */
  @Post("products/{id}/image")
  @SuccessResponse(200, "Image uploaded successfully")
  @Response<AdminErrorResponse>(400, "Invalid request")
  @Response<AdminErrorResponse>(401, "Unauthorized")
  @Response<AdminErrorResponse>(403, "Forbidden")
  @Response<AdminErrorResponse>(404, "Product not found")
  @Response<AdminErrorResponse>(500, "Server error")
  public async uploadProductImage(
    @Path() id: string,
    @UploadedFile() image: Express.Multer.File
  ): Promise<ImageUploadResponse> {
    if (!image) {
      this.setStatus(400);
      throw new Error("No image file provided");
    }

    // Validate product ID format
    if (!isValidUuid(id)) {
      this.setStatus(400);
      throw new Error("Invalid product ID format");
    }

    const { buffer, mimetype, originalname } = image;

    // Check if product exists
    const productExists = await getPool().query(
      "SELECT id FROM product WHERE id = $1",
      [id]
    );

    if (productExists.rows.length === 0) {
      this.setStatus(404);
      throw new Error("Product not found");
    }

    await getPool().query(
      "UPDATE product SET imageData = $1, imageContentType = $2, imageFilename = $3 WHERE id = $4",
      [buffer, mimetype, originalname, id]
    );

    return {
      success: true,
      message: "Image uploaded successfully",
      data: { filename: originalname, contentType: mimetype }
    };
  }

  /**
   * Load product images from filesystem (ddl/images directory)
   * Maps known image files to products by name.
   * Note: This uses a hardcoded mapping which should be refactored
   * to use a dynamic approach based on product metadata.
   */
  @Post("products/load-images")
  @SuccessResponse(200, "Images loaded")
  @Response<AdminErrorResponse>(401, "Unauthorized")
  @Response<AdminErrorResponse>(403, "Forbidden")
  @Response<AdminErrorResponse>(404, "Images directory not found")
  @Response<AdminErrorResponse>(500, "Server error")
  public async loadImagesFromFilesystem(): Promise<LoadImagesResponse> {
    const imagesDir = process.env.PRODUCT_IMAGES_DIR || path.join(process.cwd(), "initdb", "images");

    if (!fs.existsSync(imagesDir)) {
      this.setStatus(404);
      throw new Error("Images directory not found");
    }

    const files = fs.readdirSync(imagesDir);
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

    let uploadedCount = 0;
    const results: LoadImagesResult[] = [];

    const productRows = await getPool().query(
      "SELECT id, productname, imagefilename FROM product WHERE imagefilename IS NOT NULL AND imagefilename <> ''"
    );

    const productByFilename = new Map<string, { id: string; name: string }>();
    for (const row of productRows.rows) {
      productByFilename.set(String(row.imagefilename).toLowerCase(), { id: row.id, name: row.productname });
    }

    for (const file of imageFiles) {
      const product = productByFilename.get(file.toLowerCase());
      if (!product) {
        results.push({ filename: file, productName: "unknown", status: "no_mapping" });
        continue;
      }

      try {
        const filePath = path.join(imagesDir, file);
        const imageBuffer = fs.readFileSync(filePath);
        const mimeType = `image/${path.extname(file).slice(1)}`;

        await getPool().query(
          "UPDATE product SET imageData = $1, imageContentType = $2, imageFilename = $3 WHERE id = $4",
          [imageBuffer, mimeType, file, product.id]
        );
        uploadedCount++;
        results.push({ filename: file, productName: product.name, status: "uploaded" });
      } catch {
        results.push({ filename: file, productName: product.name, status: "error" });
      }
    }

    return {
      message: `Uploaded ${uploadedCount} images from filesystem`,
      results
    };
  }

  /**
   * Import products from CSV file
   * @param csv CSV file with product data
   */
  @Post("products/csv")
  @SuccessResponse(200, "Products imported")
  @Response<AdminErrorResponse>(400, "No CSV file provided")
  @Response<AdminErrorResponse>(401, "Unauthorized")
  @Response<AdminErrorResponse>(403, "Forbidden")
  @Response<AdminErrorResponse>(500, "Server error")
  public async importProductsCsv(
    @UploadedFile() csv: Express.Multer.File
  ): Promise<CsvImportResponse> {
    if (!csv) {
      this.setStatus(400);
      throw new Error("No CSV file provided");
    }

    // Parse CSV from buffer
    const csvContent = csv.buffer.toString("utf-8");
    const lines = csvContent.split("\n");
    
    if (lines.length < 2) {
      this.setStatus(400);
      throw new Error("CSV file is empty or has no data rows");
    }

    // Parse header
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    let insertedCount = 0;

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",").map(v => v.trim());
      const row: { [key: string]: string } = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      try {
        await getPool().query(
          "INSERT INTO product (name, brand, description, metalType, weight, purity, price, available, imageFilename) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
          [
            row.name,
            row.brand,
            row.description,
            row.metaltype,
            Number.parseFloat(row.weight) || 0,
            Number.parseFloat(row.purity) || 0,
            Number.parseFloat(row.price) || 0,
            row.available === "true",
            row.imagefilename
          ]
        );
        insertedCount++;
      } catch {
        // Skip rows that fail (e.g., duplicates)
        continue;
      }
    }

    return { message: `Imported ${insertedCount} products from CSV` };
  }
}
