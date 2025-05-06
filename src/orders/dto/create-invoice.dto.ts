import { PaymentType } from '@orders/enums/payment-type.enum';
import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateInvoiceFromOrderDto {
  @IsMongoId()
  orderId: string;

  @IsNumber()
  @Min(0)
  suggestionRate: number;

  @IsEnum(PaymentType, {
    message: `La condicion de venta debe ser uno de los siguientes valores: ${Object.values(PaymentType).join(', ')}`,
  })
  @IsNotEmpty()
  paymentType: PaymentType;
}
