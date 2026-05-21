import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'P101', description: 'Mã phòng (chỉ chứa chữ, số, gạch dưới)' })
  @IsString({ message: 'Mã phòng phải là chuỗi ký tự' })
  @Matches(/^[a-z0-9_]+$/i, {
    message: 'Mã phòng chỉ được chứa chữ cái, số và dấu gạch dưới',
  })
  @MaxLength(64, { message: 'Mã phòng tối đa 64 ký tự' })
  code!: string;

  @ApiProperty({ example: 'Phòng 101', description: 'Tên hiển thị của phòng' })
  @IsString({ message: 'Tên phòng phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Tên phòng không được để trống' })
  @MaxLength(200, { message: 'Tên phòng tối đa 200 ký tự' })
  name!: string;

  @ApiProperty({ description: 'ID danh mục loại phòng (group = ROOM_TYPE)' })
  @IsString({ message: 'typeId phải là chuỗi ký tự' })
  typeId!: string;

  @ApiPropertyOptional({ description: 'ID danh mục khu vực (group = ROOM_AREA)' })
  @IsOptional()
  @IsString({ message: 'areaId phải là chuỗi ký tự' })
  areaId?: string;

  @ApiPropertyOptional({ default: 2, description: 'Sức chứa (số người)' })
  @IsOptional()
  @IsInt({ message: 'Sức chứa phải là số nguyên' })
  @Min(1, { message: 'Sức chứa tối thiểu là 1' })
  @Max(100, { message: 'Sức chứa tối đa là 100' })
  capacity?: number;

  @ApiProperty({ example: '850000', description: 'Giá cơ bản (Decimal as string or number)' })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value);
    return value;
  })
  @IsNumber({}, { message: 'Giá cơ bản phải là số' })
  @Min(0, { message: 'Giá cơ bản phải >= 0' })
  basePrice!: number;

  @ApiPropertyOptional({ example: '950000', description: 'Giá cuối tuần' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value);
    return value;
  })
  @IsNumber({}, { message: 'Giá cuối tuần phải là số' })
  @Min(0, { message: 'Giá cuối tuần phải >= 0' })
  weekendPrice?: number;

  @ApiPropertyOptional({ example: '1150000', description: 'Giá ngày lễ' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value);
    return value;
  })
  @IsNumber({}, { message: 'Giá ngày lễ phải là số' })
  @Min(0, { message: 'Giá ngày lễ phải >= 0' })
  holidayPrice?: number;

  @ApiProperty({ description: 'ID danh mục trạng thái phòng (group = ROOM_STATUS)' })
  @IsString({ message: 'statusId phải là chuỗi ký tự' })
  statusId!: string;

  @ApiProperty({ description: 'ID danh mục trạng thái dọn phòng (group = CLEANING_STATUS)' })
  @IsString({ message: 'cleaningStatusId phải là chuỗi ký tự' })
  cleaningStatusId!: string;

  @ApiPropertyOptional({ example: '14:00', description: 'Giờ nhận phòng mặc định (HH:mm)' })
  @IsOptional()
  @IsString({ message: 'defaultCheckIn phải là chuỗi ký tự' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'defaultCheckIn phải có định dạng HH:mm' })
  defaultCheckIn?: string;

  @ApiPropertyOptional({ example: '12:00', description: 'Giờ trả phòng mặc định (HH:mm)' })
  @IsOptional()
  @IsString({ message: 'defaultCheckOut phải là chuỗi ký tự' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'defaultCheckOut phải có định dạng HH:mm' })
  defaultCheckOut?: string;

  @ApiPropertyOptional({ type: [String], description: 'Danh sách URL ảnh' })
  @IsOptional()
  @IsArray({ message: 'images phải là mảng' })
  @IsString({ each: true, message: 'Mỗi phần tử trong images phải là chuỗi' })
  images?: string[];

  @ApiPropertyOptional({ description: 'Ghi chú thêm' })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'Ghi chú tối đa 1000 ký tự' })
  note?: string;
}
