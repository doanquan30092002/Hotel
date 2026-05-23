import { OmitType, PartialType } from '@nestjs/swagger';

import { CreatePayrollDto } from './create-payroll.dto';

export class UpdatePayrollDto extends PartialType(OmitType(CreatePayrollDto, [] as const)) {}
