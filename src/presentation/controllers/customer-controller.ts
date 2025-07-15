import { CustomError } from '@shared/errors/custom-error';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { GetCustomer, UpdateCustomer } from '../../application';
import { CreateCustomer } from '../../application/use-cases/customer/create-customer';
import {
  ActivateCustomer,
  CustomerStatistics,
  DeactivateCustomer,
  GetCustomerStatistics,
} from '../../application/use-cases/customer/customer';
import {
  DeleteCustomer,
  GetCustomerByEmail,
} from '../../application/use-cases/customer/delete-customer';
import {
  GetAllCustomers,
  GetAllCustomersFilters,
} from '../../application/use-cases/customer/get-all-customers';

export class CustomerController {
  constructor(
    private createCustomerUseCase: CreateCustomer,
    private getCustomerUseCase: GetCustomer,
    private updateCustomerUseCase: UpdateCustomer,
    private deleteCustomerUseCase: DeleteCustomer,
    private getCustomerByEmailUseCase: GetCustomerByEmail,
    private getAllCustomersUseCase: GetAllCustomers,
    private activateCustomerUseCase: ActivateCustomer,
    private deactivateCustomerUseCase: DeactivateCustomer,
    private getCustomerStatisticsUseCase: GetCustomerStatistics
  ) {}

