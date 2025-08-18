import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
//import {
//  OrderPaymentStatusEnum,
//  OrderStatusEnum,
//} from '../enums/order-status.enum';
//import { PdfGenerationStatus } from '@orders/enums/pdf-generation-status.enum';

export type OrderDocument = Order & Document;

class ChangeHistory {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  user: string;

  @Prop({
    type: [{ field: String, before: String, after: String }],
    required: true,
  })
  changes: { field: string; before: string; after: string }[];
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true, type: Number })
  unitPrice: number;

  @Prop({ required: true, type: Number })
  unitMessure: number;

  @Prop({ required: false, type: Number })
  suggestedPrice?: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Client' })
  clientId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  //@Prop({
  //  required: true,
  //  enum: OrderStatusEnum,
  //  default: OrderStatusEnum.EN_PROCESO,
  //})
  //status: string;

  //@Prop({
  //  required: true,
  //  enum: OrderPaymentStatusEnum,
  //  default: OrderPaymentStatusEnum.NO_FACTURADO,
  //})
  //paymentStatus: string;

  @Prop({ required: true, type: Number })
  totalAmount: number;

  @Prop({ required: true, type: Number })
  subTotal: number;

  @Prop({ type: [{ type: Object }] })
  changeHistory?: ChangeHistory[];

  //@Prop({
  //  required: false,
  //  default: null,
  //})
  //pdfUrl: string;

  //@Prop({
  //  required: true,
  //  enum: PdfGenerationStatus,
  //  default: PdfGenerationStatus.PENDING,
  //})
  //pdfStatus: string;

  @Prop({
    required: false,
  })
  invoiceNumber: string;

  @Prop({
    required: false,
  })
  increasePercentaje: number;

  @Prop({
    required: false,
  })
  discountPercentaje: number;

  @Prop({
    required: false,
  })
  discountAmount: number;

  @Prop({
    required: false,
  })
  suggestedPriceRate: number; // <- nuevo campo
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ createdAt: -1 });
//OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ clientId: 1, createdAt: -1 });
//OrderSchema.index({ paymentStatus: 1 });
