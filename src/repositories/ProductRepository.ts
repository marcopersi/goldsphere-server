/**
 * Product Repository Implementation
 * 
 * Handles database operations for product management
 */

import { IProductRepository } from '../interfaces/IProductRepository';
import { CreateProductRequest, ProductManagementResponse } from '../interfaces/IProductManagementService';
import { getPool } from '../dbConfig';
import { v4 as uuidv4 } from 'uuid';

export class ProductRepository implements IProductRepository {
  
  async findLookupIds(productType: string, metal: string, producer: string, country?: string): Promise<{
    productTypeId: string;
    metalId: string;
    producerId: string;
    countryId?: string;
  } | null> {
    const pool = getPool();
    
    try {
      // Get product type ID
      const productTypeQuery = 'SELECT id FROM producttype WHERE producttypename = $1';
      const productTypeResult = await pool.query(productTypeQuery, [productType]);
      
      if (productTypeResult.rows.length === 0) {
        throw new Error(`Product type '${productType}' not found`);
      }
      
      // Get metal ID
      const metalQuery = 'SELECT id FROM metal WHERE name = $1';
      const metalResult = await pool.query(metalQuery, [metal]);
      
      if (metalResult.rows.length === 0) {
        throw new Error(`Metal '${metal}' not found`);
      }
      
      // Get producer ID
      const producerQuery = 'SELECT id FROM producer WHERE producername = $1';
      const producerResult = await pool.query(producerQuery, [producer]);
      
      if (producerResult.rows.length === 0) {
        throw new Error(`Producer '${producer}' not found`);
      }
      
      let countryId: string | undefined;
      if (country) {
        const countryQuery = 'SELECT id FROM country WHERE countryname = $1';
        const countryResult = await pool.query(countryQuery, [country]);
        
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

  async create(data: CreateProductRequest): Promise<ProductManagementResponse> {
    const pool = getPool();
    const id = uuidv4();
    const now = new Date();
    
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
          premiumpercentage, createdat, updatedat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
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
        now
      ];
      
      const result = await pool.query(query, values);
      return this.mapRowToProductResponse(result.rows[0]);
      
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to create product');
    }
  }
  
  async findById(id: string): Promise<ProductManagementResponse | null> {
    const pool = getPool();
    
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
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToProductResponse(result.rows[0]);
  }
  
  private mapRowToProductResponse(row: any): ProductManagementResponse {
    return {
      id: row.id,
      name: row.name,
      productType: row.producttypename || row.productType,
      metal: row.metal_name || row.metal,
      weight: Number.parseFloat(row.weight),
      weightUnit: row.weightunit,
      purity: Number.parseFloat(row.purity),
      price: Number.parseFloat(row.price),
      currency: row.currency,
      producer: row.producername || row.producer,
      country: row.countryname || null,
      year: row.year,
      description: row.description,
      imageUrl: row.imageurl,
      imageFilename: row.imagefilename,
      inStock: row.instock,
      stockQuantity: row.stockquantity,
      minimumOrderQuantity: row.minimumorderquantity,
      premiumPercentage: row.premiumpercentage ? Number.parseFloat(row.premiumpercentage) : null,
      createdAt: new Date(row.createdat),
      updatedAt: new Date(row.updatedat)
    };
  }
}
