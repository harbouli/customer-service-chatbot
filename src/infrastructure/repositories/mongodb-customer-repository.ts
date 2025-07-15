/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Customer } from '@domain/entities/customer';
import { ICustomerRepository } from '@domain/repositories/ICustomerRepository';
import { CustomError } from '@shared/errors/custom-error';
import {
  CustomerAlreadyExistsError,
  CustomerModel,
  CustomerNotFoundError,
} from '../database/models/customer.model';

// Repository Implementation
export class MongoDBCustomerRepository implements ICustomerRepository {
  async findById(customerId: string): Promise<Customer | null> {
    try {
      const customerDoc = await CustomerModel.findByCustomerId(customerId);

      if (!customerDoc) {
        return null;
      }

      return this.mapDocumentToEntity(customerDoc);
    } catch (error) {
      console.error(`❌ Failed to find customer: ${customerId}`, error);
      return null;
    }
  }

  async findByEmail(email: string): Promise<Customer | null> {
    try {
      const customerDoc = await CustomerModel.findByEmail(email);

      if (!customerDoc) {
        return null;
      }

      return this.mapDocumentToEntity(customerDoc);
    } catch (error) {
      console.error(`❌ Failed to find customer by email: ${email}`, error);
      return null;
    }
  }

  async save(customer: Customer): Promise<void> {
    try {
      const existingCustomer = await CustomerModel.findByCustomerId(customer.id);

      if (existingCustomer) {
        // Update existing customer
        await CustomerModel.findOneAndUpdate(
          { customerId: customer.id },
          {
            $set: {
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
            },
          }
        );
      } else {
        // Check if email already exists for a different customer
        const existingEmail = await CustomerModel.findByEmail(customer.email);
        if (existingEmail) {
          throw new CustomerAlreadyExistsError(customer.email);
        }

        // Check if phone already exists (if provided)
        if (customer.phone) {
          const existingPhone = await CustomerModel.findByPhone(customer.phone);
          if (existingPhone) {
            throw new CustomError(
              `Customer with phone ${customer.phone} already exists`,
              409,
              'CUSTOMER_PHONE_EXISTS'
            );
          }
        }

        // Create new customer
        const customerDoc = new CustomerModel({
          customerId: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        });

        await customerDoc.save();
      }

      console.log(`✅ Customer saved: ${customer.email}`);
    } catch (error) {
      if (error instanceof CustomerAlreadyExistsError || error instanceof CustomError) {
        throw error;
      }

      console.error(`❌ Failed to save customer: ${customer.id}`, error);
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as any).code === 11000
      ) {
        // Handle duplicate key error
        if ((error as any).keyValue?.email) {
          throw new CustomerAlreadyExistsError((error as any).keyValue.email);
        }
        if ((error as any).keyValue?.phone) {
          throw new CustomError(
            `Customer with phone ${(error as any).keyValue.phone} already exists`,
            409,
            'CUSTOMER_PHONE_EXISTS'
          );
        }
      }

