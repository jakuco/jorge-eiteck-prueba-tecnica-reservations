import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { GetActorPermissionsUseCase } from '../../../domain/use-cases/auth/get-actor-permissions.use-case';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly getPermissions: GetActorPermissionsUseCase,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    // Sin permisos declarados no hace falta consultar la DB.
    if (!required || required.length === 0) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('No autenticado');

    const granted = await this.getPermissions.execute(user.roleId);
    const allowed = required.every((permission) => granted.includes(permission));
    if (!allowed) {
      throw new ForbiddenException(
        `Permiso requerido: ${required.join(' | ')}`,
      );
    }
    return true;
  }
}
