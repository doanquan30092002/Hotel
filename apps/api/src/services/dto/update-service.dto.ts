import { PartialType, OmitType } from '@nestjs/swagger';

import { CreateServiceDto } from './create-service.dto';

// code is immutable post-creation — not accepted in updates
export class UpdateServiceDto extends PartialType(OmitType(CreateServiceDto, ['code'] as const)) {}
