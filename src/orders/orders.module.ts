import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from '@orders/orders.service';
import { OrdersController } from '@orders/orders.controller';
import { Order, OrderSchema } from '@orders/schemas/order.schema';

import { ProductsModule } from '@products/products.module';
import { ClientsModule } from '@clients/clients.module';
import { S3Service } from '@common/services/s3.service';
import { PDFService } from '@common/services/pdf.service';
import { InvoiceCounterService } from '@orders/invoice-counter.service';
import { SendGridService } from '@SendGrid/sendgrid.service';
import {
  InvoiceCounter,
  InvoiceCounterSchema,
} from '@orders/schemas/invoice-counter.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: InvoiceCounter.name, schema: InvoiceCounterSchema },
    ]),
    ProductsModule,
    ClientsModule,
  ],
  providers: [
    OrdersService,
    S3Service,
    PDFService,
    InvoiceCounterService,
    SendGridService,
  ],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
