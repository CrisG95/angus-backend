import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

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

@Schema({ timestamps: true })
export class Product {
  _id?: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, index: true })
  category: string;

  @Prop({ required: false })
  subCategory: string;

  @Prop({ unique: true, sparse: true })
  codeBar?: string;

  @Prop({ required: true })
  priceBuy: number;

  @Prop({ required: true })
  priceSell: number;

  @Prop({ required: true, default: 0 })
  stock: number;

  @Prop({ required: true })
  unitMessure: string;

  @Prop()
  description?: string;

  @Prop()
  brand?: string;

  @Prop()
  provider?: string;

  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active' })
  status: string;

  @Prop({ type: [{ type: Object }] })
  changeHistory?: ChangeHistory[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
