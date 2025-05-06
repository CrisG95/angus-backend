export const generateInvoiceHtml = function (invoice) {
  const {
    clientName,
    suggestionRate,
    items,
    subTotal,
    ivaAmount,
    total,
    createdAt,
  } = invoice;
  const formattedDate = new Date(createdAt).toLocaleDateString('es-AR');

  const rows = items
    .map(
      (item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>$${item.unitPrice.toFixed(2)}</td>
      <td>$${item.suggestedPrice.toFixed(2)}</td>
      <td>$${item.total.toFixed(2)}</td>
    </tr>
  `,
    )
    .join('');

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; font-size: 14px; margin: 40px; }
      .header, .footer { text-align: center; }
      .company-info { font-weight: bold; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
      .totals { margin-top: 20px; text-align: right; }
      .totals div { margin-bottom: 4px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h2>Distribuidora Angus</h2>
      <div class="company-info">
        CUIT: 30-12345678-9<br>
        Dirección: Av. Siempre Viva 742, Córdoba<br>
        Condición IVA: Responsable Inscripto
      </div>
      <hr>
    </div>

    <div>
      <strong>Cliente:</strong> ${clientName}<br>
      <strong>Fecha:</strong> ${formattedDate}<br>
      <strong>Tasa de Sugerencia:</strong> ${suggestionRate}%
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Producto</th>
          <th>Cantidad</th>
          <th>Precio Unitario</th>
          <th>Precio Sugerido</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="totals">
      <div><strong>Subtotal:</strong> $${subTotal.toFixed(2)}</div>
      <div><strong>IVA (21%):</strong> $${ivaAmount.toFixed(2)}</div>
      <div><strong>Total:</strong> $${total.toFixed(2)}</div>
    </div>

    <div class="footer">
      <hr>
      <p>Gracias por su compra. Ante cualquier consulta, contáctenos a ventas@distribuidora-angus.com</p>
    </div>
  </body>
  </html>
  `;
};
