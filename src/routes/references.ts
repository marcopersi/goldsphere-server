import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration
import { 
  Metal,
  ProductTypeEnum,
  CountryEnum
} from "@marcopersi/shared";

const router = Router();

// Producer interface for dynamic data
interface Producer {
  id: string;
  name: string;
}

// Response interfaces
interface ReferenceData {
  metals: Array<{ symbol: string; name: string }>;
  productTypes: Array<{ name: string }>;
  countries: Array<{ code: string; name: string }>;
  producers: Producer[];
  currencies: Array<{ isoCode2: string; isoCode3: string; isoNumericCode: number }>;
}

interface ReferenceDataResponse {
  success: boolean;
  data: ReferenceData;
}

/**
 * @swagger
 * /references:
 *   get:
 *     summary: Get all reference data
 *     tags: [References]
 *     security: []
 *     responses:
 *       200:
 *         description: Reference data including metals, product types, countries, producers, and currencies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     metals:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           symbol:
 *                             type: string
 *                             description: Chemical symbol (e.g. AU, AG, PT, PD)
 *                     productTypes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                     countries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           code:
 *                             type: string
 *                             description: ISO 3166-1 alpha-2 country code (lowercase)
 *                           name:
 *                             type: string
 *                     producers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                     currencies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           isoCode2:
 *                             type: string
 *                           isoCode3:
 *                             type: string
 *                           isoNumericCode:
 *                             type: number
 *       500:
 *         description: Server error
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    // Get producers from database (dynamic data)  
    const [producersResult, currenciesResult] = await Promise.all([
      pool.query("SELECT id, producerName as name FROM producer ORDER BY producerName"),
      pool.query("SELECT countryCode as isoCode2, isoCode3, isoNumericCode, currencyName FROM currency ORDER BY isoCode3")
    ]);

    // Use class-based enums for static reference data
    const referenceData: ReferenceData = {
      metals: Metal.values().map(metal => ({
        symbol: metal.symbol,
        name: metal.name
      })),
      productTypes: ProductTypeEnum.values().map(productType => ({
        name: productType.name
      })),
      countries: CountryEnum.values().map(country => ({
        code: country.code, // lowercase ISO code
        name: country.name
      })),
      producers: producersResult.rows as Producer[],
      currencies: currenciesResult.rows.map(row => ({
        isoCode2: row.isocode2,
        isoCode3: row.isocode3,
        isoNumericCode: row.isonumericcode
      }))
    };

    const response: ReferenceDataResponse = {
      success: true,
      data: referenceData
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching reference data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch reference data",
      details: (error as Error).message
    });
  }
});

// Issuing Countries Endpoints
router.get("/issuingCountries", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, issuingCountryName, isoCode2, createdAt, updatedAt FROM issuingCountry ORDER BY issuingCountryName");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching issuing countries:", error);
    res.status(500).json({ error: "Failed to fetch issuing countries", details: (error as Error).message });
  }
});

router.post("/issuingCountries", async (req: Request, res: Response) => {
  const { issuingCountryName,isoCode2 } = req.body;
  try {
    const result = await pool.query("INSERT INTO issuingCountry (issuingCountryName, isoCode2) VALUES ($1, $2) RETURNING *", [issuingCountryName, isoCode2]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding issuing country:", error);
    res.status(500).json({ error: "Failed to add issuing country", details: (error as Error).message });
  }
});

router.put("/issuingCountries/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { issuingCountryName } = req.body;
  const { isoCode2 } = req.body;
  try {
    const result = await pool.query("UPDATE issuingCountry SET issuingCountryName = $1, isoCode2 = $2 updatedAt = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *", [issuingCountryName, isoCode2, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating issuing country:", error);
    res.status(500).json({ error: "Failed to update issuing country", details: (error as Error).message });
  }
});

router.delete("/issuingCountries/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM issuingCountry WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting issuing country:", error);
    res.status(500).json({ error: "Failed to delete issuing country", details: (error as Error).message });
  }
});

router.get("/issuingCountries/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, issuingCountryName, isoCode2, createdAt, updatedAt FROM issuingCountry WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching issuing country:", error);
    res.status(500).json({ error: "Failed to fetch issuing country", details: (error as Error).message });
  }
});

// Metals Endpoints
router.get("/metals", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, metalName, createdAt, updatedAt FROM metal ORDER BY metalName");
    console.info("metals returned: ", result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching metals:", error);
    res.status(500).json({ error: "Failed to fetch metals", details: (error as Error).message });
  }
});

router.post("/metals", async (req: Request, res: Response) => {
  const { metalName } = req.body;
  try {
    const result = await pool.query("INSERT INTO metal (metalName) VALUES ($1) RETURNING *", [metalName]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding metal:", error);
    res.status(500).json({ error: "Failed to add metal", details: (error as Error).message });
  }
});

router.put("/metals/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { metalName } = req.body;
  try {
    const result = await pool.query("UPDATE metal SET metalName = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *", [metalName, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating metal:", error);
    res.status(500).json({ error: "Failed to update metal", details: (error as Error).message });
  }
});

router.delete("/metals/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM metal WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting metal:", error);
    res.status(500).json({ error: "Failed to delete metal", details: (error as Error).message });
  }
});

router.get("/metals/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, metalName, createdAt, updatedAt FROM metal WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching metal:", error);
    res.status(500).json({ error: "Failed to fetch metal", details: (error as Error).message });
  }
});

// Product Types Endpoints
router.get("/productTypes", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, productTypeName, createdAt, updatedAt FROM productType ORDER BY productTypeName");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching product types:", error);
    res.status(500).json({ error: "Failed to fetch product types", details: (error as Error).message });
  }
});

router.post("/productTypes", async (req: Request, res: Response) => {
  const { productTypeName } = req.body;
  try {
    const result = await pool.query("INSERT INTO productType (productTypeName) VALUES ($1) RETURNING *", [productTypeName]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding product type:", error);
    res.status(500).json({ error: "Failed to add product type", details: (error as Error).message });
  }
});

router.put("/productTypes/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { productTypeName } = req.body;
  try {
    const result = await pool.query("UPDATE productType SET productTypeName = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *", [productTypeName, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating product type:", error);
    res.status(500).json({ error: "Failed to update product type", details: (error as Error).message });
  }
});

router.delete("/productTypes/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM productType WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting product type:", error);
    res.status(500).json({ error: "Failed to delete product type", details: (error as Error).message });
  }
});

router.get("/productTypes/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, productTypeName, createdAt, updatedAt FROM productType WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching product type:", error);
    res.status(500).json({ error: "Failed to fetch product type", details: (error as Error).message });
  }
});

// producers Endpoints
router.get("/producers", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, producerName, createdAt, updatedAt FROM producer ORDER BY producerName");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching producers:", error);
    res.status(500).json({ error: "Failed to fetch producers", details: (error as Error).message });
  }
});

router.post("/producers", async (req: Request, res: Response) => {
  const { producerName } = req.body;
  try {
    const result = await pool.query("INSERT INTO producer (producerName) VALUES ($1) RETURNING *", [producerName]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding producer:", error);
    res.status(500).json({ error: "Failed to add producer", details: (error as Error).message });
  }
});

router.put("/producers/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { producerName } = req.body;
  try {
    const result = await pool.query("UPDATE producer SET producerName = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *", [producerName, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating producer:", error);
    res.status(500).json({ error: "Failed to update producer", details: (error as Error).message });
  }
});

router.delete("/producers/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM producer WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting producer:", error);
    res.status(500).json({ error: "Failed to delete producer", details: (error as Error).message });
  }
});

router.get("/producers/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, producerName, createdAt, updatedAt FROM producer WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching producer:", error);
    res.status(500).json({ error: "Failed to fetch producer", details: (error as Error).message });
  }
});


router.get("/orderstatus", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT enumlabel AS orderstatus FROM pg_enum WHERE enumtypid = 'orderstatus'::regtype;");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching orderstatus:", error);
    res.status(500).json({ error: "Failed to fetch orderstatus", details: (error as Error).message });
  }
});

router.get("/portfoliopositionstatus", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT enumlabel AS status FROM pg_enum WHERE enumtypid = 'portfoliopositionstatus'::regtype;");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching portfolio position status:", error);
    res.status(500).json({ error: "Failed to fetch portfolio position status", details: (error as Error).message });
  }
});

export default router;
