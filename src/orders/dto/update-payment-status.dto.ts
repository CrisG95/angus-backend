import { IsEnum } from 'class-validator';
import { OrderPaymentStatusEnum } from '@orders/enums/order-status.enum';

export class UpdatePaymentStatusDto {
  @IsEnum(OrderPaymentStatusEnum, { message: 'Estado de pago inválido' })
  readonly paymentStatus: OrderPaymentStatusEnum;
}
