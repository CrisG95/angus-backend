import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  //Logger,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import {
  Model,
  Connection,
  ClientSession,
  Types,
  FilterQuery,
  PipelineStage,
} from 'mongoose';
//import { isNil } from 'lodash';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

import { Order, OrderDocument, OrderItem } from '@orders/schemas/order.schema';

import {
  CreateOrderDto,
  UpdateOrderDto,
  ListOrderDto,
  //CreateInvoiceFromOrderDto,
  //InvoiceEmailDto,
} from '@orders/dto/index';

import { ProductDocument } from '@products/schemas/product.schema';
//import {
//  OrderPaymentStatusEnum,
//  OrderStatusEnum,
//} from '@orders/enums/order-status.enum';
import { PaginatedResult } from '@common/interfaces/paginated-result.interface';
import { roundDecimal } from '@common/functions/round.function';

import { ProductsService } from '@products/products.service';
import { ClientsService } from '@clients/clients.service';
import { BaseCrudService } from '@common/services/base-crud.service';
//import { SendGridService } from '@SendGrid/sendgrid.service';

//import { generateChangeHistory } from '@helpers/history.helper';
import { ERROR_MESSAGES } from '@common/errors/error-messages';
//import { PdfGenerationStatus } from '@orders/enums/pdf-generation-status.enum';

//import { S3Service } from '@common/services/s3.service';
//import { PDFService } from '@common/services/pdf.service';
import { InvoiceCounterService } from '@orders/invoice-counter.service';
import { ReportDto } from './dto/report.dto';
import { PatchOrderDto } from './dto/patch-order.dto';

