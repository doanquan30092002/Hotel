import { PartialType } from '@nestjs/swagger';
import { CreateHousekeepingTaskDto } from './create-housekeeping-task.dto';

export class UpdateHousekeepingTaskDto extends PartialType(CreateHousekeepingTaskDto) {}
