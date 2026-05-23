import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { UploadKind } from '@prisma/client';

type UserRef = { id: string; fullName: string; role: string };

type UploadRow = {
  id: string;
  code: string;
  kind: UploadKind;
  entityType: string | null;
  entityId: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  fileId: string | null;
  note: string | null;
  uploadedBy: { id: string; fullName: string; role: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

export class UploadEntity {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty({ enum: UploadKind }) kind!: UploadKind;
  @ApiPropertyOptional() entityType!: string | null;
  @ApiPropertyOptional() entityId!: string | null;
  @ApiProperty() fileName!: string;
  @ApiProperty() fileSize!: number;
  @ApiProperty() mimeType!: string;
  @ApiProperty() url!: string;
  @ApiPropertyOptional() fileId!: string | null;
  @ApiPropertyOptional() note!: string | null;
  @ApiPropertyOptional() uploadedBy!: UserRef | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  static from(u: UploadRow): UploadEntity {
    const e = new UploadEntity();
    e.id = u.id;
    e.code = u.code;
    e.kind = u.kind;
    e.entityType = u.entityType;
    e.entityId = u.entityId;
    e.fileName = u.fileName;
    e.fileSize = u.fileSize;
    e.mimeType = u.mimeType;
    e.url = u.url;
    e.fileId = u.fileId;
    e.note = u.note;
    e.uploadedBy = u.uploadedBy
      ? { id: u.uploadedBy.id, fullName: u.uploadedBy.fullName, role: u.uploadedBy.role }
      : null;
    e.createdAt = u.createdAt.toISOString();
    e.updatedAt = u.updatedAt.toISOString();
    return e;
  }
}
