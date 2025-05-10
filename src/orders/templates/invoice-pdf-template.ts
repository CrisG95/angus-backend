import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import getStream from 'get-stream';

export async function generateInvoicePDF(invoice: any): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    bufferPages: true,
  });
  const stream = new PassThrough();
  doc.pipe(stream);

  const {
    clientName,
    items,
    subTotal,
    total,
    createdAt,
    invoiceNumber,
    saleCondition,
    discount,
  } = invoice;

  const dateObject = new Date(createdAt);
  const formattedDate = dateObject.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Cordoba',
  });
  const displayInvoiceNumber = invoiceNumber || 'N/A';

  const mainFont = 'Helvetica';
  const boldFont = 'Helvetica-Bold';
  const normalFontSize = 9;
  const smallFontSize = 8;
  const largeFontSize = 11;
  const defaultColor = '#333333';
  const lightGrey = '#D8D8D8';
  const tableHeaderBgColor = '#EAEAEA';
  const tablePadding = 5;

  const pageContentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const headerLeftMargin = doc.page.margins.left;
  const headerTopMargin = doc.page.margins.top;

  let currentY = headerTopMargin;
  const headerSectionHeight = 55;
  const rightColumnX = doc.page.width / 2 + 15;

  doc
    .font(boldFont)
    .fontSize(largeFontSize)
    .fillColor(defaultColor)
    .text('Distribuidora Angus', headerLeftMargin, currentY);
  currentY += largeFontSize + 3;
  doc
    .font(mainFont)
    .fontSize(smallFontSize)
    .text('CUIT: 30-12345678-9', headerLeftMargin, currentY)
    .text('Av. Siempre Viva 742, Córdoba', headerLeftMargin, doc.y + 1)
    .text('ventas@distribuidora-angus.com', headerLeftMargin, doc.y + 1);

  currentY = headerTopMargin;
  doc
    .font(boldFont)
    .fontSize(largeFontSize)
    .fillColor(defaultColor)
    .text('Documento no válido como Factura', rightColumnX, currentY, {
      align: 'right',
      width: pageContentWidth / 2 - 15,
    });
  currentY += largeFontSize + 6;
  doc
    .font(mainFont)
    .fontSize(normalFontSize)
    .text(`Comprobante n°: ${displayInvoiceNumber}`, rightColumnX, currentY, {
      align: 'right',
      width: pageContentWidth / 2 - 15,
    });
  currentY += normalFontSize + 1;
  doc.text(`Fecha: ${formattedDate}`, rightColumnX, currentY, {
    align: 'right',
    width: pageContentWidth / 2 - 15,
  });

  doc.y = headerTopMargin + headerSectionHeight + 15;
  currentY = doc.y;

  const clientLabelWidth = 110;
  doc
    .font(boldFont)
    .fontSize(normalFontSize)
    .fillColor(defaultColor)
    .text('Señores:', headerLeftMargin, currentY);
  doc
    .font(mainFont)
    .text(
      clientName || 'Consumidor Final',
      headerLeftMargin + clientLabelWidth,
      currentY,
      { width: pageContentWidth - clientLabelWidth },
    );
  currentY += normalFontSize + 6;

  doc.font(boldFont).text('Condición de venta:', headerLeftMargin, currentY);
  doc
    .font(mainFont)
    .text(
      saleCondition || 'Contado',
      headerLeftMargin + clientLabelWidth,
      currentY,
    );
  currentY += normalFontSize + 15;
  doc.y = currentY;

  const tableTopY = currentY;
  const tableHeaders = [
    'DETALLE',
    'CANTIDAD',
    'P. UNITARIO',
    'P. SUGERIDO',
    'SUBTOTAL',
  ];

  const columnWidths = {
    description: 0,
    quantity: 65,
    unitPrice: 90,
    suggestedPrice: 95,
    lineTotal: 90,
  };
  const fixedWidthSum =
    columnWidths.quantity +
    columnWidths.unitPrice +
    columnWidths.suggestedPrice +
    columnWidths.lineTotal;
  columnWidths.description = Math.max(50, pageContentWidth - fixedWidthSum);

  const headerHeight = 20;
  const rowHeight = 20;

  const generateTableRow = (y: number, item: any, isHeader: boolean) => {
    let currentX = doc.page.margins.left;
    const textY = y + (isHeader ? 3 : 5);
    const rowBottomY = y + (isHeader ? headerHeight : rowHeight);

    if (isHeader)
      doc
        .rect(doc.page.margins.left, y, pageContentWidth, headerHeight)
        .fill(tableHeaderBgColor);

    doc
      .font(isHeader ? boldFont : mainFont)
      .fontSize(normalFontSize)
      .fillColor(defaultColor);

    const data = isHeader
      ? tableHeaders
      : [
          item.name,
          item.quantity.toString(),
          `$${item.unitPrice.toFixed(2)}`,
          `$${item.suggestedPrice.toFixed(2)}`,
          `$${item.total.toFixed(2)}`,
        ];

    const aligns = isHeader
      ? ['left', 'center', 'center', 'center', 'right']
      : ['left', 'center', 'right', 'right', 'right'];
    const widths = [
      columnWidths.description,
      columnWidths.quantity,
      columnWidths.unitPrice,
      columnWidths.suggestedPrice,
      columnWidths.lineTotal,
    ];

    data.forEach((text, i) => {
      doc.text(text, currentX + tablePadding, textY, {
        width: widths[i] - tablePadding * 2,
        align: aligns[i] as any,
        ellipsis: true,
        lineBreak: false,
        singleLine: true,
      });
      currentX += widths[i];
    });

    doc
      .strokeColor(lightGrey)
      .lineWidth(0.5)
      .moveTo(doc.page.margins.left, rowBottomY)
      .lineTo(doc.page.width - doc.page.margins.right, rowBottomY)
      .stroke();

    let lineX = doc.page.margins.left;
    doc.moveTo(lineX, y).lineTo(lineX, rowBottomY).stroke();
    widths.forEach((w) => {
      lineX += w;
      doc.moveTo(lineX, y).lineTo(lineX, rowBottomY).stroke();
    });

    return rowBottomY;
  };

  currentY = generateTableRow(tableTopY, {}, true);

  items.forEach((item: any) => {
    const spaceForTotals = 80;
    if (
      currentY + rowHeight >
      doc.page.height - doc.page.margins.bottom - spaceForTotals
    ) {
      doc.addPage();
      currentY = doc.page.margins.top;
      currentY = generateTableRow(currentY, {}, true);
    }
    currentY = generateTableRow(currentY, item, false);
  });

  doc.y = currentY;
  doc.moveDown(1.5);
  currentY = doc.y;

  const totalsLabelWidth = 100;
  const totalsValueWidth = 90;

  const drawTotalLine = (
    label: string,
    value: string,
    isBold: boolean = false,
  ) => {
    const labelX =
      doc.page.width -
      doc.page.margins.right -
      totalsValueWidth -
      totalsLabelWidth;
    const valueX = doc.page.width - doc.page.margins.right - totalsValueWidth;
    doc
      .font(isBold ? boldFont : mainFont)
      .fontSize(normalFontSize)
      .fillColor(defaultColor);
    doc.text(label, labelX, currentY, {
      width: totalsLabelWidth,
      align: 'right',
    });
    doc.text(value, valueX, currentY, {
      width: totalsValueWidth,
      align: 'right',
    });
    currentY += normalFontSize + 3;
    doc.y = currentY;
  };

  if (subTotal !== undefined)
    drawTotalLine('SUBTOTAL:', `$${subTotal.toFixed(2)}`);
  if (discount !== undefined)
    drawTotalLine('DESCUENTO:', `$${subTotal.toFixed(2)}`);
  if (total !== undefined)
    drawTotalLine('TOTAL:', `$${total.toFixed(2)}`, true);

  doc.end();
  const buffer = await getStream.buffer(stream);
  return buffer;
}
