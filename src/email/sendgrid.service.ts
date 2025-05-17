import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

@Injectable()
export class SendGridService {
  constructor(private readonly configService: ConfigService) {
    const SENDGRID_API_KEY = configService.get('SENDGRID_API_KEY');
    sgMail.setApiKey(SENDGRID_API_KEY);
  }

  async sendInvoiceEmail(to: string, nombre: string, pdfUrl: string) {
    const html = (
      await import('./templates/invoice-notification.template')
    ).invoiceNotificationTemplate(nombre);

    const msg = {
      to,
      from: 'facturacion@distribuidora-angus.com.ar',
      subject: 'Tu comprobante de compra - Distribuidora Angus',
      html,
      attachments: [
        {
          content: await this.downloadPdfAsBase64(pdfUrl),
          filename: 'Factura.pdf',
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    };

    await sgMail.send(msg);
  }

  async sendInvoiceWithTemplate(
    to: string,
    dynamicData: {
      first_name: string;
      invoiceNumber: string;
      subTotal: string;
      discount: string;
      total: string;
    },
    pdfUrl: string,
  ) {
    const templateId = this.configService.get<string>(
      'SENDGRID_TEMPLATE_ID_FACTURA',
    );
    if (!templateId) throw new Error('Falta el template ID de factura');

    const msg = {
      to,
      from: 'facturacion@distribuidora-angus.com.ar',
      templateId,
      dynamic_template_data: dynamicData,
      attachments: [
        {
          content: await this.downloadPdfAsBase64(pdfUrl),
          filename: `Comprobante-${dynamicData.invoiceNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    };

    await sgMail.send(msg);
  }

  private async downloadPdfAsBase64(pdfUrl: string): Promise<string> {
    const axios = await import('axios');
    const response = await axios.default.get(pdfUrl, {
      responseType: 'arraybuffer',
    });
    return Buffer.from(response.data).toString('base64');
  }
}
