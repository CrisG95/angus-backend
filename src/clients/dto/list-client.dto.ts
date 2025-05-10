import { IvaCondition } from '@clients/enums/iva-condition.enum';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsIn,
  IsNumber,
  IsNumberString,
  Min,
  Max,
  IsEnum,
} from 'class-validator';

export class ListClientsDto {
  @IsOptional()
  @IsString()
  name?: string; // Búsqueda parcial por nombre

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  cuit?: string; // Filtrar por CUIT

  @IsOptional()
  @IsString()
  businessName?: string; // Filtrar por RAZON SOCIAL

  @IsOptional()
  @IsString()
  commerceName?: string; // Filtrar por NOMBRE DE COMERCIO

  @IsOptional()
  @IsEnum(IvaCondition, {
    message: `La condición de IVA debe ser uno de los isguientes valores: ${Object.values(IvaCondition).join(', ')}`,
  })
  ivaCondition?: IvaCondition; // Filtrar por condición de IVA

  @IsOptional()
  @IsNumberString()
  ingresosBrutos?: string; // Filtrar por ingresos brutos

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string; // Filtrar por estado del cliente

  @IsOptional()
  @IsString()
  city?: string; // Filtrar por ciudad

  @IsOptional()
  @IsString()
  province?: string; // Filtrar por provincia

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  page?: number = 1; // Paginación

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10; // Límite de resultados por página
}
