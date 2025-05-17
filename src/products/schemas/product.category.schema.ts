import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductCategoryDocument = ProductCategory & Document;

@Schema({ timestamps: true })
export class ProductCategory {
  _id?: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active' })
  status: string;
}

export const ProductCategorySchema =
  SchemaFactory.createForClass(ProductCategory);