@Injectable()
export class OrdersService extends BaseCrudService<OrderDocument> {
  //private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly productsService: ProductsService,
    private readonly clientsService: ClientsService,
    //private readonly s3Service: S3Service,
    //private readonly pdfService: PDFService,
    private readonly invoiceCounterService: InvoiceCounterService,
    //private readonly sendGridService: SendGridService,
  ) {
    super(orderModel);
  }

  async createOrder(dto: CreateOrderDto, user: string): Promise<OrderDocument> {
    if (!dto.items?.length) {
      throw new BadRequestException(ERROR_MESSAGES.ORDERS.NO_ITEMS);
    }
    const session = await this.connection.startSession();

    try {
      let createdOrder: OrderDocument;

      await session.withTransaction(async () => {
        await this.clientsService.findById(dto.clientId, {
          session,
          lean: true,
        });

        const productIds = dto.items.map((item) => item.productId);

        const products = await this.productsService.find(
          { _id: { $in: productIds } },
          { session, lean: false },
        );

        //TODOO CHEQUEAR SI ES NECESARIO
        const productMap = new Map<string, ProductDocument>();
        products.forEach((p) => productMap.set(p._id.toString(), p));

        if (productMap.size !== productIds.length) {
          const foundIds = new Set(productMap.keys());
          const notFound = productIds.find((id) => !foundIds.has(id));
          throw new NotFoundException(
            ERROR_MESSAGES.PRODUCTS.NOT_FOUND(notFound),
          );
        }
        ////////

        const orderItems: OrderItem[] = []; // Array para los items formateados
        let subTotal = 0;

        for (const itemDto of dto.items) {
          const product = productMap.get(itemDto.productId);

          const unitPrice = product.priceSell; // Precio base del producto

          orderItems.push({
            productId: new Types.ObjectId(itemDto.productId), // Asegurar ObjectId
            quantity: itemDto.quantity,
            unitPrice, // Guardar precio unitario histórico
          });

          subTotal += itemDto.quantity * unitPrice;
        }

        /////////

        for (const { productId, quantity } of dto.items) {
          const product = productMap.get(productId);
          const updatedProduct = await this.productsService.findOneAndUpdate(
            {
              _id: productId,
              stock: { $gte: quantity },
            },
            { $inc: { stock: -quantity } },
            { session, returnNew: false },
          );

          //TODO: REVISAR SI ES NECESARIO
          if (!updatedProduct) {
            // Si falla, es por stock insuficiente (ya validamos que existe)
            throw new ConflictException(
              ERROR_MESSAGES.PRODUCTS.INSUFFICIENT_STOCK(product.name) +
                ERROR_MESSAGES.ORDERS.REQUIRED_AVAILABLE(
                  quantity,
                  product.stock,
                ),
            );
          }
          ////////////
        }

        const totalAmount = roundDecimal(subTotal);

        // 6. Preparar Datos Finales de la Orden
        const initialChange = {
          date: new Date(),
          user,
          changes: [{ field: 'create', before: '', after: 'Order created' }],
        };

        const invoiceNumber =
          await this.invoiceCounterService.getNextInvoiceNumber();

        const newOrderData = {
          clientId: new Types.ObjectId(dto.clientId),
          items: orderItems, // Usar el array mapeado con precios
          //status: OrderStatusEnum.EN_PROCESO, // Estado inicial por defecto
          //paymentStatus: OrderPaymentStatusEnum.NO_FACTURADO, // Estado de pago inicial
          invoiceNumber,
          changeHistory: [initialChange],
          subTotal: roundDecimal(subTotal),
          totalAmount,
        };

        const [orderDoc] = await this.orderModel.create([newOrderData], {
          session,
        });

        createdOrder = orderDoc;
      });

      return createdOrder!;
    } finally {
      session.endSession();
    }
  }

  async updateOrder(
    orderId: string,
    dto: UpdateOrderDto,
    userEmail: string,
  ): Promise<OrderDocument> {
    if (!dto.items?.length) {
      throw new BadRequestException(ERROR_MESSAGES.ORDERS.NO_ITEMS);
    }

    const session = await this.connection.startSession();

    return session.withTransaction(async (session) => {
      // 1) Traer la orden completa + cliente IVA
      const order = await this.findById(orderId, {
        session,
        populate: { path: 'clientId', select: 'ivaCondition' },
      });

      // 3) Comparar y ajustar items + stock
      let newItems;
      let newSubTotal = 0;
      let hasSuggestedPrice = false;
      if (order.suggestedPriceRate) hasSuggestedPrice = true;

      if (dto.items) {
        // 3.a) calcular ajustes de stock
        const originalQty = new Map(
          order.items.map((i) => [i.productId.toString(), i.quantity]),
        );
        const newQty = new Map(dto.items.map((i) => [i.productId, i.quantity]));
        const adjustments = this.calculateStockAdjustments(originalQty, newQty);

        // 3.b) traer todos los productos involucrados
        const allIds = Array.from(
          new Set([...originalQty.keys(), ...newQty.keys()]),
        );
        const products = await this.productsService.find(
          { _id: { $in: allIds } },
          { session },
        );
        const productMap = new Map(products.map((p) => [p._id.toString(), p]));

        // 3.c) validar stock suficiente antes de aplicar ajustes
        for (const [productId, adjustment] of adjustments.entries()) {
          if (adjustment > 0) {
            // aumento en cantidad => requiere stock
            const product = productMap.get(productId);
            if (!product) {
              throw new NotFoundException(
                ERROR_MESSAGES.PRODUCTS.NOT_FOUND(productId),
              );
            }
            if (product.stock < adjustment) {
              throw new ConflictException(
                ERROR_MESSAGES.PRODUCTS.INSUFFICIENT_STOCK(product.name) +
                  ERROR_MESSAGES.ORDERS.REQUIRED_AVAILABLE(
                    adjustment,
                    product.stock,
                  ),
              );
            }
          }
        }

        // 3.d) aplicar ajustes atómicos
        await this.applyStockAdjustments(adjustments, session);

        // 3.e) reconstruir items + subtotal
        newItems = dto.items.map((item) => {
          const price = productMap.get(item.productId)!.priceSell;
          newSubTotal += item.quantity * price;
          return {
            productId: new Types.ObjectId(item.productId),
            quantity: item.quantity,
            unitPrice: price,
            suggestedPrice: hasSuggestedPrice
              ? parseFloat(
                  (price * (1 + order.suggestedPriceRate / 100)).toFixed(2),
                )
              : undefined,
          };
        });
      }

      const newTotal = roundDecimal(newSubTotal);

      // 5) Generar historial de cambios
      const changes = [];
      if (dto.items) {
        changes.push({
          field: 'items',
          before: order.items,
          after: newItems,
        });
      }
      if (roundDecimal(order.subTotal) !== roundDecimal(newSubTotal)) {
        changes.push({
          field: 'subTotal',
          before: order.subTotal.toString(),
          after: newSubTotal.toString(),
        });
      }
      if (roundDecimal(order.totalAmount) !== newTotal) {
        changes.push({
          field: 'totalAmount',
          before: order.totalAmount.toString(),
          after: newTotal.toString(),
        });
      }

      // 6) Empaquetar el update
      const updateOps: any = {
        items: newItems,
        subTotal: roundDecimal(newSubTotal),
        totalAmount: newTotal,
      };
      if (changes.length) {
        updateOps.$push = {
          changeHistory: { date: new Date(), user: userEmail, changes },
        };
      }

      // 7) Aplicar el update con nuestro genérico
      const updated = await this.findOneAndUpdate({ _id: orderId }, updateOps, {
        session,
        returnNew: true,
        lean: true,
      });

      return updated;
    });
  }

  async adjustPrices(
    id: string,
    dto: PatchOrderDto,
    userEmail: string,
  ): Promise<any> {
    const { increase, decrease, suggestedPriceRate } = dto;

    if (
      increase === undefined &&
      decrease === undefined &&
      suggestedPriceRate === undefined
    ) {
      throw new BadRequestException('No values provided for price adjustment');
    }

    const session = await this.connection.startSession();

    return session.withTransaction(async (session) => {
      const order = await this.orderModel.findById(id).session(session);
      if (!order) {
        throw new NotFoundException(`Order with id ${id} not found`);
      }

      let newSubTotal = 0;

      let hasSuggestedPrice = false;

      if (order.suggestedPriceRate) hasSuggestedPrice = true;

      for (const item of order.items) {
        if (increase !== undefined) {
          item.unitPrice = parseFloat(
            (item.unitPrice * (1 + increase / 100)).toFixed(2),
          );
          if (hasSuggestedPrice) {
            item.suggestedPrice = parseFloat(
              (item.unitPrice * (1 + order.suggestedPriceRate / 100)).toFixed(
                2,
              ),
            );
          }
        } else if (decrease !== undefined) {
          item.unitPrice = parseFloat(
            (item.unitPrice * (1 - decrease / 100)).toFixed(2),
          );
          if (hasSuggestedPrice) {
            item.suggestedPrice = parseFloat(
              (item.unitPrice * (1 - order.suggestedPriceRate / 100)).toFixed(
                2,
              ),
            );
          }
        }

        if (suggestedPriceRate !== undefined) {
          item.suggestedPrice = parseFloat(
            (item.unitPrice * (1 + suggestedPriceRate / 100)).toFixed(2),
          );
        }

        newSubTotal += item.quantity * item.unitPrice;
      }

      const newTotal = roundDecimal(newSubTotal);
      const changes = [];
      const updateOps: any = {
        items: order.items,
        subTotal: roundDecimal(newSubTotal),
        totalAmount: newTotal,
      };

      if (increase !== undefined) {
        changes.push({
          field: 'Ajuste de precio (%)',
          before: order.totalAmount.toString(),
          after: newTotal.toString(),
        });
        updateOps.increasePercentaje = increase;
      }

      if (decrease !== undefined) {
        changes.push({
          field: 'Descuento aplicado (%)',
          before: order.totalAmount.toString(),
          after: newTotal.toString(),
        });
        updateOps.discountPercentaje = decrease;
        updateOps.discountAmount = roundDecimal(order.totalAmount - newTotal);
      }

      if (suggestedPriceRate !== undefined) {
        changes.push({
          field: 'Precio sugerido (%)',
          before: order.suggestedPriceRate?.toString() ?? 'N/A',
          after: suggestedPriceRate.toString(),
        });
        updateOps.suggestedPriceRate = suggestedPriceRate;
      }

      if (changes.length) {
        updateOps.$push = {
          changeHistory: {
            date: new Date(),
            user: userEmail,
            changes,
          },
        };
      }

      const updated = await this.findOneAndUpdate({ _id: id }, updateOps, {
        session,
        returnNew: true,
        lean: true,
      });

      return updated;
    });
  }

  private calculateStockAdjustments(
    originalItemsMap: Map<string, number>, // productId -> oldQuantity
    newItemsMap: Map<string, number>, // productId -> newQuantity
  ): Map<string, number> {
    // productId -> diff (new - old)
    const adjustments = new Map<string, number>();
    const allProductIds = new Set([
      ...originalItemsMap.keys(),
      ...newItemsMap.keys(),
    ]);

    for (const productId of allProductIds) {
      const oldQty = originalItemsMap.get(productId) || 0;
      const newQty = newItemsMap.get(productId) || 0;
      const diff = newQty - oldQty;
      if (diff !== 0) {
        adjustments.set(productId, diff);
      }
    }
    return adjustments;
  }

  private async applyStockAdjustments(
    adjustments: Map<string, number>,
    session: ClientSession,
  ): Promise<void> {
    if (adjustments.size === 0) {
      return;
    }

    const stockIncreases: { productId: string; amount: number }[] = [];

    const stockDecreases: { productId: string; amount: number }[] = [];

    for (const [productId, diff] of adjustments) {
      if (diff > 0) {
        // Disminuir stock (se añadieron/aumentaron items)
        stockDecreases.push({ productId, amount: diff });
      } else if (diff < 0) {
        // Aumentar stock (se quitaron/redujeron items)
        stockIncreases.push({ productId, amount: -diff }); // Guardar positivo
      }
    }

    // Procesar decrementos (requieren chequeo)
    for (const decrease of stockDecreases) {
      await this.productsService.findOneAndUpdate(
        { _id: decrease.productId, stock: { $gte: decrease.amount } },
        { $inc: { stock: -decrease.amount } },
        { session, returnNew: true },
      );
    }

    // Procesar incrementos (no requieren chequeo previo)
    if (stockIncreases.length > 0) {
      const bulkOps = stockIncreases.map((increase) => ({
        updateOne: {
          filter: { _id: increase.productId },
          update: { $inc: { stock: increase.amount } },
        },
      }));
      await this.productsService.bulkWrite(bulkOps, { session });
    }
  }

  /*
  private allowedTransitions: Record<OrderStatusEnum, OrderStatusEnum[]> = {
    [OrderStatusEnum.EN_PROCESO]: [
      OrderStatusEnum.EN_PREPARACION,
      OrderStatusEnum.CANCELADO,
    ],
    [OrderStatusEnum.EN_PREPARACION]: [
      OrderStatusEnum.ENTREGADO,
      OrderStatusEnum.CANCELADO,
    ],
    [OrderStatusEnum.ENTREGADO]: [OrderStatusEnum.FACTURADO],
    [OrderStatusEnum.FACTURADO]: [],
    [OrderStatusEnum.CANCELADO]: [],
  };

  private allowedPaymentTransitions: Record<
    OrderPaymentStatusEnum,
    OrderPaymentStatusEnum[]
  > = {
    [OrderPaymentStatusEnum.NO_FACTURADO]: [
      OrderPaymentStatusEnum.PENDIENTE_PAGO,
      OrderPaymentStatusEnum.CANCELADO,
    ],
    [OrderPaymentStatusEnum.PENDIENTE_PAGO]: [
      OrderPaymentStatusEnum.PAGADO,
      OrderPaymentStatusEnum.PAGO_PARCIAL,
      OrderPaymentStatusEnum.CANCELADO,
    ],
    [OrderPaymentStatusEnum.PAGO_PARCIAL]: [
      OrderPaymentStatusEnum.PAGADO,
      OrderPaymentStatusEnum.REEMBOLSADO,
      OrderPaymentStatusEnum.CANCELADO,
    ],
    [OrderPaymentStatusEnum.PAGADO]: [OrderPaymentStatusEnum.REEMBOLSADO],
    [OrderPaymentStatusEnum.REEMBOLSADO]: [],
    [OrderPaymentStatusEnum.CANCELADO]: [],
  };

  async changeOrderStatus(
    orderId: string,
    newStatus: OrderStatusEnum,
    userEmail: string,
  ): Promise<OrderDocument> {
    // 1) Trae la orden actual
    const order = await this.findById(orderId, { lean: false });
    const fromStatus = order.status as OrderStatusEnum;

    // 2) Verifica transición válida
    const allowed = this.allowedTransitions[fromStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        ERROR_MESSAGES.ORDERS.INVALID_STATUS_TRANSITION(fromStatus, newStatus),
      );
    }

    // 3) Registra el cambio en history
    const changeEntry = {
      date: new Date(),
      user: userEmail,
      changes: [{ field: 'status', before: fromStatus, after: newStatus }],
    };

    // 4) Prepara update dinámico
    const update: any = {
      status: newStatus,
      $push: { changeHistory: changeEntry },
    };

    if (newStatus === OrderStatusEnum.CANCELADO) {
      update.paymentStatus = OrderPaymentStatusEnum.CANCELADO;
      update.pdfStatus = PdfGenerationStatus.CANCELED;
    }

    // 5) Ejecuta update
    const updated = await this.findOneAndUpdate({ _id: orderId }, update, {
      returnNew: true,
      lean: true,
    });

    return updated;
  }

  async changePaymentStatus(
    orderId: string,
    newPaymentStatus: OrderPaymentStatusEnum,
    userEmail: string,
  ): Promise<OrderDocument> {
    // 2) Carga la orden actual
    const order = await this.findById(orderId, { lean: false });
    const from = order.paymentStatus as OrderPaymentStatusEnum;

    // 3) Verifica transición válida
    const allowed = this.allowedPaymentTransitions[from] || [];
    if (!allowed.includes(newPaymentStatus)) {
      throw new BadRequestException(
        ERROR_MESSAGES.ORDERS.INVALID_PAYMENT_STATUS_TRANSITION(
          from,
          newPaymentStatus,
        ),
      );
    }

    // 4) Genera entrada de historial
    const changeEntry = {
      date: new Date(),
      user: userEmail,
      changes: [
        { field: 'paymentStatus', before: from, after: newPaymentStatus },
      ],
    };

    // 5) Aplica update atómico
    const updated = await this.findOneAndUpdate(
      { _id: orderId },
      {
        paymentStatus: newPaymentStatus,
        $push: { changeHistory: changeEntry },
      },
      { returnNew: true, lean: true },
    );

    return updated;
  }

  */

  async findAll(
    filters: ListOrderDto,
  ): Promise<PaginatedResult<OrderDocument>> {
    const {
      page = 1,
      limit = 20,
      clientId,
      invoiceNumber,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const match: FilterQuery<OrderDocument> = {};

    // Filtrado por cliente
    if (clientId) {
      match.clientId = new Types.ObjectId(clientId);
    }

    // Filtrado por número de factura
    if (invoiceNumber) {
      match.invoiceNumber = invoiceNumber;
    }

    // Filtrado por rango de fechas
    const dateConditions: any = {};
    if (dateFrom) dateConditions.$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      dateConditions.$lte = end;
    }

    if (Object.keys(dateConditions).length) {
      match.createdAt = dateConditions;
    }

    // Ordenamiento dinámico
    const sortStage = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const pipeline: any[] = [
      { $match: match },
      { $sort: sortStage },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $lookup: {
                from: 'clients',
                localField: 'clientId',
                foreignField: '_id',
                as: 'clientId',
              },
            },
            {
              $unwind: { path: '$clientId', preserveNullAndEmptyArrays: true },
            },
            {
              $project: {
                _id: 1,
                totalAmount: 1,
                subTotal: 1,
                createdAt: 1,
                updatedAt: 1,
                discountAmount: 1,
                discountPercentaje: 1,
                increasePercentaje: 1,
                invoiceNumber: 1,
                suggestedPriceRate: 1,
                'clientId.name': 1,
                'clientId.email': 1,
                'clientId.phoneNumber': 1,
              },
            },
          ],
        },
      },
    ];

    const result = await this.orderModel.aggregate(pipeline).exec();

    const metadata = result[0]?.metadata[0] || { total: 0 };
    const totalDocuments = metadata.total;
    const totalPages = Math.ceil(totalDocuments / limit);

    return {
      data: result[0].data,
      page,
      limit,
      totalDocuments,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async findOrderByIdWithClient(orderId: string): Promise<any> {
    return this.findById(orderId, {
      lean: true,
      populate: [
        {
          path: 'clientId',
          select: 'name email phoneNumber cuit ingresosBrutos ivaCondition',
        },
        {
          path: 'items.productId',
          select: 'name brand',
        },
      ],
    });
  }

  /*
  async createInvoice({
    orderId,
    suggestionRate,
    paymentType,
    discount = 0,
    increase = 0,
    user,
  }: CreateInvoiceFromOrderDto & { user: string }): Promise<any> {
    const session = await this.connection.startSession();
    let order: OrderDocument | null = null;

    try {
      await session.withTransaction(async (currentSession) => {
        order = await this.orderModel
          .findById(orderId)
          .populate([
            { path: 'clientId', select: 'name email' },
            { path: 'items.productId', select: 'name' },
          ])
          .session(currentSession);

        if (!order) {
          throw new NotFoundException(ERROR_MESSAGES.ORDERS.NOT_FOUND(orderId));
        }

        if (order.pdfStatus == PdfGenerationStatus.GENERATED) {
          return order;
        }

        if (order.status !== OrderStatusEnum.ENTREGADO) {
          throw new BadRequestException(
            'Solo se pueden facturar órdenes ENTREGADAS',
          );
        }
        if (
          order.paymentStatus === OrderPaymentStatusEnum.CANCELADO ||
          order.paymentStatus === OrderPaymentStatusEnum.REEMBOLSADO
        ) {
          throw new BadRequestException(
            'No se puede facturar una orden cancelada o reembolsada',
          );
        }

        const items = order.items.map((i) => {
          const product = i.productId as unknown as {
            _id: Types.ObjectId;
            name: string;
          };

          const increasedPrice = i.unitPrice * (1 + increase / 100);
          const suggestedPrice = Number(
            suggestionRate
              ? (increasedPrice * (1 + suggestionRate / 100)).toFixed(2)
              : 0,
          );
          const total = Number((increasedPrice * i.quantity).toFixed(2));

          return {
            productId: product._id,
            name: product.name,
            quantity: i.quantity,
            unitPrice: increasedPrice,
            suggestedPrice,
            total,
          };
        });

        const subTotal = items.reduce((acc, item) => acc + item.total, 0);
        const discountAmount = Number(((subTotal * discount) / 100).toFixed(2));
        const discountedSubTotal = subTotal - discountAmount;
        const totalAmount = Number(discountedSubTotal.toFixed(2));

        const client = order.clientId as unknown as {
          _id: Types.ObjectId;
          name: string;
          email: string;
        };

        const invoiceNumber =
          await this.invoiceCounterService.getNextInvoiceNumber();

        const pdfData = {
          clientName: client.name,
          items,
          suggestionRate,
          subTotal,
          discount: discountAmount,
          total: totalAmount,
          createdAt: new Date(),
          saleCondition: paymentType,
          invoiceNumber,
        };

        const pdf = await this.pdfService.generate(pdfData);
        const pdfUrl = await this.s3Service.uploadFile(
          pdf,
          `facturas/${order._id}.pdf`,
          'application/pdf',
        );

        const prevStatus = order.status;
        order.pdfUrl = pdfUrl;
        order.pdfStatus = PdfGenerationStatus.GENERATED;
        order.paymentStatus = OrderPaymentStatusEnum.PENDIENTE_PAGO;
        order.invoiceNumber = invoiceNumber;
        order.status = OrderStatusEnum.FACTURADO;
        order.subTotal = subTotal;
        order.totalAmount = totalAmount;
        order.increasePercentaje = increase;
        order.discountPercentaje = discount;
        order.discountAmount = discountAmount;
        order.changeHistory.push({
          date: new Date(),
          user,
          changes: [
            {
              field: 'status',
              before: prevStatus,
              after: OrderStatusEnum.FACTURADO,
            },
          ],
        });

        await order.save({ session: currentSession });
      });

      return order;
    } catch (error) {
      this.logger.error(
        `Transaction failed during invoice creation for order ${orderId}: ${error.message}`,
        error.stack,
      );
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }
*/

  /*
  async sendInvoiceEmail({
    orderId,
  }: InvoiceEmailDto & { user: string }): Promise<any> {
    try {
      const order = (await this.findById(orderId, {
        lean: true,
        populate: [
          {
            path: 'clientId',
            select: 'name email',
          },
        ],
      })) as any;

      const invoiceDataToSend = {
        first_name: order.clientId.name,
        invoiceNumber: order.invoiceNumber,
        subTotal: order.subTotal,
        discount: order.discountAmount ?? 0,
        total: order.totalAmount,
      };

      await this.sendGridService.sendInvoiceWithTemplate(
        order.clientId.email,
        {
          ...invoiceDataToSend,
        },
        order.pdfUrl,
      );

      return {
        status: 200,
        message: 'Email enviado exitosamente',
      };
    } catch (error) {
      this.logger.error('Ocurrió un error, intentelo nuevamente', error.stack);
      throw error;
    }
  }
  */

  async getInvoiceReport(filters: ReportDto) {
    const today = new Date();
    let start: Date;
    let end: Date;

    const { period, startDate, endDate } = filters;

    switch (period) {
      case 'DAILY':
        start = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        );
        end = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1,
        );
        break;
      case 'WEEKLY':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        end = new Date(start);
        end.setDate(start.getDate() + 7);
        break;
      case 'MONTHLY':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        break;
      default:
        start = startDate ? new Date(startDate) : new Date(0);
        end = endDate ? new Date(endDate) : new Date();
        break;
    }

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: start, $lt: end },
        },
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId',
          foreignField: '_id',
          as: 'client',
        },
      },
      { $unwind: '$client' },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalAmount: { $sum: '$totalAmount' },
                totalSubTotal: { $sum: '$subTotal' },
              },
            },
          ],
          topClients: [
            {
              $group: {
                _id: '$client._id',
                name: { $first: '$client.name' },
                totalAmount: { $sum: '$totalAmount' },
                ordersCount: { $sum: 1 },
              },
            },
            { $sort: { totalAmount: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ];

    const [result] = await this.orderModel.aggregate(pipeline).exec();

    const totals = result.totals[0] || {
      totalOrders: 0,
      totalAmount: 0,
      totalSubTotal: 0,
    };

    return {
      period: period || 'custom',
      range: { start, end },
      totalOrders: totals.totalOrders,
      financialSummary: {
        totalAmount: Number(totals.totalAmount?.toFixed(2) || 0),
        totalSubTotal: Number(totals.totalSubTotal?.toFixed(2) || 0),
      },
      topClients: result.topClients.map((c) => ({
        name: c.name,
        id: c._id,
        totalAmount: Number(c.totalAmount.toFixed(2)),
        ordersCount: c.ordersCount,
      })),
    };
  }

  /*
  async getInvoiceReport(filters: ReportDto) {
    const today = new Date();
    let start: Date;
    let end: Date;

    const { period, startDate, endDate } = filters;

    switch (period) {
      case 'DAILY':
        start = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        );
        end = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1,
        );
        break;
      case 'WEEKLY':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        end = new Date(start);
        end.setDate(start.getDate() + 7);
        break;
      case 'MONTHLY':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        break;
      default:
        start = startDate ? new Date(startDate) : new Date(0);
        end = endDate ? new Date(endDate) : new Date();
        break;
    }

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: start, $lt: end },
        },
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId',
          foreignField: '_id',
          as: 'client',
        },
      },
      { $unwind: { path: '$client', preserveNullAndEmptyArrays: false } },
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],

          topClients: [
            {
              $match: { status: 'FACTURADO' },
            },
            {
              $group: {
                _id: '$client._id',
                name: { $first: '$client.name' },
                totalAmount: { $sum: '$totalAmount' },
                ordersCount: { $sum: 1 },
              },
            },
            { $sort: { totalAmount: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ];

    const [result] = await this.orderModel.aggregate(pipeline).exec();

    // Construimos statusSummary
    const statusSummary: Record<string, number> = {
      EN_PROCESO: 0,
      EN_PREPARACION: 0,
      ENTREGADO: 0,
      FACTURADO: 0,
      CANCELADO: 0,
    };
    for (const item of result.byStatus) {
      statusSummary[item._id] = item.count;
    }

    // Construimos pagos y financialSummary
    const pagos = {
      PAGADO: { count: 0, total: 0, invoices: [] },
      PENDIENTE_PAGO: { count: 0, total: 0, invoices: [] },
      CANCELADO: { count: 0, total: 0, invoices: [] },
    };

    let totalAmount = 0;

    for (const p of result.byPaymentStatus) {
      pagos[p._id] = {
        count: p.count,
        total: Number(p.total.toFixed(2)),
        invoices: (p.invoices || [])
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .map((i) => ({
            ...i,
            total: Number(i.total.toFixed(2)),
          })),
      };
      totalAmount += p.total;
    }

    const financialSummary = {
      facturado: Number(totalAmount.toFixed(2)),
      pagado: pagos.PAGADO?.total || 0,
      pendientePago: pagos.PENDIENTE_PAGO?.total || 0,
    };

    return {
      period: period || 'custom',
      range: { start, end },
      totalOrders: Object.values(statusSummary).reduce((sum, v) => sum + v, 0),
      statusSummary,
      financialSummary,
      pagos,
      topClients: result.topClients.map((c) => ({
        name: c.name,
        totalAmount: Number(c.totalAmount.toFixed(2)),
        ordersCount: c.ordersCount,
      })),
    };
  }
  */

  private getDateRange(period: string, startDate?: string, endDate?: string) {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'DAILY':
        start = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        );
        end = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1,
        );
        break;
      case 'WEEKLY':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        end = new Date(start);
        end.setDate(start.getDate() + 7);
        break;
      case 'MONTHLY':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        break;
      default:
        start = startDate ? new Date(startDate) : new Date(0);
        end = endDate ? new Date(endDate) : new Date();
        break;
    }
    return { start, end };
  }

  async exportOrdersToExcel(filters: ReportDto, res: Response) {
    const { start, end } = this.getDateRange(
      filters.period,
      filters.startDate,
      filters.endDate,
    );

    // Traemos órdenes con cliente y productos
    const orders: any = await this.orderModel
      .find({ createdAt: { $gte: start, $lt: end } })
      .populate('clientId')
      .populate('items.productId')
      .lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Facturación';
    workbook.created = new Date();

    // Hoja 1: Resumen de órdenes
    const ordersSheet = workbook.addWorksheet('Resumen de Órdenes');
    ordersSheet.columns = [
      { header: 'Factura', key: 'invoiceNumber', width: 12 },
      { header: 'Fecha', key: 'createdAt', width: 15 },
      { header: 'Cliente', key: 'clientName', width: 30 },
      { header: 'CUIT', key: 'cuit', width: 18 },
      { header: 'Condición IVA', key: 'ivaCondition', width: 15 },
      { header: 'SubTotal', key: 'subTotal', width: 15 },
      { header: 'Total', key: 'totalAmount', width: 15 },
      { header: '% Aumento', key: 'increasePercentaje', width: 12 },
      { header: '% Descuento', key: 'decreasePercentaje', width: 12 },
      { header: '% Sugerido', key: 'suggestedPriceRate', width: 12 },
    ];

    orders.forEach((order) => {
      ordersSheet.addRow({
        invoiceNumber: order.invoiceNumber,
        createdAt: order.createdAt.toISOString().split('T')[0],
        clientName: order.clientId?.name || '',
        cuit: order.clientId?.cuit || '',
        ivaCondition: order.clientId?.ivaCondition || '',
        subTotal: order.subTotal,
        totalAmount: order.totalAmount,
        increasePercentaje: order.increasePercentaje || '',
        decreasePercentaje: order.decreasePercentaje || '',
        suggestedPriceRate: order.suggestedPriceRate || '',
      });
    });

    // Hoja 2: Detalle de ítems
    const itemsSheet = workbook.addWorksheet('Detalle de Ítems');
    itemsSheet.columns = [
      { header: 'Factura', key: 'invoiceNumber', width: 12 },
      { header: 'Fecha', key: 'createdAt', width: 15 },
      { header: 'Cliente', key: 'clientName', width: 30 },
      { header: 'Producto', key: 'productName', width: 40 },
      { header: 'Marca', key: 'brand', width: 20 },
      { header: 'Cantidad', key: 'quantity', width: 10 },
      { header: 'Precio Unit.', key: 'unitPrice', width: 15 },
      { header: 'Precio Sugerido', key: 'suggestedPrice', width: 18 },
    ];

    orders.forEach((order) => {
      order.items.forEach((item) => {
        itemsSheet.addRow({
          invoiceNumber: order.invoiceNumber,
          createdAt: order.createdAt.toISOString().split('T')[0],
          clientName: order.clientId?.name || '',
          productName: item.productId?.name || '',
          brand: item.productId?.brand || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          suggestedPrice: item.suggestedPrice,
        });
      });
    });

    const sheetProducts = workbook.addWorksheet('Productos vendidos');
    sheetProducts.columns = [
      { header: 'Producto', key: 'product', width: 30 },
      { header: 'Cantidad total', key: 'quantity', width: 20 },
      { header: 'Monto total', key: 'amount', width: 20 },
    ];

    const productMap: Record<
      string,
      { name: string; quantity: number; amount: number }
    > = {};

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const prodName = item.productId?.name || 'Producto desconocido';
        if (!productMap[prodName]) {
          productMap[prodName] = { name: prodName, quantity: 0, amount: 0 };
        }
        productMap[prodName].quantity += item.quantity;
        productMap[prodName].amount += item.quantity * item.unitPrice;
      });
    });

    Object.values(productMap).forEach((prod) => {
      sheetProducts.addRow({
        product: prod.name,
        quantity: prod.quantity,
        amount: prod.amount,
      });
    });

    // Configuración de cabeceras para descarga
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte_${new Date().toISOString().split('T')[0]}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}
