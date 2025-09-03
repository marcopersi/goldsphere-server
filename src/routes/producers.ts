import { Router, Request, Response } from "express";
import { getPool } from "../dbConfig";
import { z } from 'zod';

const router = Router();

// Producer creation/update request schema 
const ProducerCreateRequestSchema = z.object({
  producerName: z.string().min(1, 'Producer name is required')
});

const ProducerUpdateRequestSchema = ProducerCreateRequestSchema.partial();

// Enhanced query parameters for producers
const ProducersQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? Math.max(1, parseInt(val)) || 1 : 1),
  limit: z.string().optional().transform(val => val ? Math.min(100, Math.max(1, parseInt(val))) || 20 : 20),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
});

/**
 * @swagger
 * /api/producers:
 *   get:
 *     summary: List all producers
 *     description: Retrieve a paginated list of precious metals producers/mints
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in producer names
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, country, established, createdAt, updatedAt]
 *           default: name
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *     responses:
 *       200:
 *         description: List of producers with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     producers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Producer'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    // Validate and parse query parameters
    const validatedQuery = ProducersQuerySchema.safeParse(req.query);
    if (!validatedQuery.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: validatedQuery.error.issues
      });
    }

    const { page, limit, search, sortBy, sortOrder } = validatedQuery.data;

    // Build dynamic query
    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND LOWER(producerName) LIKE LOWER($${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Map sortBy to actual column names
    const sortColumn = {
      name: 'producerName',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }[sortBy] || 'producerName';

    const orderClause = `ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM producer ${whereClause}`;
    const countResult = await getPool().query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get paginated results
    const dataQuery = `
      SELECT 
        id,
        producerName,
        createdAt,
        updatedAt
      FROM producer 
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const result = await getPool().query(dataQuery, queryParams);

    const producers = result.rows.map(row => ({
      id: row.id,
      producerName: row.producername,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    }));

    res.json({
      success: true,
      data: {
        producers,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error("Error fetching producers:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch producers", 
      details: (error as Error).message 
    });
  }
});

/**
 * @swagger
 * /api/producers:
 *   post:
 *     summary: Create a new producer
 *     description: Create a new precious metals producer/mint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - producerName
 *             properties:
 *               producerName:
 *                 type: string
 *                 description: Name of the producer/mint
 *               country:
 *                 type: string
 *                 description: Country where the producer is based
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: Producer's website URL
 *               description:
 *                 type: string
 *                 description: Description of the producer
 *               established:
 *                 type: integer
 *                 minimum: 1000
 *                 description: Year the producer was established
 *               logoUrl:
 *                 type: string
 *                 description: URL to the producer's logo
 *     responses:
 *       201:
 *         description: Producer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Producer'
 *                 message:
 *                   type: string
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = ProducerCreateRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid producer data",
        details: validationResult.error.issues
      });
    }

    const producerData = validationResult.data;

    // Check if producer name already exists
    const existingProducer = await getPool().query(
      "SELECT id FROM producer WHERE LOWER(producerName) = LOWER($1)",
      [producerData.producerName]
    );

    if (existingProducer.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Producer with this name already exists"
      });
    }

    // Insert new producer
    const insertResult = await getPool().query(`
      INSERT INTO producer (
        producerName
      ) VALUES (
        $1
      ) RETURNING id, producerName, createdAt, updatedAt
    `, [
      producerData.producerName
    ]);

    const newProducer = insertResult.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: newProducer.id,
        producerName: newProducer.producername,
        createdAt: newProducer.createdat,
        updatedAt: newProducer.updatedat
      },
      message: "Producer created successfully"
    });
  } catch (error) {
    console.error("Error creating producer:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to create producer", 
      details: (error as Error).message 
    });
  }
});

/**
 * @swagger
 * /api/producers/{id}:
 *   get:
 *     summary: Get producer by ID
 *     description: Retrieve detailed information for a specific producer
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Producer ID
 *     responses:
 *       200:
 *         description: Producer details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Producer'
 *       404:
 *         description: Producer not found
 */
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid producer ID format" 
      });
    }

    const result = await getPool().query(`
      SELECT 
        id,
        producerName,
        createdAt,
        updatedAt
      FROM producer 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Producer not found" 
      });
    }

    const producer = result.rows[0];

    res.json({
      success: true,
      data: {
        id: producer.id,
        producerName: producer.producername,
        createdAt: producer.createdat,
        updatedAt: producer.updatedat
      }
    });
  } catch (error) {
    console.error("Error fetching producer:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch producer", 
      details: (error as Error).message 
    });
  }
});

/**
 * @swagger
 * /api/producers/{id}:
 *   put:
 *     summary: Update producer
 *     description: Update an existing producer's information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Producer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               producerName:
 *                 type: string
 *               country:
 *                 type: string
 *               website:
 *                 type: string
 *                 format: uri
 *               description:
 *                 type: string
 *               established:
 *                 type: integer
 *               logoUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Producer updated successfully
 *       404:
 *         description: Producer not found
 */
router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid producer ID format" 
      });
    }

    // Validate request body
    const validationResult = ProducerUpdateRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid producer data",
        details: validationResult.error.issues
      });
    }

    const updateData = validationResult.data;

    // Check if producer exists
    const existingResult = await getPool().query("SELECT id FROM producer WHERE id = $1", [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Producer not found" 
      });
    }

    // Check for name conflicts if updating name
    if (updateData.producerName) {
      const conflictResult = await getPool().query(
        "SELECT id FROM producer WHERE LOWER(producerName) = LOWER($1) AND id != $2",
        [updateData.producerName, id]
      );

      if (conflictResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: "Producer with this name already exists"
        });
      }
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbField = key === 'producerName' ? 'producerName' : key;
        updateFields.push(`${dbField} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid fields to update"
      });
    }

    updateFields.push(`updatedAt = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE producer 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, producerName, createdAt, updatedAt
    `;

    const result = await getPool().query(updateQuery, updateValues);
    const updatedProducer = result.rows[0];

    res.json({
      success: true,
      data: {
        id: updatedProducer.id,
        producerName: updatedProducer.producername,
        createdAt: updatedProducer.createdat,
        updatedAt: updatedProducer.updatedat
      },
      message: "Producer updated successfully"
    });
  } catch (error) {
    console.error("Error updating producer:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to update producer", 
      details: (error as Error).message 
    });
  }
});

/**
 * @swagger
 * /api/producers/{id}:
 *   delete:
 *     summary: Delete producer
 *     description: Delete a producer. Returns an error if products reference this producer.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Producer ID
 *     responses:
 *       200:
 *         description: Producer deleted successfully
 *       404:
 *         description: Producer not found
 *       409:
 *         description: Cannot delete producer with existing products
 */
router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid producer ID format" 
      });
    }
    
    // Check if producer exists
    const existingResult = await getPool().query("SELECT id, producerName FROM producer WHERE id = $1", [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Producer not found" 
      });
    }
    
    const producerName = existingResult.rows[0].producername;
    
    // Check for existing products referencing this producer
    const productCheck = await getPool().query("SELECT id FROM product WHERE producerId = $1 LIMIT 1", [id]);
    if (productCheck.rows.length > 0) {
      return res.status(409).json({ 
        success: false,
        error: "Cannot delete producer with existing products" 
      });
    }
    
    // Delete the producer
    await getPool().query("DELETE FROM producer WHERE id = $1", [id]);
    
    res.json({
      success: true,
      message: `Producer '${producerName}' deleted successfully`
    });
  } catch (error) {
    console.error("Error deleting producer:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete producer", 
      details: (error as Error).message 
    });
  }
});

export default router;
