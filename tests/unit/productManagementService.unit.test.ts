/**
 * Unit Tests for ProductManagementService
 * Tests for listProducts(), updateProduct(), deleteProduct(), uploadImage()
 */

import { ProductManagementService } from '../../src/services/product/impl/ProductManagementService';
import { ProductRepositoryMock } from '../../src/services/product/mock/ProductRepositoryMock';
import type { IProductManagementService } from '../../src/services/product/IProductManagementService';
import { AuditTrailUser } from '../../src/utils/auditTrail';

describe('ProductManagementService Unit Tests', () => {
  const testUser: AuditTrailUser = { id: 'test-user-id', email: 'test@example.com', role: 'admin' };
  let service: IProductManagementService;

  beforeAll(() => {
    // Direct dependency injection - bypass factory to avoid import issues
    const mockRepository = new ProductRepositoryMock();
    service = new ProductManagementService(mockRepository);
  });

  describe('listProducts()', () => {
    it('should list all products with default pagination', async () => {
      const result = await service.listProducts();

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.pagination.total).toBeGreaterThan(0);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.totalPages).toBeGreaterThan(0);
    });

    it('should list products with custom pagination', async () => {
      const result = await service.listProducts({
        page: 1,
        limit: 5
      });

      expect(result.items.length).toBeLessThanOrEqual(5);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(5);
    });

    it('should filter products by search term', async () => {
      const result = await service.listProducts({
        filter: {
          search: 'Gold'
        }
      });

      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach(product => {
        const matchesSearch = 
          product.name.toLowerCase().includes('gold') ||
          (product.description || '').toLowerCase().includes('gold');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter products by price range', async () => {
      const minPrice = 1000;
      const maxPrice = 2000;

      const result = await service.listProducts({
        filter: {
          minPrice,
          maxPrice
        }
      });

      result.items.forEach(product => {
        expect(product.price).toBeGreaterThanOrEqual(minPrice);
        expect(product.price).toBeLessThanOrEqual(maxPrice);
      });
    });

    it('should sort products by price ascending', async () => {
      const result = await service.listProducts({
        sortBy: 'price',
        sortOrder: 'asc'
      });

      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i].price).toBeGreaterThanOrEqual(result.items[i - 1].price);
      }
    });

    it('should sort products by price descending', async () => {
      const result = await service.listProducts({
        sortBy: 'price',
        sortOrder: 'desc'
      });

      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i].price).toBeLessThanOrEqual(result.items[i - 1].price);
      }
    });

    it('should reject page number less than 1', async () => {
      await expect(
        service.listProducts({ page: 0 })
      ).rejects.toThrow('Page number must be at least 1');
    });

    it('should reject limit less than 1', async () => {
      await expect(
        service.listProducts({ limit: 0 })
      ).rejects.toThrow('Limit must be between 1 and 100');
    });

    it('should reject limit greater than 100', async () => {
      await expect(
        service.listProducts({ limit: 101 })
      ).rejects.toThrow('Limit must be between 1 and 100');
    });

    it('should reject negative minimum price', async () => {
      await expect(
        service.listProducts({ filter: { minPrice: -10 } })
      ).rejects.toThrow('Minimum price cannot be negative');
    });

    it('should reject negative maximum price', async () => {
      await expect(
        service.listProducts({ filter: { maxPrice: -10 } })
      ).rejects.toThrow('Maximum price cannot be negative');
    });

    it('should reject minPrice greater than maxPrice', async () => {
      await expect(
        service.listProducts({ filter: { minPrice: 2000, maxPrice: 1000 } })
      ).rejects.toThrow('Minimum price cannot be greater than maximum price');
    });
  });

  describe('updateProduct()', () => {
    const existingProductId = '189b0a40-1a95-4243-961e-8db20135f624'; // Mock product ID from ProductRepositoryMock

    it('should update product price', async () => {
      const newPrice = 1999.99;

      const result = await service.updateProduct(existingProductId, {
        price: newPrice
      }, testUser);

      expect(result.id).toBe(existingProductId);
      expect(result.price).toBe(newPrice);
    });

    it('should update multiple fields', async () => {
      const updates = {
        price: 2100,
        stockQuantity: 75,
        inStock: true
      };

      const result = await service.updateProduct(existingProductId, updates, testUser);

      expect(result.price).toBe(updates.price);
      expect(result.stockQuantity).toBe(updates.stockQuantity);
      expect(result.inStock).toBe(updates.inStock);
    });

    it('should reject invalid product ID format', async () => {
      await expect(
        service.updateProduct('invalid-id', { price: 100 }, testUser)
      ).rejects.toThrow('Invalid product ID format');
    });

    it('should reject empty product ID', async () => {
      await expect(
        service.updateProduct('', { price: 100 }, testUser)
      ).rejects.toThrow('Valid product ID is required');
    });

    it('should reject negative weight', async () => {
      await expect(
        service.updateProduct(existingProductId, { weight: -10 }, testUser)
      ).rejects.toThrow('Weight must be greater than 0');
    });

    it('should reject zero weight', async () => {
      await expect(
        service.updateProduct(existingProductId, { weight: 0 }, testUser)
      ).rejects.toThrow('Weight must be greater than 0');
    });

    it('should reject purity less than 0', async () => {
      await expect(
        service.updateProduct(existingProductId, { purity: -0.1 }, testUser)
      ).rejects.toThrow('Purity must be between 0 and 1');
    });

    it('should reject purity greater than 1', async () => {
      await expect(
        service.updateProduct(existingProductId, { purity: 1.1 }, testUser)
      ).rejects.toThrow('Purity must be between 0 and 1');
    });

    it('should reject negative price', async () => {
      await expect(
        service.updateProduct(existingProductId, { price: -100 }, testUser)
      ).rejects.toThrow('Price must be greater than 0');
    });

    it('should reject invalid currency', async () => {
      await expect(
        service.updateProduct(existingProductId, { currency: 'INVALID' }, testUser)
      ).rejects.toThrow('Currency must be one of');
    });

    it('should reject invalid weight unit', async () => {
      await expect(
        service.updateProduct(existingProductId, { weightUnit: 'invalid' }, testUser)
      ).rejects.toThrow('Weight unit must be one of');
    });

    it('should reject negative stock quantity', async () => {
      await expect(
        service.updateProduct(existingProductId, { stockQuantity: -5 }, testUser)
      ).rejects.toThrow('Stock quantity cannot be negative');
    });

    it('should reject zero minimum order quantity', async () => {
      await expect(
        service.updateProduct(existingProductId, { minimumOrderQuantity: 0 }, testUser)
      ).rejects.toThrow('Minimum order quantity must be greater than 0');
    });
  });

  describe('deleteProduct()', () => {
    it('should delete an existing product', async () => {
      // Use product ID 2 to avoid affecting tests that use product ID 1
      const productIdToDelete = '2a543760-8b8c-443b-8929-fc98a9be00f1'; // Product 2 from mock

      // Should not throw
      await service.deleteProduct(productIdToDelete, testUser);

      // Verify product is deleted
      const result = await service.getProductById(productIdToDelete);
      expect(result).toBeNull();
    });

    it('should reject invalid product ID format', async () => {
      await expect(
        service.deleteProduct('invalid-id', testUser)
      ).rejects.toThrow('Invalid product ID format');
    });

    it('should reject empty product ID', async () => {
      await expect(
        service.deleteProduct('', testUser)
      ).rejects.toThrow('Valid product ID is required');
    });

    it('should throw error for non-existent product', async () => {
      const nonExistentId = '99999999-9999-4999-9999-999999999999'; // Valid UUID format but non-existent
      
      await expect(
        service.deleteProduct(nonExistentId, testUser)
      ).rejects.toThrow('Product not found');
    });
  });

  describe('uploadImage()', () => {
    const existingProductId = '189b0a40-1a95-4243-961e-8db20135f624'; // Mock product ID from ProductRepositoryMock

    it('should upload a valid PNG image', async () => {
      // 1x1 PNG pixel Base64
      const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      // Should not throw
      await service.uploadImage(existingProductId, base64Image, 'image/png', 'test.png', testUser);
    });

    it('should upload image with data URI prefix', async () => {
      const base64WithPrefix = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      // Should not throw
      await service.uploadImage(existingProductId, base64WithPrefix, 'image/png', 'test.png', testUser);
    });

    it('should reject invalid product ID format', async () => {
      await expect(
        service.uploadImage('invalid-id', 'base64data', 'image/png', 'test.png', testUser)
      ).rejects.toThrow('Invalid product ID format');
    });

    it('should reject empty image data', async () => {
      await expect(
        service.uploadImage(existingProductId, '', 'image/png', 'test.png', testUser)
      ).rejects.toThrow('Image data is required');
    });

    it('should reject invalid content type', async () => {
      await expect(
        service.uploadImage(existingProductId, 'base64data', 'application/pdf', 'test.pdf', testUser)
      ).rejects.toThrow('Invalid content type');
    });

    it('should accept JPEG content type', async () => {
      const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      // Should not throw
      await service.uploadImage(existingProductId, base64Image, 'image/jpeg', 'test.jpg', testUser);
    });

    it('should accept JPG content type', async () => {
      const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      // Should not throw
      await service.uploadImage(existingProductId, base64Image, 'image/jpg', 'test.jpg', testUser);
    });

    it('should accept WebP content type', async () => {
      const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      // Should not throw
      await service.uploadImage(existingProductId, base64Image, 'image/webp', 'test.webp', testUser);
    });

    it('should reject image exceeding 5MB', async () => {
      // Create a Base64 string that would decode to > 5MB
      const largeBase64 = 'A'.repeat(7 * 1024 * 1024); // ~7MB Base64 = ~5.25MB decoded

      await expect(
        service.uploadImage(existingProductId, largeBase64, 'image/png', 'large.png', testUser)
      ).rejects.toThrow('Image size exceeds maximum allowed size of 5MB');
    });
  });

  describe('getProductById()', () => {
    it('should return existing product', async () => {
      const products = await service.listProducts({ limit: 1 });
      const productId = products.items[0].id;

      const result = await service.getProductById(productId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(productId);
    });

    it('should return null for non-existent product', async () => {
      const nonExistentId = '99999999-9999-4999-9999-999999999999'; // Valid UUID format but non-existent

      const result = await service.getProductById(nonExistentId);

      expect(result).toBeNull();
    });

    it('should reject invalid UUID format', async () => {
      await expect(
        service.getProductById('invalid-id')
      ).rejects.toThrow('Invalid product ID format');
    });
  });
});