  // ============================================================================
  // CREATE CUSTOMER
  // POST /api/customers
  // ============================================================================
  async createCustomer(req: Request, res: Response): Promise<void> {
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

      const { name, email, phone } = req.body;

      console.log(`📝 Creating customer: ${email}`);

      const customer = await this.createCustomerUseCase.execute({
        name,
        email,
        phone,
      });

      console.log(`✅ Customer created successfully: ${customer.id}`);

      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer created successfully',
      });
    } catch (error) {
      console.error('❌ Create customer error:', error);
      this.handleError(error, res, 'Failed to create customer');
    }
  }

  // ============================================================================
  // GET CUSTOMER BY ID
  // GET /api/customers/:customerId
  // ============================================================================
  async getCustomer(req: Request, res: Response): Promise<void> {
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

      const { customerId } = req.params;

      console.log(`🔍 Getting customer: ${customerId}`);

      const customer = await this.getCustomerUseCase.execute(customerId ?? '');

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      console.error('❌ Get customer error:', error);
      this.handleError(error, res, 'Failed to get customer');
    }
  }

  // ============================================================================
  // GET CUSTOMER BY EMAIL
  // GET /api/customers/email/:email
  // ============================================================================
  async getCustomerByEmail(req: Request, res: Response): Promise<void> {
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

      const { email } = req.params;
      const decodedEmail = decodeURIComponent(email ?? '');

      console.log(`🔍 Getting customer by email: ${decodedEmail}`);

      const customer = await this.getCustomerByEmailUseCase.execute(decodedEmail);

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      console.error('❌ Get customer by email error:', error);
      this.handleError(error, res, 'Failed to get customer by email');
    }
  }

  // ============================================================================
  // GET ALL CUSTOMERS (with pagination and filtering)
  // GET /api/customers?page=1&limit=20&search=john&isActive=true
  // ============================================================================
  async getAllCustomers(req: Request, res: Response): Promise<void> {
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

      const { page = 1, limit = 20, search, isActive } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const filters: GetAllCustomersFilters = {
        limit: Number(limit),
        offset,
        ...(search ? { search: search as string } : {}),
        ...(isActive === 'true'
          ? { isActive: true }
          : isActive === 'false'
            ? { isActive: false }
            : {}),
      };

      console.log(`📋 Getting all customers with filters:`, filters);

      const result = await this.getAllCustomersUseCase.execute(filters);

      res.status(200).json({
        success: true,
        data: result.customers,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          hasNext: result.hasNext,
          hasPrevious: result.hasPrevious,
        },
        meta: {
          totalCustomers: result.total,
          currentPage: result.page,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    } catch (error) {
      console.error('❌ Get all customers error:', error);
      this.handleError(error, res, 'Failed to get customers');
    }
  }

  // ============================================================================
  // UPDATE CUSTOMER
  // PUT /api/customers/:customerId
  // ============================================================================
  async updateCustomer(req: Request, res: Response): Promise<void> {
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

      const { customerId } = req.params;
      const { name, email, phone } = req.body;

      console.log(`📝 Updating customer: ${customerId}`);

      const customer = await this.updateCustomerUseCase.execute(customerId ?? '', {
        name,
        email,
        phone,
      });

      console.log(`✅ Customer updated successfully: ${customerId}`);

      res.status(200).json({
        success: true,
        data: customer,
        message: 'Customer updated successfully',
      });
    } catch (error) {
      console.error('❌ Update customer error:', error);
      this.handleError(error, res, 'Failed to update customer');
    }
  }

  // ============================================================================
  // ACTIVATE CUSTOMER
  // PUT /api/customers/:customerId/activate
  // ============================================================================
  async activateCustomer(req: Request, res: Response): Promise<void> {
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

      const { customerId } = req.params;

      console.log(`✅ Activating customer: ${customerId}`);

      const customer = await this.activateCustomerUseCase.execute(customerId ?? '');

      console.log(`✅ Customer activated successfully: ${customerId}`);

      res.status(200).json({
        success: true,
        data: customer,
        message: 'Customer activated successfully',
      });
    } catch (error) {
      console.error('❌ Activate customer error:', error);
      this.handleError(error, res, 'Failed to activate customer');
    }
  }

  // ============================================================================
  // DEACTIVATE CUSTOMER
  // PUT /api/customers/:customerId/deactivate
  // ============================================================================
  async deactivateCustomer(req: Request, res: Response): Promise<void> {
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

      const { customerId } = req.params;

      console.log(`❌ Deactivating customer: ${customerId}`);

      const customer = await this.deactivateCustomerUseCase.execute(customerId ?? '');

      console.log(`✅ Customer deactivated successfully: ${customerId}`);

      res.status(200).json({
        success: true,
        data: customer,
        message: 'Customer deactivated successfully',
      });
    } catch (error) {
      console.error('❌ Deactivate customer error:', error);
      this.handleError(error, res, 'Failed to deactivate customer');
    }
  }

  // ============================================================================
  // DELETE CUSTOMER
  // DELETE /api/customers/:customerId
  // ============================================================================
  async deleteCustomer(req: Request, res: Response): Promise<void> {
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

      const { customerId } = req.params;

      console.log(`🗑️ Deleting customer: ${customerId}`);

      await this.deleteCustomerUseCase.execute(customerId ?? '');

      console.log(`✅ Customer deleted successfully: ${customerId}`);

      res.status(200).json({
        success: true,
        message: 'Customer deleted successfully',
      });
    } catch (error) {
      console.error('❌ Delete customer error:', error);
      this.handleError(error, res, 'Failed to delete customer');
    }
  }

  // ============================================================================
  // GET CUSTOMER STATISTICS
  // GET /api/customers/statistics
  // ============================================================================
  async getStatistics(_req: Request, res: Response): Promise<void> {
    try {
      console.log('📊 Getting customer statistics...');

      const statistics: CustomerStatistics = await this.getCustomerStatisticsUseCase.execute();

      res.status(200).json({
        success: true,
        data: statistics,
        meta: {
          generatedAt: new Date().toISOString(),
          dataPoints: {
            totalCustomers: statistics.totalCustomers,
            activeCustomers: statistics.activeCustomers,
            inactiveCustomers: statistics.inactiveCustomers,
            customersWithPhone: statistics.customersWithPhone,
            recentCustomersCount: statistics.recentCustomers.length,
          },
        },
      });
    } catch (error) {
      console.error('❌ Get statistics error:', error);
      this.handleError(error, res, 'Failed to get customer statistics');
    }
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  // BULK ACTIVATE CUSTOMERS
  // PUT /api/customers/bulk/activate
  async bulkActivateCustomers(req: Request, res: Response): Promise<void> {
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

      const { customerIds } = req.body;

      if (!Array.isArray(customerIds) || customerIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Customer IDs array is required',
        });
        return;
      }

      console.log(`🔄 Bulk activating ${customerIds.length} customers`);

      const results = [];
      const errors_list = [];

      for (const customerId of customerIds) {
        try {
          const customer = await this.activateCustomerUseCase.execute(customerId);
          results.push({ customerId, success: true, customer });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors_list.push({ customerId, success: false, error: errorMessage });
        }
      }

      console.log(
        `✅ Bulk activation completed: ${results.length} successful, ${errors_list.length} failed`
      );

      res.status(200).json({
        success: true,
        data: {
          successful: results,
          failed: errors_list,
        },
        meta: {
          totalRequested: customerIds.length,
          successful: results.length,
          failed: errors_list.length,
        },
        message: `Bulk activation completed: ${results.length}/${customerIds.length} successful`,
      });
    } catch (error) {
      console.error('❌ Bulk activate customers error:', error);
      this.handleError(error, res, 'Failed to bulk activate customers');
    }
  }

  // BULK DEACTIVATE CUSTOMERS
  // PUT /api/customers/bulk/deactivate
  async bulkDeactivateCustomers(req: Request, res: Response): Promise<void> {
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

      const { customerIds } = req.body;

      if (!Array.isArray(customerIds) || customerIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Customer IDs array is required',
        });
        return;
      }

      console.log(`🔄 Bulk deactivating ${customerIds.length} customers`);

      const results = [];
      const errors_list = [];

      for (const customerId of customerIds) {
        try {
          const customer = await this.deactivateCustomerUseCase.execute(customerId);
          results.push({ customerId, success: true, customer });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors_list.push({ customerId, success: false, error: errorMessage });
        }
      }

      console.log(
        `✅ Bulk deactivation completed: ${results.length} successful, ${errors_list.length} failed`
      );

      res.status(200).json({
        success: true,
        data: {
          successful: results,
          failed: errors_list,
        },
        meta: {
          totalRequested: customerIds.length,
          successful: results.length,
          failed: errors_list.length,
        },
        message: `Bulk deactivation completed: ${results.length}/${customerIds.length} successful`,
      });
    } catch (error) {
      console.error('❌ Bulk deactivate customers error:', error);
      this.handleError(error, res, 'Failed to bulk deactivate customers');
    }
  }

  // HEALTH CHECK ENDPOINT
  // GET /api/customers/health
  async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();

      // Test basic operations
      const statistics = await this.getCustomerStatisticsUseCase.execute();

      const responseTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        data: {
          status: 'healthy',
          responseTime: `${responseTime}ms`,
          database: 'connected',
          customerCount: statistics.totalCustomers,
          activeCustomers: statistics.activeCustomers,
          lastCheck: new Date().toISOString(),
        },
        meta: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
        },
      });
    } catch (error) {
      console.error('❌ Health check error:', error);

      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date().toISOString(),
        },
        meta: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
        },
      });
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private handleError(
    error: unknown,
    res: Response,
    defaultMessage: string = 'Internal server error'
  ): void {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    } else if (error instanceof Error) {
      // Handle known error types
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
      } else if (error.message.includes('validation') || error.message.includes('invalid')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: defaultMessage,
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: defaultMessage,
      });
    }
  }

  // Get controller metadata (useful for API documentation)
  getControllerInfo(): {
    name: string;
    version: string;
    endpoints: Array<{
      method: string;
      path: string;
      description: string;
      requiresAuth?: boolean;
    }>;
  } {
    return {
      name: 'CustomerController',
      version: '1.0.0',
      endpoints: [
        { method: 'POST', path: '/api/customers', description: 'Create new customer' },
        { method: 'GET', path: '/api/customers/:id', description: 'Get customer by ID' },
        {
          method: 'GET',
          path: '/api/customers/email/:email',
          description: 'Get customer by email',
        },
        { method: 'GET', path: '/api/customers', description: 'Get all customers (paginated)' },
        { method: 'GET', path: '/api/customers/search', description: 'Search customers' },
        { method: 'PUT', path: '/api/customers/:id', description: 'Update customer' },
        { method: 'PUT', path: '/api/customers/:id/email', description: 'Update customer email' },
        { method: 'PUT', path: '/api/customers/:id/phone', description: 'Update customer phone' },
        { method: 'PUT', path: '/api/customers/:id/activate', description: 'Activate customer' },
        {
          method: 'PUT',
          path: '/api/customers/:id/deactivate',
          description: 'Deactivate customer',
        },
        { method: 'DELETE', path: '/api/customers/:id', description: 'Delete customer' },
        {
          method: 'GET',
          path: '/api/customers/statistics',
          description: 'Get customer statistics',
        },
        {
          method: 'PUT',
          path: '/api/customers/bulk/activate',
          description: 'Bulk activate customers',
        },
        {
          method: 'PUT',
          path: '/api/customers/bulk/deactivate',
          description: 'Bulk deactivate customers',
        },
        { method: 'GET', path: '/api/customers/health', description: 'Health check' },
      ],
    };
  }
}
