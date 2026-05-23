// Upload domain types — mirror BE DTOs

export type UploadKind = 'ROOM_IMAGE' | 'GUEST_DOC' | 'STAFF_AVATAR' | 'OTHER';

export type EntityType = 'room' | 'customer' | 'staff' | 'other' | null;

export interface Upload {
  id: string;
  code: string;
  kind: UploadKind;
  entityType: EntityType;
  entityId: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  fileId: string | null;
  note: string | null;
  uploadedBy: { id: string; fullName: string; role: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadStats {
  total: number;
  byKind: {
    ROOM_IMAGE: number;
    GUEST_DOC: number;
    STAFF_AVATAR: number;
    OTHER: number;
  };
}

export interface UploadListQuery {
  page?: number;
  pageSize?: number;
  kind?: UploadKind;
  entityType?: string;
  entityId?: string;
  keyword?: string;
}

export interface CreateUploadInput {
  kind: UploadKind;
  entityType?: EntityType;
  entityId?: string | null;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  url: string;
  fileId?: string | null;
  note?: string | null;
}

export type UpdateUploadInput = Partial<CreateUploadInput>;
