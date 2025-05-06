import { IsOptional, IsEnum, IsISO8601, IsString } from 'class-validator';

import { PeriodEnum } from '@orders/enums/period.enum';

export class ReportDto {
  @IsOptional()
  @IsEnum(PeriodEnum) // Valida que sea uno de los estados permitidos
  @IsString()
  readonly period?: PeriodEnum; // Filtrar por un estado específico (si se provee, sobreescribe el default)

  @IsOptional()
  @IsISO8601() // Valida que sea una fecha en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
  readonly startDate?: string; // Fecha de inicio para filtrar createdAt

  @IsOptional()
  @IsISO8601()
  readonly endDate?: string; // Fecha de fin para filtrar createdAt
}
