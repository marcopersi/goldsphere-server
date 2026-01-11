import { Router, Request, Response } from "express";
import { getPool } from "../dbConfig";
import { 
  PositionSchema} from "@marcopersi/shared";

const router = Router();

// GET all positions with optional pagination and status filtering
router.get("/positions", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number.parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt((req.query.limit as string) || '20', 10)));
    const offset = (page - 1) * limit;
    
    // Status filter: 'active' (default), 'closed', or 'all'
    const statusFilter = (req.query.status as string) || 'active';
    
    let whereClause = '';
    let queryParams: any[] = [limit, offset];
    
    if (statusFilter === 'active') {
      whereClause = "WHERE status = 'active'";
    } else if (statusFilter === 'closed') {
      whereClause = "WHERE status = 'closed'";
    } else if (statusFilter !== 'all') {
      return res.status(400).json({ 
        error: "Invalid status filter. Must be 'active', 'closed', or 'all'" 
      });
    }
    // For 'all' status, whereClause remains empty

    const countResult = await getPool().query(`SELECT COUNT(*) as total FROM position ${whereClause}`);
    const total = Number.parseInt(countResult.rows[0]?.total || '0', 10);

    const result = await getPool().query(
      `SELECT * FROM position ${whereClause} ORDER BY createdat DESC LIMIT $1 OFFSET $2`,
      queryParams
    );

    const positions = await Promise.all(result.rows.map(row => mapDatabaseRowToPosition(row)));

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: offset + positions.length < total,
      hasPrev: page > 1
    };

    res.json({ 
      positions, 
      pagination,
      filters: {
        status: statusFilter
      }
    });
  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({ error: "Failed to fetch positions", details: (error as Error).message });
  }
});

// Helper function to fetch full product data for a position
const fetchProductForPosition = async (productId: string) => {
  const productQuery = `
    SELECT 
      product.id, 
      product.name AS productname, 
      productType.productTypeName AS producttype, 
      metal.name AS metalname, 
      product.weight AS fineweight, 
      product.weightUnit AS unitofmeasure, 
      product.purity,
      product.price,
      product.currency,
      producer.producerName AS producer,
      country.countryName AS country,
      product.year AS productyear,
      product.description,
      product.imageFilename AS imageurl,
      product.inStock,
      product.minimumOrderQuantity,
      product.createdat,
      product.updatedat
    FROM product 
    JOIN productType ON productType.id = product.productTypeId 
    JOIN metal ON metal.id = product.metalId 
    JOIN producer ON producer.id = product.producerId
    LEFT JOIN country ON country.id = product.countryId
    WHERE product.id = $1
  `;
  
  const result = await getPool().query(productQuery, [productId]);
  if (result.rows.length === 0) {
    throw new Error(`Product not found: ${productId}`);
  }
  
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.productname,
    type: row.producttype,
    metal: row.metalname,
    weight: Number.parseFloat(row.fineweight) || 0,
    weightUnit: row.unitofmeasure,
    purity: Number.parseFloat(row.purity) || 0.999,
    price: Number.parseFloat(row.price) || 0,
    currency: row.currency,
    producer: row.producer,
    country: row.country || null,
    year: row.productyear || undefined,
    description: row.description || '',
    imageUrl: row.imageurl ? `/api/products/${row.productid}/image` : null,
    inStock: row.instock ?? true,
    minimumOrderQuantity: row.minimumorderquantity || 1,
    createdAt: row.createdat || new Date(),
    updatedAt: row.updatedat || new Date()
  };
};

// Helper function to convert database row to Position object
const mapDatabaseRowToPosition = async (row: any) => {
  const product = await fetchProductForPosition(row.productid);
  
  // Fetch custody information if custodyServiceId exists
  let custody = null;
  if (row.custodyserviceid) {
    const custodyQuery = `
      SELECT 
        cs.id as custodyServiceId,
        cs.custodyServiceName,
        c.id as custodianId,
        c.custodianName,
        cs.fee,
        cs.paymentFrequency
      FROM custodyService cs
      JOIN custodian c ON cs.custodianId = c.id
      WHERE cs.id = $1
    `;
    const custodyResult = await getPool().query(custodyQuery, [row.custodyserviceid]);
    if (custodyResult.rows.length > 0) {
      const custodyRow = custodyResult.rows[0];
      custody = {
        custodyServiceId: custodyRow.custodyserviceid,
        custodyServiceName: custodyRow.custodyservicename,
        custodianId: custodyRow.custodianid,
        custodianName: custodyRow.custodianname,
        fee: Number.parseFloat(custodyRow.fee) || 0,
        paymentFrequency: custodyRow.paymentfrequency
      };
    }
  }
  
  return {
    id: row.id,
    userId: row.userid,
    productId: row.productid,
    portfolioId: row.portfolioid,
    product: product,
    purchaseDate: row.purchasedate || new Date(),
    purchasePrice: Number.parseFloat(row.purchaseprice) || 0,
    marketPrice: Number.parseFloat(row.marketprice) || 0,
    quantity: Number.parseFloat(row.quantity) || 0,
    custodyServiceId: row.custodyserviceid || null,
    custody: custody,
    status: row.status || 'active',
    notes: row.notes || '',
    createdAt: row.createdat || new Date(),
    updatedAt: row.updatedat || new Date()
  };
};



// GET positions by portfolio
/**
 * @swagger
 * /portfolios/{portfolioId}/positions:
 *   get:
 *     summary: Get positions by portfolio
 *     tags: [Positions]
 *     parameters:
 *       - in: path
 *         name: portfolioId
 *         required: true
 *         schema:
 *           type: string
 *         description: Portfolio identifier
 *     responses:
 *       200:
 *         description: List of positions for the specified portfolio with custody information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 positions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Position'
 *                 pagination:
 *                   type: object
 *                   description: Pagination information
 *       500:
 *         description: Internal server error
 */
router.get("/portfolios/:portfolioId/positions", async (req: Request, res: Response) => {
  try {
    const result = await getPool().query(`
      SELECT * FROM position 
      WHERE portfolioId = $1 
      ORDER BY createdat DESC
    `, [req.params.portfolioId]);
    
    const positions = await Promise.all(
      result.rows.map(row => mapDatabaseRowToPosition(row))
    );

    const pagination = {
      page: 1,
      limit: result.rows.length,
      total: result.rows.length,
      totalPages: Math.max(1, Math.ceil(result.rows.length / 10)),
      hasNext: false,
      hasPrev: false
    };

    res.json({
      positions,
      pagination
    });
  } catch (error) {
    console.error("Error fetching portfolio positions:", error);
    res.status(500).json({ error: "Failed to fetch portfolio positions", details: (error as Error).message });
  }
});




// GET position by id
/**
 * @swagger
 * /positions/{id}:
 *   get:
 *     summary: Get position by ID
 *     tags: [Positions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Position identifier
 *     responses:
 *       200:
 *         description: Position details with custody information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Position'
 *       404:
 *         description: Position not found
 *       500:
 *         description: Internal server error
 */
router.get("/positions/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await getPool().query("SELECT * FROM position WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Position not found" });
    }

    // Convert the result to a proper Position object
    const position = await mapDatabaseRowToPosition(result.rows[0]);
    
    // Validate the response
    const validatedPosition = PositionSchema.parse(position);
    
    res.json(validatedPosition);
  } catch (error) {
    console.error("Error fetching position:", error);
    res.status(500).json({ error: "Failed to fetch position", details: (error as Error).message });
  }
});

export default router;