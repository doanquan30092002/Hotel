import { PartialType, OmitType } from '@nestjs/swagger';

import { CreatePackageDto } from './create-package.dto';

// code is immutable post-creation — not accepted in updates
export class UpdatePackageDto extends PartialType(OmitType(CreatePackageDto, ['code'] as const)) {}
