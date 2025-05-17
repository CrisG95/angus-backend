import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductCategoryDocument = ProductCategory & Document;

@Schema({ timestamps: true })
export class ProductCategory {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active' })
  status: string;
}

export const ProductCategorySchema =
  SchemaFactory.createForClass(ProductCategory);
