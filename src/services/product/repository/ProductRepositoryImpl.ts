/**
 * Product Repository Implementation
 * 
 * Handles database operations for product management using DI
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Metal, ProductTypeEnum } from '@marcopersi/shared';
import { IProductRepository } from './IProductRepository';
import { CreateProductRequest, UpdateProductRequest, ProductManagementResponse, ProductLookupIds, ProductImageUpload, ProductListOptions, ProductListResponse, CreateProductByIdRequest, UpdateProductByIdRequest } from '../types/ProductTypes';
import { AuditTrailUser, getAuditUser } from '../../../utils/auditTrail';

export class ProductRepositoryImpl implements IProductRepository {
  constructor(private readonly pool: Pool) {}
  
  async findLookupIds(productType: string, metal: string, producer: string, country?: string): Promise<ProductLookupIds | null> {
    
    try {
      // Get product type ID
      const productTypeQuery = 'SELECT id FROM producttype WHERE producttypename = $1';
      const productTypeResult = await this.pool.query(productTypeQuery, [productType]);
      
      if (productTypeResult.rows.length === 0) {
        throw new Error(`Product type '${productType}' not found`);
      }
      
      // Get metal ID
      const metalQuery = 'SELECT id FROM metal WHERE name = $1';
      const metalResult = await this.pool.query(metalQuery, [metal]);
      
      if (metalResult.rows.length === 0) {
        throw new Error(`Metal '${metal}' not found`);
      }
      
      // Get producer ID
      const producerQuery = 'SELECT id FROM producer WHERE producername = $1';
      const producerResult = await this.pool.query(producerQuery, [producer]);
      
      if (producerResult.rows.length === 0) {
        throw new Error(`Producer '${producer}' not found`);
      }
      
      let countryId: string | undefined;
      if (country) {
        const countryQuery = 'SELECT id FROM country WHERE countryname = $1';
        const countryResult = await this.pool.query(countryQuery, [country]);
        
        if (countryResult.rows.length === 0) {
          throw new Error(`Country '${country}' not found`);
        }
        countryId = countryResult.rows[0].id;
      }
      
      return {
        productTypeId: productTypeResult.rows[0].id,
        metalId: metalResult.rows[0].id,
        producerId: producerResult.rows[0].id,
        countryId
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to find lookup IDs');
    }
  }

  async create(data: CreateProductRequest, authenticatedUser: AuditTrailUser): Promise<ProductManagementResponse> {
    const id = uuidv4();
    const now = new Date();
    const auditUser = getAuditUser(authenticatedUser);
    
    try {
      // Get lookup IDs for foreign keys
      const lookupIds = await this.findLookupIds(
        data.productType, 
        data.metal, 
        data.producer, 
        data.country
      );
      
      if (!lookupIds) {
        throw new Error('Failed to resolve product references');
      }
      
      const query = `
        INSERT INTO product (
          id, name, producttypeid, metalid, countryid, producerid,
          weight, weightunit, purity, price, currency, year, description,
          imageurl, imagefilename, instock, stockquantity, minimumorderquantity,
          premiumpercentage, createdat, updatedat, createdBy, updatedBy
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *
      `;
      
      const values = [
        id,
        data.name,
        lookupIds.productTypeId,
        lookupIds.metalId,
        lookupIds.countryId || null,
        lookupIds.producerId,
        data.weight,
        data.weightUnit,
        data.purity,
        data.price,
        data.currency,
        data.year || null,
        data.description || null,
        data.imageUrl || '',
        data.imageFilename || null,
        data.inStock !== false, // Default to true
        data.stockQuantity || 0,
        data.minimumOrderQuantity || 1,
        data.premiumPercentage || null,
        now,
        now,
        auditUser.id,
        auditUser.id
      ];
      
      const result = await this.pool.query(query, values);
      return this.mapRowToProductResponse(result.rows[0]);
      
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to create product');
    }
  }
  
  async findById(id: string): Promise<ProductManagementResponse | null> {
    const query = `
      SELECT 
        p.*,
        pt.producttypename,
        m.name as metal_name,
        pr.producername,
        c.countryname
      FROM product p
      LEFT JOIN producttype pt ON p.producttypeid = pt.id
      LEFT JOIN metal m ON p.metalid = m.id  
      LEFT JOIN producer pr ON p.producerid = pr.id
      LEFT JOIN country c ON p.countryid = c.id
      WHERE p.id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToProductResponse(result.rows[0]);
  }
  
  async findAll(options?: ProductListOptions): Promise<ProductListResponse> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    const filter = options?.filter || {};
    
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (filter.search) {
      whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      queryParams.push(`%${filter.search}%`);
      paramIndex++;
    }
    
    if (filter.metalId) {
      whereConditions.push(`p.metalid = $${paramIndex}`);
      queryParams.push(filter.metalId);
      paramIndex++;
    }
    
    if (filter.productTypeId) {
      whereConditions.push(`p.producttypeid = $${paramIndex}`);
      queryParams.push(filter.productTypeId);
      paramIndex++;
    }
    
    if (filter.producerId) {
      whereConditions.push(`p.producerid = $${paramIndex}`);
      queryParams.push(filter.producerId);
      paramIndex++;
    }
    
    if (filter.inStock !== undefined) {
      whereConditions.push(`p.instock = $${paramIndex}`);
      queryParams.push(filter.inStock);
      paramIndex++;
    }
    
    if (filter.minPrice !== undefined) {
      whereConditions.push(`p.price >= $${paramIndex}`);
      queryParams.push(filter.minPrice);
      paramIndex++;
    }
    
    if (filter.maxPrice !== undefined) {
      whereConditions.push(`p.price <= $${paramIndex}`);
      queryParams.push(filter.maxPrice);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Map sortBy to column name
    const sortColumnMap: Record<string, string> = {
      name: 'p.name',
      price: 'p.price',
      createdAt: 'p.createdat'
    };
    const sortColumn = sortColumnMap[sortBy] || 'p.createdat';
    const orderClause = `ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM product p
      ${whereClause}
    `;
    const countResult = await this.pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get products with pagination
    const dataQuery = `
      SELECT 
        p.*,
        pt.producttypename,
        m.name as metal_name,
        pr.producername,
        c.countryname
      FROM product p
      LEFT JOIN producttype pt ON p.producttypeid = pt.id
      LEFT JOIN metal m ON p.metalid = m.id  
      LEFT JOIN producer pr ON p.producerid = pr.id
      LEFT JOIN country c ON p.countryid = c.id
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const dataParams = [...queryParams, limit, offset];
    const dataResult = await this.pool.query(dataQuery, dataParams);
    
    const items = dataResult.rows.map(row => this.mapRowToProductResponse(row));
    const totalPages = Math.ceil(total / limit);
    
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    };
  }
  
  async update(id: string, data: UpdateProductRequest, authenticatedUser: AuditTrailUser): Promise<ProductManagementResponse> {
    try {
      // Get lookup IDs if references changed
      let lookupIds: ProductLookupIds | null = null;
      if (data.productType || data.metal || data.producer || data.country) {
        const existingProduct = await this.findById(id);
        if (!existingProduct) {
          throw new Error(`Product not found: ${id}`);
        }
        
        lookupIds = await this.findLookupIds(
          data.productType || existingProduct.productType.name,
          data.metal || existingProduct.metal.name,
          data.producer || existingProduct.producer,
          data.country || existingProduct.country || undefined
        );
        
        if (!lookupIds) {
          throw new Error('Failed to resolve product references');
        }
      }
      
      // Build dynamic UPDATE query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (lookupIds?.productTypeId) {
        updateFields.push(`producttypeid = $${paramIndex++}`);
        values.push(lookupIds.productTypeId);
      }
      if (lookupIds?.metalId) {
        updateFields.push(`metalid = $${paramIndex++}`);
        values.push(lookupIds.metalId);
      }
      if (lookupIds?.producerId) {
        updateFields.push(`producerid = $${paramIndex++}`);
        values.push(lookupIds.producerId);
      }
      if (lookupIds?.countryId) {
        updateFields.push(`countryid = $${paramIndex++}`);
        values.push(lookupIds.countryId);
      }
      if (data.weight !== undefined) {
        updateFields.push(`weight = $${paramIndex++}`);
        values.push(data.weight);
      }
      if (data.weightUnit !== undefined) {
        updateFields.push(`weightunit = $${paramIndex++}`);
        values.push(data.weightUnit);
      }
      if (data.purity !== undefined) {
        updateFields.push(`purity = $${paramIndex++}`);
        values.push(data.purity);
      }
      if (data.price !== undefined) {
        updateFields.push(`price = $${paramIndex++}`);
        values.push(data.price);
      }
      if (data.currency !== undefined) {
        updateFields.push(`currency = $${paramIndex++}`);
        values.push(data.currency);
      }
      if (data.year !== undefined) {
        updateFields.push(`year = $${paramIndex++}`);
        values.push(data.year);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.imageUrl !== undefined) {
        updateFields.push(`imageurl = $${paramIndex++}`);
        values.push(data.imageUrl);
      }
      if (data.imageFilename !== undefined) {
        updateFields.push(`imagefilename = $${paramIndex++}`);
        values.push(data.imageFilename);
      }
      if (data.inStock !== undefined) {
        updateFields.push(`instock = $${paramIndex++}`);
        values.push(data.inStock);
      }
      if (data.stockQuantity !== undefined) {
        updateFields.push(`stockquantity = $${paramIndex++}`);
        values.push(data.stockQuantity);
      }
      if (data.minimumOrderQuantity !== undefined) {
        updateFields.push(`minimumorderquantity = $${paramIndex++}`);
        values.push(data.minimumOrderQuantity);
      }
      if (data.premiumPercentage !== undefined) {
        updateFields.push(`premiumpercentage = $${paramIndex++}`);
        values.push(data.premiumPercentage);
      }
      if (data.diameter !== undefined) {
        updateFields.push(`diameter = $${paramIndex++}`);
        values.push(data.diameter);
      }
      if (data.thickness !== undefined) {
        updateFields.push(`thickness = $${paramIndex++}`);
        values.push(data.thickness);
      }
      if (data.mintage !== undefined) {
        updateFields.push(`mintage = $${paramIndex++}`);
        values.push(data.mintage);
      }
      
      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }
      
      const auditUser = getAuditUser(authenticatedUser);
      updateFields.push(`updatedBy = $${paramIndex++}`);
      values.push(auditUser.id);
      updateFields.push(`updatedat = CURRENT_TIMESTAMP`);
      
      const query = `
        UPDATE product
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      values.push(id);
      
      const result = await this.pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Product not found: ${id}`);
      }
      
      // Re-fetch with joins for complete data
      return (await this.findById(id))!;
      
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to update product');
    }
  }
  
  async delete(id: string, _authenticatedUser: AuditTrailUser): Promise<void> {
    try {
      const result = await this.pool.query(
        'DELETE FROM product WHERE id = $1',
        [id]
      );
      
      if (result.rowCount === 0) {
        throw new Error(`Product not found: ${id}`);
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to delete product');
    }
  }
  
  async saveImage(productId: string, image: ProductImageUpload, authenticatedUser: AuditTrailUser): Promise<void> {
    try {
      const auditUser = getAuditUser(authenticatedUser);
      const result = await this.pool.query(
        `UPDATE product 
         SET imagedata = $1, imagecontenttype = $2, imagefilename = $3, updatedBy = $4, updatedat = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [image.imageData, image.contentType, image.filename, auditUser.id, productId]
      );
      
      if (result.rowCount === 0) {
        throw new Error(`Product not found: ${productId}`);
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to save product image');
    }
  }
  
  async getImage(productId: string): Promise<Buffer | null> {
    try {
      const result = await this.pool.query(
        'SELECT imagedata FROM product WHERE id = $1',
        [productId]
      );
      
      if (result.rows.length === 0 || !result.rows[0].imagedata) {
        return null;
      }
      
      return result.rows[0].imagedata;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get product image');
    }
  }
  
  async getImageWithMetadata(productId: string): Promise<{ data: Buffer; contentType: string; filename: string } | null> {
    try {
      const result = await this.pool.query(
        'SELECT imagedata, imagecontenttype, imagefilename FROM product WHERE id = $1',
        [productId]
      );
      
      if (result.rows.length === 0 || !result.rows[0].imagedata) {
        return null;
      }
      
      return {
        data: result.rows[0].imagedata,
        contentType: result.rows[0].imagecontenttype || 'image/jpeg',
        filename: result.rows[0].imagefilename || `product-${productId}.jpg`
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get product image');
    }
  }
  
  async findPriceById(id: string): Promise<{ id: string; price: number; currency: string } | null> {
    try {
      const result = await this.pool.query(
        'SELECT id, price, currency FROM product WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return {
        id: result.rows[0].id,
        price: Number.parseFloat(result.rows[0].price) || 0,
        currency: result.rows[0].currency
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get product price');
    }
  }
  
  async findPricesByIds(ids: string[]): Promise<{ id: string; price: number; currency: string }[]> {
    try {
      if (ids.length === 0) {
        return [];
      }
      
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
      const result = await this.pool.query(
        `SELECT id, price, currency FROM product WHERE id IN (${placeholders})`,
        ids
      );
      
      return result.rows.map(row => ({
        id: row.id,
        price: Number.parseFloat(row.price) || 0,
        currency: row.currency
      }));
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get product prices');
    }
  }
  
  async exists(id: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'SELECT 1 FROM product WHERE id = $1',
        [id]
      );
      return result.rows.length > 0;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to check product existence');
    }
  }
  
  async hasOrders(productId: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'SELECT 1 FROM order_items WHERE productid = $1 LIMIT 1',
        [productId]
      );
      return result.rows.length > 0;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to check product orders');
    }
  }
  
  async validateReferenceIds(
    metalId?: string, 
    productTypeId?: string, 
    producerId?: string, 
    countryId?: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const validationPromises: Promise<{ type: string; valid: boolean }>[] = [];
      
      if (metalId) {
        validationPromises.push(
          this.pool.query('SELECT id FROM metal WHERE id = $1', [metalId])
            .then(r => ({ type: 'metal', valid: r.rows.length > 0 }))
        );
      }
      if (productTypeId) {
        validationPromises.push(
          this.pool.query('SELECT id FROM producttype WHERE id = $1', [productTypeId])
            .then(r => ({ type: 'productType', valid: r.rows.length > 0 }))
        );
      }
      if (producerId) {
        validationPromises.push(
          this.pool.query('SELECT id FROM producer WHERE id = $1', [producerId])
            .then(r => ({ type: 'producer', valid: r.rows.length > 0 }))
        );
      }
      if (countryId) {
        validationPromises.push(
          this.pool.query('SELECT id FROM country WHERE id = $1', [countryId])
            .then(r => ({ type: 'country', valid: r.rows.length > 0 }))
        );
      }
      
      const results = await Promise.all(validationPromises);
      
      for (const result of results) {
        if (!result.valid) {
          errors.push(`Invalid ${result.type} ID`);
        }
      }
      
      return { valid: errors.length === 0, errors };
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to validate reference IDs');
    }
  }
  
  async createById(data: CreateProductByIdRequest, authenticatedUser: AuditTrailUser): Promise<ProductManagementResponse> {
    const id = uuidv4();
    const auditUser = getAuditUser(authenticatedUser);
    
    try {
      const query = `
        INSERT INTO product (
          id, name, producttypeid, metalid, countryid, producerid,
          weight, weightunit, purity, price, currency, year, description,
          imagefilename, instock, stockquantity, minimumorderquantity,
          premiumpercentage, diameter, thickness, mintage, certification, createdBy, updatedBy
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        )
        RETURNING *
      `;
      
      const values = [
        id,
        data.name,
        data.productTypeId,
        data.metalId,
        data.countryId || null,
        data.producerId,
        data.weight,
        data.weightUnit,
        data.purity,
        data.price,
        data.currency,
        data.year || null,
        data.description || null,
        data.imageFilename || null,
        data.inStock !== false,
        data.stockQuantity || 0,
        data.minimumOrderQuantity || 1,
        data.premiumPercentage || null,
        data.diameter || null,
        data.thickness || null,
        data.mintage || null,
        data.certification || null,
        auditUser.id,
        auditUser.id
      ];
      
      await this.pool.query(query, values);
      
      // Fetch the complete product with joins
      const product = await this.findById(id);
      if (!product) {
        throw new Error('Failed to create product');
      }
      
      return product;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to create product');
    }
  }
  
  async updateById(id: string, data: UpdateProductByIdRequest, authenticatedUser: AuditTrailUser): Promise<ProductManagementResponse> {
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;
      
      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(data.name);
      }
      if (data.productTypeId !== undefined) {
        updateFields.push(`producttypeid = $${paramIndex++}`);
        updateValues.push(data.productTypeId);
      }
      if (data.metalId !== undefined) {
        updateFields.push(`metalid = $${paramIndex++}`);
        updateValues.push(data.metalId);
      }
      if (data.countryId !== undefined) {
        updateFields.push(`countryid = $${paramIndex++}`);
        updateValues.push(data.countryId);
      }
      if (data.producerId !== undefined) {
        updateFields.push(`producerid = $${paramIndex++}`);
        updateValues.push(data.producerId);
      }
      if (data.weight !== undefined) {
        updateFields.push(`weight = $${paramIndex++}`);
        updateValues.push(data.weight);
      }
      if (data.weightUnit !== undefined) {
        updateFields.push(`weightunit = $${paramIndex++}`);
        updateValues.push(data.weightUnit);
      }
      if (data.purity !== undefined) {
        updateFields.push(`purity = $${paramIndex++}`);
        updateValues.push(data.purity);
      }
      if (data.price !== undefined) {
        updateFields.push(`price = $${paramIndex++}`);
        updateValues.push(data.price);
      }
      if (data.currency !== undefined) {
        updateFields.push(`currency = $${paramIndex++}`);
        updateValues.push(data.currency);
      }
      if (data.year !== undefined) {
        updateFields.push(`year = $${paramIndex++}`);
        updateValues.push(data.year);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(data.description);
      }
      if (data.imageFilename !== undefined) {
        updateFields.push(`imagefilename = $${paramIndex++}`);
        updateValues.push(data.imageFilename);
      }
      if (data.inStock !== undefined) {
        updateFields.push(`instock = $${paramIndex++}`);
        updateValues.push(data.inStock);
      }
      if (data.stockQuantity !== undefined) {
        updateFields.push(`stockquantity = $${paramIndex++}`);
        updateValues.push(data.stockQuantity);
      }
      if (data.minimumOrderQuantity !== undefined) {
        updateFields.push(`minimumorderquantity = $${paramIndex++}`);
        updateValues.push(data.minimumOrderQuantity);
      }
      if (data.premiumPercentage !== undefined) {
        updateFields.push(`premiumpercentage = $${paramIndex++}`);
        updateValues.push(data.premiumPercentage);
      }
      if (data.diameter !== undefined) {
        updateFields.push(`diameter = $${paramIndex++}`);
        updateValues.push(data.diameter);
      }
      if (data.thickness !== undefined) {
        updateFields.push(`thickness = $${paramIndex++}`);
        updateValues.push(data.thickness);
      }
      if (data.mintage !== undefined) {
        updateFields.push(`mintage = $${paramIndex++}`);
        updateValues.push(data.mintage);
      }
      if (data.certification !== undefined) {
        updateFields.push(`certification = $${paramIndex++}`);
        updateValues.push(data.certification);
      }
      
      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }
      
      const auditUser = getAuditUser(authenticatedUser);
      updateFields.push(`updatedBy = $${paramIndex++}`);
      updateValues.push(auditUser.id);
      updateFields.push(`updatedat = CURRENT_TIMESTAMP`);
      
      updateValues.push(id);
      
      const updateQuery = `
        UPDATE product 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
      `;
      
      const result = await this.pool.query(updateQuery, updateValues);
      
      if (result.rowCount === 0) {
        throw new Error(`Product not found: ${id}`);
      }
      
      const product = await this.findById(id);
      if (!product) {
        throw new Error('Failed to fetch updated product');
      }
      
      return product;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to update product');
    }
  }
  
  private mapRowToProductResponse(row: any): ProductManagementResponse {
    // Convert string to Enum instances
    const productTypeString = row.producttypename || row.productType;
    const metalString = row.metal_name || row.metal;
    
    const productType = ProductTypeEnum.fromName(productTypeString);
    const metal = Metal.fromName(metalString);
    
    if (!productType) {
      throw new Error(`Invalid product type: ${productTypeString}`);
    }
    
    if (!metal) {
      throw new Error(`Invalid metal: ${metalString}`);
    }
    
    return {
      id: row.id,
      name: row.name,
      productType,  // ✅ Enum instance
      productTypeId: row.producttypeid,
      metal,        // ✅ Enum instance
      metalId: row.metalid,
      weight: Number.parseFloat(row.weight),
      weightUnit: row.weightunit,
      purity: Number.parseFloat(row.purity),
      price: Number.parseFloat(row.price),
      currency: row.currency,
      producer: row.producername || row.producer,
      producerId: row.producerid,
      country: row.countryname || null,
      countryId: row.countryid || null,
      year: row.year,
      description: row.description,
      certifiedProvenance: row.certifiedprovenance ?? false,
      imageUrl: row.imageurl,
      imageFilename: row.imagefilename,
      inStock: row.instock,
      stockQuantity: row.stockquantity,
      minimumOrderQuantity: row.minimumorderquantity,
      premiumPercentage: row.premiumpercentage ? Number.parseFloat(row.premiumpercentage) : null,
      diameter: row.diameter ? Number.parseFloat(row.diameter) : null,
      thickness: row.thickness ? Number.parseFloat(row.thickness) : null,
      mintage: row.mintage || null,
      certification: row.certification || null,
      createdAt: new Date(row.createdat),
      updatedAt: new Date(row.updatedat)
    };
  }
}
