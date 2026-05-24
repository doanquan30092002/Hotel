import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

export enum ReportFormat {
  XLSX = 'xlsx',
  CSV = 'csv',
}

export class QueryReportDto {
  @IsISO8601({ strict: true }, { message: 'from phải đúng định dạng ngày YYYY-MM-DD' })
  from!: string;

  @IsISO8601({ strict: true }, { message: 'to phải đúng định dạng ngày YYYY-MM-DD' })
  to!: string;
}

export class QueryReportExportDto extends QueryReportDto {
  @IsOptional()
  @IsEnum(ReportFormat, { message: 'format phải là xlsx | csv' })
  format?: ReportFormat = ReportFormat.XLSX;
}
