import { ICustomerRepository } from '@domain/repositories/ICustomerRepository';
import { NotFoundError, ValidationError } from '@shared/errors/custom-error';

import { Customer } from '../../../infrastructure';
import { CustomerDto } from '../../dtos/customer-dto';
import { CustomerMapper } from '../../mappers/customer-mapper';

export class ActivateCustomer {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(customerId: string): Promise<CustomerDto> {
    if (!customerId || customerId.trim() === '') {
      throw new ValidationError('Customer ID is required');
    }

    // Check if customer exists
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundError(`Customer not found with ID: ${customerId}`);
    }

    // Activate customer (if repository supports it)
    if (typeof (this.customerRepository as any).activate === 'function') {
      const activatedCustomer = await this.customerRepository.activate(customerId);
      console.log(`✅ Customer activated: ${customer.email} (ID: ${customerId})`);
      return CustomerMapper.toDto(activatedCustomer);
    } else {
      throw new Error('Activate operation not supported by this repository');
    }
  }
}

export class DeactivateCustomer {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(customerId: string): Promise<CustomerDto> {
    if (!customerId || customerId.trim() === '') {
      throw new ValidationError('Customer ID is required');
    }

    // Check if customer exists
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundError(`Customer not found with ID: ${customerId}`);
    }

    // Deactivate customer (if repository supports it)
    if (typeof this.customerRepository.deactivate === 'function') {
      const deactivatedCustomer = await (this.customerRepository as any).deactivate(customerId);
      console.log(`✅ Customer deactivated: ${customer.email} (ID: ${customerId})`);
      return CustomerMapper.toDto(deactivatedCustomer);
    } else {
      throw new Error('Deactivate operation not supported by this repository');
    }
  }
}

// ============================================================================
// GET CUSTOMER STATISTICS USE CASE (New)
// ============================================================================

export interface CustomerStatistics {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  customersWithPhone: number;
  recentCustomers: CustomerDto[];
}

export class GetCustomerStatistics {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(): Promise<CustomerStatistics> {
    if (typeof (this.customerRepository as any).getCustomerStatistics !== 'function') {
      throw new Error('Statistics operation not supported by this repository');
    }

    const stats = await (this.customerRepository as any).getCustomerStatistics();

    // Get recent customers (last 10)
    let recentCustomers: CustomerDto[] = [];
    if (typeof (this.customerRepository as any).findAll === 'function') {
      const allCustomers = await (this.customerRepository as any).findAll();
      recentCustomers = allCustomers
        .slice(0, 10)
        .map((customer: Customer) => CustomerMapper.toDto(customer));
    }

    return {
      ...stats,
      recentCustomers,
    };
  }
}

// ============================================================================
// UPDATE CUSTOMER EMAIL USE CASE (New)
// ============================================================================

export class UpdateCustomerEmail {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(customerId: string, newEmail: string): Promise<CustomerDto> {
    if (!customerId || customerId.trim() === '') {
      throw new ValidationError('Customer ID is required');
    }

    if (!newEmail || newEmail.trim() === '') {
      throw new ValidationError('Email is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      throw new ValidationError('Invalid email format');
    }

    // Check if customer exists
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundError(`Customer not found with ID: ${customerId}`);
    }

    // Check if new email already exists
    const existingCustomer = await this.customerRepository.findByEmail(newEmail);
    if (existingCustomer && existingCustomer.id !== customerId) {
      throw new ValidationError('Customer with this email already exists');
    }

    // Update email (if repository supports it)
    if (typeof (this.customerRepository as any).updateEmail === 'function') {
      const updatedCustomer = await (this.customerRepository as any).updateEmail(
        customerId,
        newEmail
      );
      console.log(`✅ Customer email updated: ${customerId} -> ${newEmail}`);
      return CustomerMapper.toDto(updatedCustomer);
    } else {
      // Fallback to regular update
      const updatedCustomer = CustomerMapper.updateDomain(customer, { email: newEmail });
      await this.customerRepository.save(updatedCustomer);
      console.log(`✅ Customer email updated: ${customerId} -> ${newEmail}`);
      return CustomerMapper.toDto(updatedCustomer);
    }
  }
}

// ============================================================================
// UPDATE CUSTOMER PHONE USE CASE (New)
// ============================================================================

export class UpdateCustomerPhone {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(customerId: string, newPhone?: string): Promise<CustomerDto> {
    if (!customerId || customerId.trim() === '') {
      throw new ValidationError('Customer ID is required');
    }

    // Validate phone format if provided
    if (newPhone) {
      const phoneRegex = /^\+?[\d\s\-\\(\\)]+$/;
      if (!phoneRegex.test(newPhone)) {
        throw new ValidationError('Invalid phone number format');
      }
    }

    // Check if customer exists
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundError(`Customer not found with ID: ${customerId}`);
    }

    // Check if new phone already exists
    if (newPhone && typeof (this.customerRepository as any).findByPhone === 'function') {
      const existingPhone = await (this.customerRepository as any).findByPhone(newPhone);
      if (existingPhone && existingPhone.id !== customerId) {
        throw new ValidationError('Customer with this phone number already exists');
      }
    }

    // Update phone (if repository supports it)
    if (typeof (this.customerRepository as any).updatePhone === 'function') {
      const updatedCustomer = await (this.customerRepository as any).updatePhone(
        customerId,
        newPhone
      );
      console.log(`✅ Customer phone updated: ${customerId} -> ${newPhone || 'removed'}`);
      return CustomerMapper.toDto(updatedCustomer);
    } else {
      // Fallback to regular update
      const updatedCustomer = CustomerMapper.updateDomain(customer, { phone: newPhone });
      await this.customerRepository.save(updatedCustomer);
      console.log(`✅ Customer phone updated: ${customerId} -> ${newPhone || 'removed'}`);
      return CustomerMapper.toDto(updatedCustomer);
    }
  }
}
