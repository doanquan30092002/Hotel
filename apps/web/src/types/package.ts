// Package types — mirrors PackageEntity from BE

export type Package = {
  id: string;
  code: string;
  name: string;
  applyType: string;
  numNights: number;
  numGuests: number;
  totalPrice: string; // Decimal-as-string
  validFrom: string; // YYYY-MM-DD
  validTo: string; // YYYY-MM-DD
  detail: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatePackageInput = {
  code: string;
  name: string;
  applyType: string;
  numNights: number;
  numGuests: number;
  totalPrice: number;
  validFrom: string; // YYYY-MM-DD
  validTo: string; // YYYY-MM-DD
  detail?: string;
  active?: boolean;
};

export type UpdatePackageInput = Partial<Omit<CreatePackageInput, 'code'>>;
