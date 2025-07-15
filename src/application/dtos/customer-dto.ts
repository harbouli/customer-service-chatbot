export interface CustomerDto {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface CreateCustomerDto {
  name: string;
  email: string;
  phone?: string;
}

export interface UpdateCustomerDto {
  name?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
}
