import { Customer } from '@domain/entities/customer';
import { ICustomerRepository } from '@domain/repositories/ICustomerRepository';

export class InMemoryCustomerRepository implements ICustomerRepository {
  private customers: Customer[] = [];

  async findById(id: string): Promise<Customer | null> {
    return this.customers.find(customer => customer.id === id) || null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return this.customers.find(customer => customer.email === email) || null;
  }

  async save(customer: Customer): Promise<void> {
    const index = this.customers.findIndex(c => c.id === customer.id);
    if (index >= 0) {
      this.customers[index] = customer;
    } else {
      this.customers.push(customer);
    }
  }

  async delete(id: string): Promise<void> {
    this.customers = this.customers.filter(c => c.id !== id);
  }

  async findAll(): Promise<Customer[]> {
    return [...this.customers];
  }

  async count(): Promise<number> {
    return this.customers.length;
  }

  // Utility methods for testing
  clear(): void {
    this.customers = [];
  }
}
