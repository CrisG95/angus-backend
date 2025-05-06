export const ERROR_MESSAGES = {
  // --- Errores Generales ---
  GENERAL: {
    INVALID_ID_FORMAT: (id: string) => `El formato del ID '${id}' es inválido.`,
    UNAUTHORIZED: 'Acceso no autorizado.',
    INTERNAL_SERVER_ERROR: 'Ocurrió un error inesperado en el servidor.',
    VALIDATION_FAILED: 'La validación de los datos de entrada falló.',
    NOT_FOUND_GENERIC: (resource: string, id: string | number) =>
      `${resource} con ID ${id} no encontrado/a.`,
  },

  // --- Errores de Autenticación/Autorización ---
  AUTH: {
    INVALID_CREDENTIALS: 'Usuario o contraseña inválidos.',
    INVALID_TOKEN: 'Token inválido o expirado.',
    MISSING_TOKEN: 'Falta el token de autenticación.',
    INACTIVE_USER: 'El usuario no está activo.',
    PERMISSION_DENIED: 'No tienes permiso para realizar esta acción.',
    INVALID_PASSWORD_FORMAT:
      'La contraseña debe tener al menos 6 caracteres y contener al menos una letra y número',
  },

  // --- Errores de Usuarios ---
  USERS: {
    ALREADY_EXISTS:
      'Ya existe un usuario con el email o nombre de usuario proporcionado.',
    NOT_FOUND: 'Usuario no encontrado.',
    CANNOT_DELETE_SELF: 'No puedes eliminar tu propia cuenta.',
  },

  // --- Errores de Clientes ---
  CLIENTS: {
    ALREADY_EXISTS_CUIT: (cuit: string) =>
      `Ya existe un cliente con el CUIT ${cuit}.`,
    NOT_FOUND: (id: string) => `Cliente con ID ${id} no encontrado.`,
  },

  // --- Errores de Productos ---
  PRODUCTS: {
    NOT_FOUND: (id: string | string[]) =>
      `Producto(s) con ID(s) ${Array.isArray(id) ? id.join(', ') : id} no encontrado(s).`,
    INSUFFICIENT_STOCK: (name: string) =>
      `Stock insuficiente para el producto: ${name}.`,
    ALREADY_EXISTS_CODE: (code: string) =>
      `Ya existe un producto con el código ${code}.`,
  },

  // --- Errores de Órdenes ---
  ORDERS: {
    NOT_FOUND: (id: string) => `Orden con ID ${id} no encontrada.`,
    NO_ITEMS: 'La orden debe contener al menos un item.',
    INVALID_STATUS_TRANSITION: (from: string, to: string) =>
      `No se puede cambiar el estado de la orden de '${from}' a '${to}'.`,
    INVALID_PAYMENT_STATUS_TRANSITION: (from: string, to: string) =>
      `No se puede cambiar el estado de pago de '${from}' a '${to}'.`,
    INVALID_STATUS_TERMINAL_TRANSITION: (status: string) =>
      `No se puede modificar la orden en estado ${status}.`,
    CLIENT_NOT_FOUND_IN_ORDER: (clientId: string) =>
      `El cliente con ID ${clientId} especificado en la orden no fue encontrado.`,
    PRODUCT_NOT_FOUND_IN_ORDER: (productId: string) =>
      `El producto con ID ${productId} especificado en la orden no fue encontrado.`,
    REQUIRED_AVAILABLE: (
      required: string | number,
      available: string | number,
    ) => `Cantidad requerida: ${required}. Cantidad disponible: ${available}`,
  },

  // --- Errores de Facturas ---
  INVOICES: {
    NOT_FOUND: (id: string) => `Factura con ID ${id} no encontrada.`,
    INVALID_STATUS_TRANSITION: (from: string, to: string) =>
      `No se puede cambiar el estado de la orden de '${from}' a '${to}'.`,
    INVALID_PAYMENT_STATUS_TRANSITION: (from: string, to: string) =>
      `No se puede cambiar el estado de pago de '${from}' a '${to}'.`,
    INVALID_STATUS_TERMINAL_TRANSITION: (status: string) =>
      `No se puede modificar la orden en estado ${status}.`,
    CLIENT_NOT_FOUND_IN_ORDER: (clientId: string) =>
      `El cliente con ID ${clientId} especificado en la orden no fue encontrado.`,
    PRODUCT_NOT_FOUND_IN_ORDER: (productId: string) =>
      `El producto con ID ${productId} especificado en la orden no fue encontrado.`,
    REQUIRED_AVAILABLE: (
      required: string | number,
      available: string | number,
    ) => `Cantidad requerida: ${required}. Cantidad disponible: ${available}`,
  },
} as const;
