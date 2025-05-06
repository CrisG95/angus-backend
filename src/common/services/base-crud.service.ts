import { NotFoundException } from '@nestjs/common';
import {
  Model,
  Document,
  ClientSession,
  PopulateOptions,
  MongooseBulkWriteOptions,
  FilterQuery,
  UpdateQuery,
} from 'mongoose';
import {
  FindOptions,
  UpdateOptions,
} from '@common/interfaces/mongoose.interface';
import { PaginatedResult } from '@common/interfaces/paginated-result.interface';

export abstract class BaseCrudService<TDoc extends Document> {
  constructor(protected readonly model: Model<TDoc>) {}

  async findById(
    id: string,
    { session, lean = false, populate }: FindOptions = {},
  ): Promise<TDoc> {
    let query = this.model.findById(id, null, { session });

    if (lean) query.lean();

    if (populate) {
      const pops = Array.isArray(populate)
        ? (populate as PopulateOptions[]).map((p) =>
            typeof p === 'string' ? ({ path: p } as PopulateOptions) : p,
          )
        : (populate as PopulateOptions);
      query = query.populate(pops);
    }

    return query
      .orFail(
        new NotFoundException(
          `${this.model.modelName} con ID ${id} no encontrado`,
        ),
      )
      .exec() as Promise<TDoc>;
  }

  async find(
    filter: Record<string, any> = {},
    {
      session,
      lean = false,
      populate,
      sort = {},
      skip = 0,
      limit = 0,
      projection,
    }: FindOptions = {},
  ): Promise<TDoc[]> {
    let query = this.model
      .find(filter, projection, { session })
      .lean(lean) as any;

    if (populate) {
      const popDefs = Array.isArray(populate)
        ? populate.map((p) =>
            typeof p === 'string' ? ({ path: p } as PopulateOptions) : p,
          )
        : populate;
      query = query.populate(popDefs);
    }

    query = query.sort(sort).skip(skip).limit(limit);

    return query.exec() as Promise<TDoc[]>;
  }

  async paginate(
    filter: Record<string, any> = {},
    {
      session,
      lean = false,
      populate,
      sort = {},
      page = 1,
      limit = 10,
      projection,
    }: FindOptions & { page?: number; limit?: number },
  ): Promise<PaginatedResult<TDoc>> {
    // Cálculo de skip según página
    const skip = (page - 1) * limit;

    // 1) Datos de la página actual
    const data = await this.find(filter, {
      session,
      lean,
      populate,
      sort,
      skip,
      limit,
      projection,
    });

    // 2) Conteo total de documentos
    const totalDocuments = await this.model
      .countDocuments(filter)
      .session(session)
      .exec();

    // 3) Cálculo de totalPages y flags next/prev
    const totalPages = Math.ceil(totalDocuments / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data,
      page,
      limit,
      totalDocuments,
      totalPages,
      hasNextPage,
      hasPrevPage,
    };
  }

  async findOneAndUpdate(
    filter: FilterQuery<TDoc>,
    update: UpdateQuery<TDoc>,
    {
      session,
      lean = false,
      populate,
      projection,
      returnNew = true,
      upsert = false,
    }: UpdateOptions = {},
  ): Promise<TDoc> {
    // 1) Construye la query con las opciones de mongoose
    let query = this.model.findOneAndUpdate(filter, update, {
      session,
      projection,
      new: returnNew,
      upsert,
    }) as any; // casteamos para aplicar lean() sin error de firma

    // 2) Aplica lean()
    query = query.lean(lean);

    // 3) Normaliza y aplica populate()
    if (populate) {
      const pops = Array.isArray(populate)
        ? populate.map((p) => (typeof p === 'string' ? { path: p } : p))
        : populate;
      query = query.populate(pops as PopulateOptions[]);
    }

    // 4) Ejecuta y devuelve
    return query.exec() as Promise<TDoc>;
  }

  async bulkWrite(
    operations: any[],
    options?: MongooseBulkWriteOptions & { session?: ClientSession },
  ): Promise<any> {
    return this.model.bulkWrite(operations, options);
  }
}
