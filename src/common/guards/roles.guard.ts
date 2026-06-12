import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";


@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
    ) { }

    canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.getAllAndOverride<string[]>(
            ROLES_KEY,
            [
                context.getHandler(),
                context.getClass(),
            ],
        );
        if (!roles) {
            return true;
        }
        const { user } = context.switchToHttp().getRequest();
        if (!user || !user.role || !roles.includes(user.role.code)) {
            throw new ForbiddenException("Bạn không có quyền truy cập chức năng này");
        }

        return true;
    }
}
