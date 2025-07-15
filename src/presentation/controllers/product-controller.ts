import {
  CreateProductDto,
  ProductSearchDto,
  UpdateProductDto,
} from '@application/dtos/product-dto';
import { CreateProduct } from '@application/use-cases/create-product';
import { DeleteProduct } from '@application/use-cases/delete-product';
import { SearchProducts } from '@application/use-cases/search-products';
import { UpdateProduct } from '@application/use-cases/update-product';
import { CustomError } from '@shared/errors/custom-error';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';

export class ProductController {
  constructor(
    private createProductUseCase: CreateProduct,
    private updateProductUseCase: UpdateProduct,
    private searchProductsUseCase: SearchProducts,
    private deleteProductUseCase: DeleteProduct
  ) {}

  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const productData: CreateProductDto = req.body;
      const product = await this.createProductUseCase.execute(productData);

      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully',
      });
    } catch (error) {
      console.error('Create product error:', error);

      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create product',
        });
      }
    }
  }

  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { productId } = req.params;
      const updateData: UpdateProductDto = req.body;

      const product = await this.updateProductUseCase.execute(productId, updateData);

      res.status(200).json({
        success: true,
        data: product,
        message: 'Product updated successfully',
      });
    } catch (error) {
      console.error('Update product error:', error);

      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update product',
        });
      }
    }
  }

  async searchProducts(req: Request, res: Response): Promise<void> {
    try {
      const searchParams: ProductSearchDto = {
        query: req.query.q as string,
        category: req.query.category as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        inStock: req.query.inStock ? req.query.inStock === 'true' : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const products = await this.searchProductsUseCase.execute(searchParams);

      res.status(200).json({
        success: true,
        data: products,
        meta: {
          count: products.length,
          searchParams,
        },
      });
    } catch (error) {
      console.error('Search products error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to search products',
      });
    }
  }

  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { productId } = req.params;

      await this.deleteProductUseCase.execute(productId);

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      console.error('Delete product error:', error);

      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete product',
        });
      }
    }
  }

  async getProduct(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement GetProduct use case
      // const product = await this.getProductUseCase.execute(productId);

      res.status(200).json({
        success: true,
        data: null, // placeholder
        message: 'Get product endpoint - not implemented yet',
      });
    } catch (error) {
      console.error('Get product error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve product',
      });
    }
  }
}
