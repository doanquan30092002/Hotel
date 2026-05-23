import { PartialType } from '@nestjs/swagger';

import { CreateFinanceTxDto } from './create-finance-tx.dto';

export class UpdateFinanceTxDto extends PartialType(CreateFinanceTxDto) {}
