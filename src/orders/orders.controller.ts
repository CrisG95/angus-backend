import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Query,
  UseGuards,
  Param,
  //Patch,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@auth/roles.guard';
import { Roles } from '@auth/roles.decorator';
import { User, UserPayload } from '@common/decorators/user.decorator';

import { PaginatedResult } from '@common/interfaces/paginated-result.interface';

import { OrdersService } from '@orders/orders.service';
import { OrderDocument } from '@orders/schemas/order.schema';
import {
  CreateOrderDto,
  UpdateOrderDto,
  ListOrderDto,
  //UpdateOrderStatusDto,
  //UpdatePaymentStatusDto,
  //CreateInvoiceFromOrderDto,
  //InvoiceEmailDto,
} from '@orders/dto/index';

import { ValidateObjectIdPipe } from '@common/pipes/validate-object-id.pipes';
import { ReportDto } from './dto/report.dto';

@Controller('orders')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'user')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @User() user: UserPayload,
  ) {
    return this.ordersService.createOrder(createOrderDto, user.email);
  }

  @Put(':id')
  async updateOrder(
    @Body() updateOrderDto: UpdateOrderDto,
    @User() user: UserPayload,
    @Param('id', ValidateObjectIdPipe) id: string,
  ) {
    return this.ordersService.updateOrder(id, updateOrderDto, user.email);
  }

  //@Patch(':id/status')
  //async updateStatus(
  //  @Param('id', ValidateObjectIdPipe) id: string,
  //  @Body() dto: UpdateOrderStatusDto,
  //  @User() user: UserPayload,
  //): Promise<OrderDocument> {
  //  return this.ordersService.changeOrderStatus(id, dto.status, user.email);
  //}

  //@Patch(':id/payment-status')
  //async updatePaymentStatus(
  //  @Param('id', ValidateObjectIdPipe) id: string,
  //  @Body() dto: UpdatePaymentStatusDto,
  //  @User() user: UserPayload,
  //): Promise<OrderDocument> {
  //  return this.ordersService.changePaymentStatus(
  //    id,
  //    dto.paymentStatus,
  //    user.email,
  //  );
  //}

  //@Post('invoice')
  //async createInvoice(
  //  @Body() dto: CreateInvoiceFromOrderDto,
  //  @User() user: UserPayload,
  //) {
  //  return this.ordersService.createInvoice({ ...dto, user: user.email });
  //}

  //@Post('invoice/email')
  //async sendInvoiceByEmail(
  //  @Body() dto: InvoiceEmailDto,
  //  @User() user: UserPayload,
  //) {
  //  return this.ordersService.sendInvoiceEmail({ ...dto, user: user.email });
  //}

  @Get('invoice/report')
  async getInvoiceReport(@Query() filters: ReportDto) {
    return this.ordersService.getInvoiceReport(filters);
  }

  @Get()
  async listOrders(
    @Query() filters: ListOrderDto,
  ): Promise<PaginatedResult<OrderDocument>> {
    return this.ordersService.findAll(filters);
  }

  @Get(':id')
  async getOrderById(@Param('id', ValidateObjectIdPipe) id: string) {
    return this.ordersService.findOrderByIdWithClient(id);
  }
}
