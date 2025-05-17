import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { omitBy, isNil } from 'lodash';

import { Client, ClientDocument } from '@clients/schemas/client.schema';
import {
  CreateClientDto,
  UpdateClientDto,
  ListClientsDto,
} from '@clients/dto/index';
import { generateChangeHistory } from '@helpers/history.helper';

import { BaseCrudService } from '@common/services/base-crud.service';

import { PaginatedResult } from '@common/interfaces/paginated-result.interface';
import { toUppercaseStrings } from '@common/functions/toUpperCase.function';

@Injectable()
export class ClientsService extends BaseCrudService<ClientDocument> {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
  ) {
    super(clientModel);
  }

  async createClient(createClientDto: CreateClientDto): Promise<Client> {
    try {
      const uppercasedDto = toUppercaseStrings(createClientDto);
      const newClient = new this.clientModel({
        ...uppercasedDto,
      });
      return await newClient.save();
    } catch (error) {
      throw new ConflictException(error.message);
    }
  }

  async updateClient(
    id: string,
    updateClientDto: UpdateClientDto,
    userEmail: string,
  ): Promise<ClientDocument> {
    const existing = await this.findById(id, { lean: true });

    const changeEntry = generateChangeHistory(
      existing,
      updateClientDto,
      userEmail,
    );

    const updateOps: any = { ...updateClientDto };
    if (changeEntry) {
      updateOps.$push = { changeHistory: changeEntry };
    }
    try {
      const updated = await this.findOneAndUpdate({ _id: id }, updateOps, {
        lean: true,
        projection: '-__v',
        returnNew: true,
      });
      return updated;
    } catch (err) {
      throw new ConflictException(err.message);
    }
  }

  async listClients(
    filters: ListClientsDto,
  ): Promise<PaginatedResult<ClientDocument>> {
    const {
      name,
      email,
      cuit,
      ivaCondition,
      ingresosBrutos,
      businessName,
      commerceName,
      status,
      city,
      province,
      page = 1,
      limit = 10,
    } = filters;

    const filter = omitBy(
      {
        name: name ? new RegExp(name, 'i') : undefined,
        email,
        cuit,
        ivaCondition,
        ingresosBrutos,
        businessName: businessName ? new RegExp(businessName, 'i') : undefined,
        commerceName: commerceName ? new RegExp(commerceName, 'i') : undefined,
        status,
        'address.city': city ? new RegExp(city, 'i') : undefined,
        'address.province': province ? new RegExp(province, 'i') : undefined,
      },
      isNil,
    );

    return this.paginate(filter, {
      skip: (page - 1) * limit,
      limit,
      lean: true,
      sort: { name: 1 },
      projection: '-changeHistory -__v',
    });
  }
}
