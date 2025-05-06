import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // Passport adjunta el usuario aquí

    // Si se pasó un nombre de propiedad (ej. @User('userId')), retorna solo esa propiedad
    // De lo contrario, retorna el objeto de usuario completo
    return data ? user?.[data] : user;
  },
);

export interface UserPayload {
  userId: string;
  email: string;
  role: string;
}
