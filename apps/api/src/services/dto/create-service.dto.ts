import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'DV001', description: 'Mã dịch vụ (chỉ chứa chữ, số, gạch dưới)' })
  @IsString({ message: 'Mã dịch vụ phải là chuỗi ký tự' })
  @Matches(/^[a-z0-9_]+$/i, {
    message: 'Mã dịch vụ chỉ được chứa chữ cái, số và dấu gạch dưới',
  })
  @MaxLength(64, { message: 'Mã dịch vụ tối đa 64 ký tự' })
  code!: string;

  @ApiProperty({ example: 'Ăn sáng', description: 'Tên dịch vụ' })
  @IsString({ message: 'Tên dịch vụ phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Tên dịch vụ không được để trống' })
  @MaxLength(200, { message: 'Tên dịch vụ tối đa 200 ký tự' })
  name!: string;

  @ApiProperty({ description: 'ID danh mục nhóm dịch vụ (group = SERVICE_GROUP)' })
  @IsString({ message: 'groupId phải là chuỗi ký tự' })
  groupId!: string;

  @ApiProperty({ description: 'ID danh mục đơn vị tính (group = UNIT)' })
  @IsString({ message: 'unitId phải là chuỗi ký tự' })
  unitId!: string;

  @ApiProperty({ example: '80000', description: 'Đơn giá (Decimal dạng chuỗi hoặc số)' })
  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined) return value;
    return String(value);
  })
  @IsString({ message: 'Đơn giá phải là số hoặc chuỗi số' })
  price!: string;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái hoạt động' })
  @IsOptional()
  @IsBoolean({ message: 'active phải là boolean' })
  active?: boolean;

  @ApiPropertyOptional({ description: 'Ghi chú thêm' })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'Ghi chú tối đa 1000 ký tự' })
  note?: string;
}
