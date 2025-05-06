import { Controller, Post, Body, UseGuards, Put, Get } from '@nestjs/common';
import { UsersService } from '@users/users.service';
import { CreateUserDto, UpdatePasswordDto } from '@users/dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@auth/roles.guard';
import { Roles } from '@auth/roles.decorator';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @Roles('admin')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Get()
  @Roles('admin')
  async listUsers() {
    return this.usersService.get();
  }

  @Put('password')
  @Roles('admin')
  async updatePasswordUser(@Body() updatePasswordUser: UpdatePasswordDto) {
    return this.usersService.updatePasswordUser(updatePasswordUser);
  }
}
