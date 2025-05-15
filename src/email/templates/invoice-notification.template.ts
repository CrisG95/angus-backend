export function invoiceNotificationTemplate(nombre: string): string {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #0D47A1;">Distribuidora Angus</h2>
      <p>Buenos días ${nombre},</p>
      <p>Adjunto encontrarás tu comprobante de compra.</p>
      <p>Gracias por confiar en nosotros.</p>
      <hr />
      <small>Distribuidora Angus - facturacion@distribuidora-angus.com.ar</small>
    </div>
  `;
}