      throw new CustomError('Failed to save customer', 500, 'CUSTOMER_SAVE_FAILED');
    }
  }

  // Additional helper methods (not part of the interface but useful for the implementation)
  async findByPhone(phone: string): Promise<Customer | null> {
    try {
      const customerDoc = await CustomerModel.findByPhone(phone);

      if (!customerDoc) {
        return null;
      }

      return this.mapDocumentToEntity(customerDoc);
    } catch (error) {
      console.error(`❌ Failed to find customer by phone: ${phone}`, error);
      return null;
    }
  }

  async findAll(): Promise<Customer[]> {
    try {
      const customerDocs = await CustomerModel.find().sort({ name: 1 }).lean();
      return customerDocs.map(doc => this.mapDocumentToEntity(doc));
    } catch (error) {
      console.error('❌ Failed to find all customers', error);
      return [];
    }
  }

  async findActiveCustomers(): Promise<Customer[]> {
    try {
      const customerDocs = await CustomerModel.findActiveCustomers();
      return customerDocs.map(doc => this.mapDocumentToEntity(doc));
    } catch (error) {
      console.error('❌ Failed to find active customers', error);
      return [];
    }
  }

  async search(query: string): Promise<Customer[]> {
    try {
      const customerDocs = await CustomerModel.searchCustomers(query);
      return customerDocs.map(doc => this.mapDocumentToEntity(doc));
    } catch (error) {
      console.error(`❌ Failed to search customers: ${query}`, error);
      return [];
    }
  }

  async delete(customerId: string): Promise<void> {
    try {
      const customer = await CustomerModel.findOneAndDelete({ customerId });
      if (!customer) {
        throw new CustomerNotFoundError(customerId);
      }

      console.log(`✅ Customer deleted: ${customer.email}`);
    } catch (error) {
      if (error instanceof CustomerNotFoundError) {
        throw error;
      }

      console.error(`❌ Failed to delete customer: ${customerId}`, error);
      throw new CustomError('Failed to delete customer', 500, 'CUSTOMER_DELETE_FAILED');
    }
  }

  async deactivate(customerId: string): Promise<Customer> {
    try {
      const customer = await CustomerModel.findOneAndUpdate(
        { customerId },
        { $set: { isActive: false } },
        { new: true }
      );

      if (!customer) {
        throw new CustomerNotFoundError(customerId);
      }

      console.log(`✅ Customer deactivated: ${customer.email}`);
      return this.mapDocumentToEntity(customer);
    } catch (error) {
      if (error instanceof CustomerNotFoundError) {
        throw error;
      }

      console.error(`❌ Failed to deactivate customer: ${customerId}`, error);
      throw new CustomError('Failed to deactivate customer', 500, 'CUSTOMER_DEACTIVATION_FAILED');
    }
  }

  async activate(customerId: string): Promise<Customer> {
    try {
      const customer = await CustomerModel.findOneAndUpdate(
        { customerId },
        { $set: { isActive: true } },
        { new: true }
      );

      if (!customer) {
        throw new CustomerNotFoundError(customerId);
      }

      console.log(`✅ Customer activated: ${customer.email}`);
      return this.mapDocumentToEntity(customer);
    } catch (error) {
      if (error instanceof CustomerNotFoundError) {
        throw error;
      }

      console.error(`❌ Failed to activate customer: ${customerId}`, error);
      throw new CustomError('Failed to activate customer', 500, 'CUSTOMER_ACTIVATION_FAILED');
    }
  }

  async getCustomerCount(): Promise<number> {
    try {
      return await CustomerModel.countDocuments();
    } catch (error) {
      console.error('❌ Failed to count customers:', error);
      throw new CustomError('Failed to count customers', 500, 'CUSTOMER_COUNT_FAILED');
    }
  }

  async getCustomerStatistics() {
    try {
      const stats = await CustomerModel.aggregate([
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            activeCustomers: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
            },
            inactiveCustomers: {
              $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] },
            },
            customersWithPhone: {
              $sum: { $cond: [{ $ne: ['$phone', null] }, 1, 0] },
            },
          },
        },
      ]);

      return (
        stats[0] || {
          totalCustomers: 0,
          activeCustomers: 0,
          inactiveCustomers: 0,
          customersWithPhone: 0,
        }
      );
    } catch (error) {
      console.error('❌ Failed to get customer statistics', error);
      throw new CustomError('Failed to get customer statistics', 500, 'CUSTOMER_STATS_FAILED');
    }
  }

  async updateEmail(customerId: string, newEmail: string): Promise<Customer> {
    try {
      // Check if email already exists for another customer
      const existingCustomer = await CustomerModel.findByEmail(newEmail);
      if (existingCustomer && existingCustomer.customerId !== customerId) {
        throw new CustomerAlreadyExistsError(newEmail);
      }

      const customer = await CustomerModel.findOneAndUpdate(
        { customerId },
        { $set: { email: newEmail } },
        { new: true, runValidators: true }
      );

      if (!customer) {
        throw new CustomerNotFoundError(customerId);
      }

      console.log(`✅ Customer email updated: ${customerId} -> ${newEmail}`);
      return this.mapDocumentToEntity(customer);
    } catch (error) {
      if (error instanceof CustomerNotFoundError || error instanceof CustomerAlreadyExistsError) {
        throw error;
      }

      console.error(`❌ Failed to update customer email: ${customerId}`, error);
      throw new CustomError('Failed to update customer email', 500, 'CUSTOMER_EMAIL_UPDATE_FAILED');
    }
  }

  async updatePhone(customerId: string, newPhone?: string): Promise<Customer> {
    try {
      // Check if phone already exists for another customer (if provided)
      if (newPhone) {
        const existingPhone = await CustomerModel.findByPhone(newPhone);
        if (existingPhone && existingPhone.customerId !== customerId) {
          throw new CustomError(
            `Customer with phone ${newPhone} already exists`,
            409,
            'CUSTOMER_PHONE_EXISTS'
          );
        }
      }

      const customer = await CustomerModel.findOneAndUpdate(
        { customerId },
        { $set: { phone: newPhone } },
        { new: true, runValidators: true }
      );

      if (!customer) {
        throw new CustomerNotFoundError(customerId);
      }

      console.log(`✅ Customer phone updated: ${customerId} -> ${newPhone || 'removed'}`);
      return this.mapDocumentToEntity(customer);
    } catch (error) {
      if (error instanceof CustomerNotFoundError || error instanceof CustomError) {
        throw error;
      }

      console.error(`❌ Failed to update customer phone: ${customerId}`, error);
      throw new CustomError('Failed to update customer phone', 500, 'CUSTOMER_PHONE_UPDATE_FAILED');
    }
  }

  private mapDocumentToEntity(doc: any): Customer {
    return new Customer(doc.customerId, doc.name, doc.email, doc.phone);
  }
}
