import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  lastname: string;

  @Prop({ required: true, enum: ['user', 'admin'] })
  role: string;

  @Prop({ default: null }) // 🔹 Guardamos el refresh token
  refreshToken: string | null;

  _id?: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
