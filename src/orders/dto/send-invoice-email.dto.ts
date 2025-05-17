import { IsString, IsNotEmpty } from 'class-validator';

export class InvoiceEmailDto {
  @IsNotEmpty()
  @IsString()
  readonly orderId?: string;
}
