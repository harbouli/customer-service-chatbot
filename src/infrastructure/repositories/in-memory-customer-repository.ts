import { Customer } from "@domain/entities/customer";
import { ICustomerRepository } from "@domain/repositories/ICustomerRepository";

export class InMemoryCustomerRepository implements ICustomerRepository {
  private customers: Customer[] = [
    new Customer("1", "John Doe", "john@example.com", "+1234567890"),
    new Customer("2", "Jane Smith", "jane@example.com", "+0987654321"),
    new Customer("3", "Mike Johnson", "mike@example.com", "+1122334455"),
    new Customer("4", "Sarah Wilson", "sarah@example.com", "+5566778899"),
  ];

  async findById(id: string): Promise<Customer | null> {
    return this.customers.find((customer) => customer.id === id) || null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return this.customers.find((customer) => customer.email === email) || null;
  }

  async save(customer: Customer): Promise<void> {
    const index = this.customers.findIndex((c) => c.id === customer.id);
    if (index >= 0) {
      this.customers[index] = customer;
    } else {
      this.customers.push(customer);
    }
  }

  async delete(id: string): Promise<void> {
    this.customers = this.customers.filter((c) => c.id !== id);
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

  seed(): void {
    this.customers = [
      new Customer("1", "John Doe", "john@example.com", "+1234567890"),
      new Customer("2", "Jane Smith", "jane@example.com", "+0987654321"),
      new Customer("3", "Mike Johnson", "mike@example.com", "+1122334455"),
      new Customer("4", "Sarah Wilson", "sarah@example.com", "+5566778899"),
    ];
  }
}
