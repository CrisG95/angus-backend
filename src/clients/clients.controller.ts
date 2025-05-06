import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@auth/roles.guard';
import { Roles } from '@auth/roles.decorator';
import { User, UserPayload } from '@common/decorators/user.decorator';

import { PaginatedResult } from '@common/interfaces/paginated-result.interface';

import { ClientsService } from '@clients/clients.service';
import { ClientDocument } from '@clients/schemas/client.schema';
import {
  CreateClientDto,
  UpdateClientDto,
  ListClientsDto,
} from '@clients/dto/index';

@Controller('clients')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'user')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  async createClient(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.createClient(createClientDto);
  }

  @Put(':id')
  async updateClient(
    @Body() updateClientDto: UpdateClientDto,
    @User() user: UserPayload,
    @Param('id') id: string,
  ) {
    return this.clientsService.updateClient(id, updateClientDto, user.email);
  }

  @Get()
  async listClients(
    @Query() filters: ListClientsDto,
  ): Promise<PaginatedResult<ClientDocument>> {
    return this.clientsService.listClients(filters);
  }

  @Get(':id')
  async getClientById(@Param('id') id: string) {
    return this.clientsService.findById(id);
  }
}
