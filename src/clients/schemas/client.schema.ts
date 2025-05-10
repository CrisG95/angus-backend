import { IvaCondition } from '@clients/enums/iva-condition.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClientDocument = Client & Document;

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

class Address {
  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  number: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  province: string;

  @Prop({ required: true })
  CP: string;
}
@Schema({ timestamps: true })
export class Client {
  _id?: Types.ObjectId;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  businessName: string;

  @Prop({ required: true })
  commerceName: string;

  @Prop({ required: true, type: Object })
  address: Address;

  @Prop({
    required: true,
    enum: Object.values(IvaCondition),
    default: IvaCondition.CONSUMIDOR_FINAL,
  })
  ivaCondition: string;

  @Prop({ required: true, unique: true })
  cuit: string;

  @Prop({ required: true })
  ingresosBrutos: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active' })
  status: string;

  @Prop({ type: [{ type: Object }] })
  changeHistory?: ChangeHistory[];
}

export const ClientSchema = SchemaFactory.createForClass(Client);
