import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  ValidateNested,
  IsNumberString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from '@clients/dto/address-client.dto';
import { IvaCondition } from '@clients/enums/iva-condition.enum';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsNotEmpty()
  address: AddressDto;

  @IsEnum(IvaCondition, {
    message: `La condición de IVA debe ser uno de los siguientes valores: ${Object.values(IvaCondition).join(', ')}`,
  })
  @IsNotEmpty()
  ivaCondition: IvaCondition;

  @IsString()
  @IsNotEmpty()
  cuit: string;

  @IsNumberString()
  @IsNotEmpty()
  ingresosBrutos: string;

  @IsString()
  @IsOptional()
  description?: string;
}
