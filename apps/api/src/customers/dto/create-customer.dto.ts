import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'KH001', description: 'Mã khách hàng (chỉ chứa chữ, số, gạch dưới)' })
  @IsString({ message: 'Mã khách hàng phải là chuỗi ký tự' })
  @Matches(/^[a-z0-9_]+$/i, {
    message: 'Mã khách hàng chỉ được chứa chữ cái, số và dấu gạch dưới',
  })
  @MaxLength(64, { message: 'Mã khách hàng tối đa 64 ký tự' })
  code!: string;

  @ApiProperty({ example: 'Nguyễn Minh Anh', description: 'Họ tên đầy đủ' })
  @IsString({ message: 'Họ tên phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Họ tên không được để trống' })
  @MaxLength(200, { message: 'Họ tên tối đa 200 ký tự' })
  fullName!: string;

  @ApiPropertyOptional({ example: '0901234567', description: 'Số điện thoại' })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @Matches(/^\+?[0-9]{8,15}$/, {
    message: 'Số điện thoại không hợp lệ (chấp nhận 8–15 chữ số, có thể bắt đầu bằng +)',
  })
  phone?: string;

  @ApiPropertyOptional({ example: '001234567890', description: 'Số CCCD hoặc hộ chiếu' })
  @IsOptional()
  @IsString({ message: 'Số CCCD/Hộ chiếu phải là chuỗi ký tự' })
  @MaxLength(50, { message: 'Số CCCD/Hộ chiếu tối đa 50 ký tự' })
  idNumber?: string;

  @ApiPropertyOptional({ example: 'kh001@example.com', description: 'Địa chỉ email' })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(200, { message: 'Email tối đa 200 ký tự' })
  email?: string;

  @ApiPropertyOptional({ example: '12 Lê Lợi, Hà Nội', description: 'Địa chỉ' })
  @IsOptional()
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Địa chỉ tối đa 500 ký tự' })
  address?: string;

  @ApiPropertyOptional({ example: 'Việt Nam', description: 'Quốc tịch' })
  @IsOptional()
  @IsString({ message: 'Quốc tịch phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'Quốc tịch tối đa 100 ký tự' })
  nationality?: string;

  @ApiPropertyOptional({ description: 'ID danh mục nguồn khách (group = GUEST_SOURCE)' })
  @IsOptional()
  @IsString({ message: 'sourceId phải là chuỗi ký tự' })
  sourceId?: string;

  @ApiPropertyOptional({ description: 'Ghi chú thêm' })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'Ghi chú tối đa 1000 ký tự' })
  note?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Danh sách URL tài liệu đính kèm (tối đa 20)',
  })
  @IsOptional()
  @IsArray({ message: 'docs phải là mảng' })
  @IsString({ each: true, message: 'Mỗi phần tử trong docs phải là chuỗi' })
  @ArrayMaxSize(20, { message: 'docs tối đa 20 phần tử' })
  docs?: string[];
}
