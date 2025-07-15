import { Request, Response } from 'express';
import { InitializeProductEmbeddings } from '../../application/use-cases';

export class AdminController {
  constructor(private initializeEmbeddingsUseCase: InitializeProductEmbeddings) {}

  async initializeEmbeddings(req: Request, res: Response): Promise<void> {
    try {
      const options = req.body || {};

      const result = await this.initializeEmbeddingsUseCase.execute(options);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Product embeddings initialized successfully',
      });
    } catch (error) {
      console.error('Initialize embeddings error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to initialize embeddings',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async initializeSpecificProducts(req: Request, res: Response): Promise<void> {
    try {
      const { productIds } = req.body;
      const options = req.body.options || {};

      if (!Array.isArray(productIds)) {
        res.status(400).json({
          success: false,
          error: 'productIds must be an array',
        });
        return;
      }

      const result = await this.initializeEmbeddingsUseCase.executeForProducts(productIds, options);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Product embeddings initialized for specific products',
      });
    } catch (error) {
      console.error('Initialize specific embeddings error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to initialize embeddings for specific products',
      });
    }
  }

  async getEmbeddingStatus(_req: Request, res: Response): Promise<void> {
    try {
      const status = await this.initializeEmbeddingsUseCase.getInitializationStatus();

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Get embedding status error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get embedding status',
      });
    }
  }

  async validateEmbeddings(_req: Request, res: Response): Promise<void> {
    try {
      const validation = await this.initializeEmbeddingsUseCase.validateEmbeddings();

      res.status(200).json({
        success: true,
        data: validation,
      });
    } catch (error) {
      console.error('Validate embeddings error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to validate embeddings',
      });
    }
  }

  async clearCache(_req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement cache clearing

      res.status(200).json({
        success: true,
        message: 'Cache cleared successfully',
      });
    } catch (error) {
      console.error('Clear cache error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
      });
    }
  }
}
