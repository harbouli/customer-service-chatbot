import { Customer } from '../entities/customer';

export interface ICustomerRepository {
  /**
   * Find a customer by their unique ID
   * @param id - The customer's unique identifier
   * @returns Promise resolving to Customer or null if not found
   */
  findById(id: string): Promise<Customer | null>;

  /**
   * Find a customer by their email address
   * @param email - The customer's email address
   * @returns Promise resolving to Customer or null if not found
   */
  findByEmail(email: string): Promise<Customer | null>;

  /**
   * Save (create or update) a customer
   * @param customer - The customer entity to save
   * @returns Promise that resolves when the operation completes
   */
  save(customer: Customer): Promise<void>;

  /**
   * Get all customers with optional filtering
   * @returns Promise resolving to array of all customers
   */
  findAll(): Promise<Customer[]>;

  /**
   * Delete a customer by ID
   * @param customerId - The customer's unique identifier
   * @returns Promise that resolves when the operation completes
   */
  delete(customerId: string): Promise<void>;

  /**
   * Activate a customer account
   * @param customerId - The customer's unique identifier
   * @returns Promise resolving to the updated customer
   */
  activate(customerId: string): Promise<Customer>;

  /**
   * Deactivate a customer account
   * @param customerId - The customer's unique identifier
   * @returns Promise resolving to the updated customer
   */
  deactivate(customerId: string): Promise<Customer>;

  /**
   * Get total count of customers
   * @returns Promise resolving to the total number of customers
   */
  getCustomerCount(): Promise<number>;

  /**
   * Get customer statistics and analytics
   * @returns Promise resolving to customer statistics object
   */
  getCustomerStatistics(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    customersWithPhone: number;
  }>;
}
