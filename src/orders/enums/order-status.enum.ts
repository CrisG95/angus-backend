export enum OrderStatusEnum {
  EN_PROCESO = 'EN_PROCESO',
  EN_PREPARACION = 'EN_PREPARACION',
  ENTREGADO = 'ENTREGADO',
  FACTURADO = 'FACTURADO',
  CANCELADO = 'CANCELADO',
}

export enum OrderPaymentStatusEnum {
  NO_FACTURADO = 'NO_FACTURADO', // Estado inicial antes de facturar
  PENDIENTE_PAGO = 'PENDIENTE_PAGO', // Facturado, esperando pago
  PAGADO = 'PAGADO', // Pago completo recibido
  PAGO_PARCIAL = 'PAGO_PARCIAL', // Si manejas pagos parciales
  REEMBOLSADO = 'REEMBOLSADO', // Si manejas reembolsos
  CANCELADO = 'CANCELADO', // Si la factura/pago se cancela
}
