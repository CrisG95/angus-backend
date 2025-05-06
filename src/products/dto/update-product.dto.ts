import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsOptional, IsIn } from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  name?: string;

  @IsOptional()
  category?: string;

  @IsOptional()
  codeBar?: string;

  @IsOptional()
  price?: number;

  @IsOptional()
  priceIva?: number;

  @IsOptional()
  iva?: number;

  @IsOptional()
  stock?: number;

  @IsOptional()
  unitMessure?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  brand?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @IsOptional()
  provider?: string;
}
