import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InvoiceCounter } from '@orders/schemas/invoice-counter.schema';

@Injectable()
export class InvoiceCounterService {
  constructor(
    @InjectModel(InvoiceCounter.name)
    private readonly counterModel: Model<InvoiceCounter>,
  ) {}

  async getNextInvoiceNumber(): Promise<string> {
    const updated = await this.counterModel.findOneAndUpdate(
      {},
      { $inc: { currentNumber: 1 } },
      { upsert: true, new: true },
    );
    // Formato ejemplo: F000001
    return `F${updated.currentNumber.toString().padStart(6, '0')}`;
  }
}
