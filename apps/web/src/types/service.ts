// Service types — mirrors ServiceEntity from BE

export type ServiceCategory = {
  id: string;
  code: string;
  name: string;
};

export type Service = {
  id: string;
  code: string;
  name: string;
  groupId: string;
  group: ServiceCategory;
  unitId: string;
  unit: ServiceCategory;
  price: string; // Decimal-as-string
  active: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateServiceInput = {
  code: string;
  name: string;
  groupId: string;
  unitId: string;
  price: number;
  active?: boolean;
  note?: string;
};

export type UpdateServiceInput = Partial<Omit<CreateServiceInput, 'code'>>;
