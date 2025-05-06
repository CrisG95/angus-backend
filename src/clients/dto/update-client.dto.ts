import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.dto';
import {
  IsOptional,
  IsString,
  IsIn,
  IsEmail,
  ValidateNested,
  IsNumberString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from './address-client.dto';

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @IsString()
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @IsNumberString()
  @IsOptional()
  ingresosBrutos?: string;
}
