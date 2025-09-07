import { Router, Request, Response } from "express";
import { getPool } from "../dbConfig"; // Import the shared pool configuration
import { 
  Metal,
  ProductTypeEnum,
  CountryEnum,
  Producer,
  Custodian,
  PaymentFrequency,
  CustodyServiceType
} from "@marcopersi/shared";

const router = Router();

// Response interfaces TODO must go to  shared package
interface ReferenceData {
  metals: Array<{ symbol: string; name: string }>;
  productTypes: Array<{ name: string }>;
  countries: Array<{ code: string; name: string }>;
  producers: Array<{ id: string; name: string }>;
  currencies: Array<{ id: string; isoCode2: string; isoCode3: string; isoNumericCode: number }>;
  custodians: Array<{ value: string; name: string }>;
  paymentFrequencies: Array<{ value: string; displayName: string; description: string }>;
  custodyServiceTypes: Array<{ value: string; displayName: string; description: string }>;
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
    // Get dynamic producers from database
    const producersResult = await getPool().query("SELECT id, producerName as name FROM producer ORDER BY producerName");
    // Get currencies from database with correct column names
    const currenciesResult = await getPool().query('SELECT id, isocode2, isocode3, isonumericcode FROM currency ORDER BY isocode3');

    // Combine database producers with enum producers for comprehensive list
    const databaseProducers = producersResult.rows.map(row => ({
      id: row.id,
      name: row.name
    }));

