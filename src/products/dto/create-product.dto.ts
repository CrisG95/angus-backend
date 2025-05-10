import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
  IsInt,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  subCategory: string;

  @IsString()
  @IsOptional()
  codeBar?: string;

  @IsNumber()
  @IsPositive()
  priceBuy: number;

  @IsNumber()
  @IsPositive()
  priceSell: number;

  @IsInt()
  @Min(0)
  stock: number;

  @IsString()
  @IsNotEmpty()
  unitMessure: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  provider?: string;
}
