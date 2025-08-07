import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, Min, IsOptional } from 'class-validator';
import { CreateOrderDto } from './create-order.dto';

export class PatchOrderDto extends PartialType(CreateOrderDto) {
  @IsOptional()
  @IsNumber()
  @Min(0)
  increase?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  decrease?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  suggestedPriceRate?: number;
}
