import { PaymentType } from '@orders/enums/payment-type.enum';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateInvoiceFromOrderDto {
  @IsMongoId()
  orderId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  suggestionRate: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  increase?: number;

  @IsEnum(PaymentType, {
    message: `La condicion de venta debe ser uno de los siguientes valores: ${Object.values(PaymentType).join(', ')}`,
  })
  @IsNotEmpty()
  paymentType: PaymentType;
}
