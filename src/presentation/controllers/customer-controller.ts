import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from "@application/dtos/customer-dto";
import { CreateCustomer } from "@application/use-cases";
import { GetCustomer } from "@application/use-cases/get-customer";
import { UpdateCustomer } from "@application/use-cases/update-customer";
import { CustomError } from "@shared/errors/custom-error";
import { Request, Response } from "express";
import { validationResult } from "express-validator";

export class CustomerController {
  constructor(
    private createCustomerUseCase: CreateCustomer,
    private getCustomerUseCase: GetCustomer,
    private updateCustomerUseCase: UpdateCustomer
  ) {}

  async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
        return;
      }

      const customerData: CreateCustomerDto = req.body;
      const customer = await this.createCustomerUseCase.execute(customerData);

      res.status(201).json({
        success: true,
        data: customer,
        message: "Customer created successfully",
      });
    } catch (error) {
      console.error("Create customer error:", error);

      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to create customer",
        });
      }
    }
  }

  async getCustomer(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
        return;
      }

      const { customerId } = req.params;
      const customer = await this.getCustomerUseCase.execute(customerId);

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      console.error("Get customer error:", error);

      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to retrieve customer",
        });
      }
    }
  }

  async updateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
        return;
      }

      const { customerId } = req.params;
      const updateData: UpdateCustomerDto = req.body;

      const customer = await this.updateCustomerUseCase.execute(
        customerId,
        updateData
      );

      res.status(200).json({
        success: true,
        data: customer,
        message: "Customer updated successfully",
      });
    } catch (error) {
      console.error("Update customer error:", error);

      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to update customer",
        });
      }
    }
  }
}
