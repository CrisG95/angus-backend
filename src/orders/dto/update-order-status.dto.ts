import { IsEnum } from 'class-validator';
import { OrderStatusEnum } from '@orders/enums/order-status.enum';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatusEnum, { message: 'Estado inválido' })
  readonly status: OrderStatusEnum;
}
