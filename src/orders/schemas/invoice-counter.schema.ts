import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class InvoiceCounter extends Document {
  @Prop({ required: true, default: 1 })
  currentNumber: number;
}

export const InvoiceCounterSchema =
  SchemaFactory.createForClass(InvoiceCounter);
