// Customer types — mirror BE CustomerEntity + DTOs

export type CategoryRef = {
  id: string;
  code: string;
  name: string;
};

export type Customer = {
  id: string;
  code: string;
  fullName: string;
  phone: string | null;
  idNumber: string | null;
  email: string | null;
  address: string | null;
  nationality: string | null;
  sourceId: string | null;
  source: CategoryRef | null;
  note: string | null;
  docs: string[];
  createdAt: string;
  updatedAt: string;
};

export type CustomerQuery = {
  keyword?: string;
  sourceId?: string;
  page?: number;
  pageSize?: number;
};

export type CreateCustomerInput = {
  code: string;
  fullName: string;
  phone?: string;
  idNumber?: string;
  email?: string;
  address?: string;
  nationality?: string;
  sourceId?: string;
  note?: string;
  docs?: string[];
};

export type UpdateCustomerInput = Partial<Omit<CreateCustomerInput, 'code'>>;
