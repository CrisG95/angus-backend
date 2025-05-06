import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '@users/schemas/user.schema';
import { CreateUserDto, UpdatePasswordDto } from '@users/dto/create-user.dto';

import { ERROR_MESSAGES } from '@common/errors/error-messages';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { email, password, role, name, lastname } = createUserDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException(ERROR_MESSAGES.USERS.ALREADY_EXISTS);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new this.userModel({
      email,
      password: hashedPassword,
      name,
      lastname,
      role,
    });
    return newUser.save();
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async get(): Promise<User[] | null> {
    return this.userModel.find().select('-password').exec();
  }

  async updateRefreshToken(userEmail: string, refreshToken: string | null) {
    await this.userModel
      .findOneAndUpdate({ email: userEmail }, { refreshToken })
      .exec();
  }

  async updatePasswordUser(updatePasswordUserDto: UpdatePasswordDto) {
    const { email, password } = updatePasswordUserDto;

    const existingUser = await this.userModel.findOne({ email });
    if (!existingUser) {
      throw new ConflictException(ERROR_MESSAGES.USERS.NOT_FOUND);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.userModel
      .findOneAndUpdate({ email }, { password: hashedPassword })
      .exec();

    return { message: 'Password updated successfully' };
  }
}
