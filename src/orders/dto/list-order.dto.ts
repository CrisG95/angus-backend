// src/orders/dto/list-order.dto.ts
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsMongoId,
  IsEnum,
  IsISO8601,
  IsString,
  IsIn,
} from 'class-validator';
//import {
//  OrderPaymentStatusEnum,
//  OrderStatusEnum,
//} from '../enums/order-status.enum';
import { OrderSortableFieldsEnum } from '../enums/order-sortable-fields.enum';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class ListOrderDto {
  @IsOptional()
  @Type(() => Number) // Transforma query param string a número
  @IsInt()
  @Min(1)
  readonly page?: number = 1; // Página por defecto

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT) // Limita cuántos items se pueden pedir para evitar abuso
  readonly limit?: number = DEFAULT_LIMIT; // Límite por defecto

  @IsOptional()
  @IsMongoId()
  readonly clientId?: string; // Filtrar por cliente

  //@IsOptional()
  //@IsEnum(OrderStatusEnum) // Valida que sea uno de los estados permitidos
  //@IsString()
  //readonly status?: OrderStatusEnum; // Filtrar por un estado específico (si se provee, sobreescribe el default)

  //@IsOptional()
  //@IsEnum(OrderPaymentStatusEnum) // Valida que sea uno de los estados permitidos
  //@IsString()
  //readonly paymentStatus?: OrderPaymentStatusEnum; // Filtrar por un estado específico (si se provee, sobreescribe el default)

  @IsOptional()
  @IsString()
  readonly invoiceNumber?: string;

  @IsOptional()
  @IsISO8601() // Valida que sea una fecha en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
  readonly dateFrom?: string; // Fecha de inicio para filtrar createdAt

  @IsOptional()
  @IsISO8601()
  readonly dateTo?: string; // Fecha de fin para filtrar createdAt

  @IsOptional()
  @IsEnum(OrderSortableFieldsEnum)
  readonly sortBy?: OrderSortableFieldsEnum = OrderSortableFieldsEnum.createdAt; // Campo por defecto para ordenar

  @IsOptional()
  @IsIn(['asc', 'desc'])
  readonly sortOrder?: 'asc' | 'desc' = 'desc'; // Orden por defecto (descendente)
}
