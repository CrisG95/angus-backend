import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsOptional, IsIn } from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  name?: string;

  @IsOptional()
  category?: string;

  @IsOptional()
  subCategory?: string;

  @IsOptional()
  codeBar?: string;

  @IsOptional()
  priceBuy?: number;

  @IsOptional()
  priceSell?: number;

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
