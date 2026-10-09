import { IsIn } from 'class-validator';

export class UpdateResourceStatusDto {
  @IsIn(['enabled', 'disabled'])
  status!: 'enabled' | 'disabled';
}