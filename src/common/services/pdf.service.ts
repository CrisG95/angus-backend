import { Injectable } from '@nestjs/common';
import { generateInvoicePDF } from '@orders/templates/invoice-pdf-template';

@Injectable()
export class PDFService {
  async generate(invoice: any): Promise<Buffer> {
    return await generateInvoicePDF(invoice);
  }
}