    const enumProducers = Producer.values().map(producer => ({
      id: `enum-${producer.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: producer.name
    }));

    // Merge and deduplicate by name
    const allProducers = [...databaseProducers];
    enumProducers.forEach(enumProducer => {
      if (!databaseProducers.some(dbProducer => dbProducer.name === enumProducer.name)) {
        allProducers.push(enumProducer);
      }
    });

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
      producers: allProducers,
      currencies: currenciesResult.rows.map(row => ({
        id: row.id,
        isoCode2: row.isocode2,
        isoCode3: row.isocode3,
        isoNumericCode: row.isonumericcode
      })),
      custodians: Custodian.values().map(custodian => ({
        value: custodian.value,
        name: custodian.name
      })),
      paymentFrequencies: PaymentFrequency.values().map(frequency => ({
        value: frequency.value,
        displayName: frequency.displayName,
        description: frequency.description
      })),
      custodyServiceTypes: CustodyServiceType.values().map(serviceType => ({
        value: serviceType.value,
        displayName: serviceType.displayName,
        description: serviceType.description
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

// Countries Endpoints
router.get("/countries", async (req: Request, res: Response) => {
  try {
    const result = await getPool().query("SELECT id, countryName, isoCode2, createdAt, updatedAt FROM country ORDER BY countryName");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ error: "Failed to fetch countries", details: (error as Error).message });
  }
});

router.post("/countries", async (req: Request, res: Response) => {
  const { countryName, isoCode2 } = req.body;
  try {
    const result = await getPool().query("INSERT INTO country (countryName, isoCode2) VALUES ($1, $2) RETURNING *", [countryName, isoCode2]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding country:", error);
    res.status(500).json({ error: "Failed to add country", details: (error as Error).message });
  }
});

router.put("/countries/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { countryName, isoCode2 } = req.body;
  try {
    const result = await getPool().query("UPDATE country SET countryName = $1, isoCode2 = $2, updatedAt = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *", [countryName, isoCode2, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating country:", error);
    res.status(500).json({ error: "Failed to update country", details: (error as Error).message });
  }
});

router.delete("/countries/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await getPool().query("DELETE FROM country WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting country:", error);
    res.status(500).json({ error: "Failed to delete country", details: (error as Error).message });
  }
});

router.get("/countries/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await getPool().query("SELECT id, countryName, isoCode2, createdAt, updatedAt FROM country WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching country:", error);
    res.status(500).json({ error: "Failed to fetch country", details: (error as Error).message });
  }
});

// Metals Endpoints
router.get("/metals", async (req: Request, res: Response) => {
  try {
    const result = await getPool().query("SELECT id, name, createdAt, updatedAt FROM metal ORDER BY name");
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
    const result = await getPool().query("INSERT INTO metal (name) VALUES ($1) RETURNING *", [metalName]);
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
    const result = await getPool().query("UPDATE metal SET name = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *", [metalName, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating metal:", error);
    res.status(500).json({ error: "Failed to update metal", details: (error as Error).message });
  }
});

router.delete("/metals/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await getPool().query("DELETE FROM metal WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting metal:", error);
    res.status(500).json({ error: "Failed to delete metal", details: (error as Error).message });
  }
});

router.get("/metals/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await getPool().query("SELECT id, name, createdAt, updatedAt FROM metal WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching metal:", error);
    res.status(500).json({ error: "Failed to fetch metal", details: (error as Error).message });
  }
});

// Product Types Endpoints
router.get("/productTypes", async (req: Request, res: Response) => {
  try {
    const result = await getPool().query("SELECT id, productTypeName, createdAt, updatedAt FROM productType ORDER BY productTypeName");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching product types:", error);
    res.status(500).json({ error: "Failed to fetch product types", details: (error as Error).message });
  }
});

router.post("/productTypes", async (req: Request, res: Response) => {
  const { productTypeName } = req.body;
  try {
    const result = await getPool().query("INSERT INTO productType (productTypeName) VALUES ($1) RETURNING *", [productTypeName]);
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
    const result = await getPool().query("UPDATE productType SET productTypeName = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *", [productTypeName, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating product type:", error);
    res.status(500).json({ error: "Failed to update product type", details: (error as Error).message });
  }
});

router.delete("/productTypes/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await getPool().query("DELETE FROM productType WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting product type:", error);
    res.status(500).json({ error: "Failed to delete product type", details: (error as Error).message });
  }
});

router.get("/productTypes/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await getPool().query("SELECT id, productTypeName, createdAt, updatedAt FROM productType WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching product type:", error);
    res.status(500).json({ error: "Failed to fetch product type", details: (error as Error).message });
  }
});

// producers Endpoints
router.get("/producers", async (req: Request, res: Response) => {
  try {
    const result = await getPool().query("SELECT id, producerName, createdAt, updatedAt FROM producer ORDER BY producerName");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching producers:", error);
    res.status(500).json({ error: "Failed to fetch producers", details: (error as Error).message });
  }
});

router.post("/producers", async (req: Request, res: Response) => {
  const { producerName } = req.body;
  try {
    const result = await getPool().query("INSERT INTO producer (producerName) VALUES ($1) RETURNING *", [producerName]);
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
    const result = await getPool().query("UPDATE producer SET producerName = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *", [producerName, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating producer:", error);
    res.status(500).json({ error: "Failed to update producer", details: (error as Error).message });
  }
});

router.delete("/producers/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await getPool().query("DELETE FROM producer WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting producer:", error);
    res.status(500).json({ error: "Failed to delete producer", details: (error as Error).message });
  }
});

router.get("/producers/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await getPool().query("SELECT id, producerName, createdAt, updatedAt FROM producer WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching producer:", error);
    res.status(500).json({ error: "Failed to fetch producer", details: (error as Error).message });
  }
});

// Currencies Endpoints
router.get("/currencies", async (req: Request, res: Response) => {
  try {
    const result = await getPool().query("SELECT id, isocode2, isocode3, isonumericcode, createdAt, updatedAt FROM currency ORDER BY isocode3");
    res.json(result.rows.map(row => ({
      id: row.id,
      isoCode2: row.isocode2,
      isoCode3: row.isocode3,
      isoNumericCode: row.isonumericcode,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    })));
  } catch (error) {
    console.error("Error fetching currencies:", error);
    res.status(500).json({ error: "Failed to fetch currencies", details: (error as Error).message });
  }
});

router.post("/currencies", async (req: Request, res: Response) => {
  const { isoCode2, isoCode3, isoNumericCode } = req.body;
  try {
    const result = await getPool().query("INSERT INTO currency (isocode2, isocode3, isonumericcode) VALUES ($1, $2, $3) RETURNING *", [isoCode2, isoCode3, isoNumericCode]);
    res.status(201).json({
      id: result.rows[0].id,
      isoCode2: result.rows[0].isocode2,
      isoCode3: result.rows[0].isocode3,
      isoNumericCode: result.rows[0].isonumericcode,
      createdAt: result.rows[0].createdat,
      updatedAt: result.rows[0].updatedat
    });
  } catch (error) {
    console.error("Error adding currency:", error);
    res.status(500).json({ error: "Failed to add currency", details: (error as Error).message });
  }
});

router.put("/currencies/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isoCode2, isoCode3, isoNumericCode } = req.body;
  try {
    const result = await getPool().query("UPDATE currency SET isocode2 = $1, isocode3 = $2, isonumericcode = $3, updatedat = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *", [isoCode2, isoCode3, isoNumericCode, id]);
    res.json({
      id: result.rows[0].id,
      isoCode2: result.rows[0].isocode2,
      isoCode3: result.rows[0].isocode3,
      isoNumericCode: result.rows[0].isonumericcode,
      createdAt: result.rows[0].createdat,
      updatedAt: result.rows[0].updatedat
    });
  } catch (error) {
    console.error("Error updating currency:", error);
    res.status(500).json({ error: "Failed to update currency", details: (error as Error).message });
  }
});

router.delete("/currencies/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await getPool().query("DELETE FROM currency WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting currency:", error);
    res.status(500).json({ error: "Failed to delete currency", details: (error as Error).message });
  }
});

router.get("/currencies/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await getPool().query("SELECT id, isocode2, isocode3, isonumericcode, createdAt, updatedAt FROM currency WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Currency not found" });
    }
    res.json({
      id: result.rows[0].id,
      isoCode2: result.rows[0].isocode2,
      isoCode3: result.rows[0].isocode3,
      isoNumericCode: result.rows[0].isonumericcode,
      createdAt: result.rows[0].createdat,
      updatedAt: result.rows[0].updatedat
    });
  } catch (error) {
    console.error("Error fetching currency:", error);
    res.status(500).json({ error: "Failed to fetch currency", details: (error as Error).message });
  }
});


router.get("/orderstatus", async (req: Request, res: Response) => {
  try {
    const result = await getPool().query("SELECT enumlabel AS orderstatus FROM pg_enum WHERE enumtypid = 'orderstatus'::regtype;");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching orderstatus:", error);
    res.status(500).json({ error: "Failed to fetch orderstatus", details: (error as Error).message });
  }
});

export default router;
