import { Router, Request, Response } from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";
import { getPool } from "../dbConfig";
import { UuidSchema } from "@marcopersi/shared";

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Upload image for product
router.post("/products/:id/image", upload.single("image"), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ 
        success: false,
        error: "No image file provided" 
      });
      return;
    }

    const { id } = req.params;
    
    // Validate product ID format
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      res.status(400).json({
        success: false,
        error: "Invalid product ID format"
      });
      return;
    }

    const { buffer, mimetype, originalname } = req.file;

    // Check if product exists
    const productExists = await getPool().query("SELECT id FROM product WHERE id = $1", [id]);
    if (productExists.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "Product not found"
      });
      return;
    }

    await getPool().query(
      "UPDATE product SET imageData = $1, imageContentType = $2, imageFilename = $3 WHERE id = $4",
      [buffer, mimetype, originalname, id]
    );
    res.json({ 
      success: true,
      message: "Image uploaded successfully",
      data: { filename: originalname, contentType: mimetype }
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to upload image",
      details: (error as Error).message
    });
  }
});

// Load images from filesystem
router.post("/products/load-images", async (req: Request, res: Response): Promise<void> => {
  const imagesDir = path.join(process.cwd(), "ddl", "images");
  
  if (!fs.existsSync(imagesDir)) {
    res.status(404).json({ error: "Images directory not found" });
    return;
  }

  const files = fs.readdirSync(imagesDir);
  const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
  
  let uploadedCount = 0;
  const results: Array<{filename: string, productName: string, status: string}> = [];

  // Manual mapping for known images
  const imageMapping: {[key: string]: string} = {
    "1-oz-American-Eagle.jpeg": "Silver Eagle Coin",
    "1-oz-Goldbarren-argor-heraeus.jpeg": "Gold Minted Bar 1oz Degussa", 
    "1-oz-Maple-Leaf.jpeg": "Gold Maple Leaf Coin",
    "1-oz-platinum-bar-royal-canadian-mint.png": "Platinum Cast Bar 50g Valcambi",
    "1-oz-silver-coin-us-mint.jpeg": "Silver Philharmonic Coin",
    "gold coin quarter ounce perth mint.jpg": "Gold Philharmonic Coin",
    "valcambi-10-ounce-bar.jpg": "Gold Cast Bar 100g Valcambi",
    "valcambi-100-gram-silver-bar.jpeg": "Silver Cast Bar 1kg Valcambi"
  };

  for (const file of imageFiles) {
    const filePath = path.join(imagesDir, file);
    const targetProductName = imageMapping[file];
    
    if (targetProductName) {
      try {
        const productResult = await getPool().query("SELECT id FROM product WHERE LOWER(productname) = LOWER($1)", [targetProductName]);
        
        if (productResult.rows.length > 0) {
          const productId = productResult.rows[0].id;
          const imageBuffer = fs.readFileSync(filePath);
          const mimeType = `image/${path.extname(file).slice(1)}`;
          
          await getPool().query(
            "UPDATE product SET imageData = $1, imageContentType = $2, imageFilename = $3 WHERE id = $4",
            [imageBuffer, mimeType, file, productId]
          );
          uploadedCount++;
          results.push({filename: file, productName: targetProductName, status: "uploaded"});
        } else {
          results.push({filename: file, productName: targetProductName, status: "product_not_found"});
        }
      } catch {
        results.push({filename: file, productName: targetProductName, status: "error"});
      }
    } else {
      results.push({filename: file, productName: "unknown", status: "no_mapping"});
    }
  }

  res.json({ 
    message: `Uploaded ${uploadedCount} images from filesystem`,
    results: results
  });
});

// Import products from CSV
router.post("/products/csv", upload.single("csv"), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ error: "No CSV file provided" });
    return;
  }

  const results: any[] = [];
  const bufferStream = new PassThrough();
  bufferStream.end(req.file.buffer);

  bufferStream
    .pipe(csv())
    .on("data", (data: any) => results.push(data))
    .on("end", async () => {
      let insertedCount = 0;

      for (const row of results) {
        try {
          await getPool().query(
            "INSERT INTO product (name, brand, description, metalType, weight, purity, price, available, imageFilename) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
            [row.name, row.brand, row.description, row.metalType, Number.parseFloat(row.weight), Number.parseFloat(row.purity), Number.parseFloat(row.price), row.available === "true", row.imageFilename]
          );
          insertedCount++;
        } catch {
          continue;
        }
      }

      res.json({ message: `Imported ${insertedCount} products from CSV` });
    });
});

export default router;
