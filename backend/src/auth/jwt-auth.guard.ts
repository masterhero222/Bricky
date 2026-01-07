import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;

    if (!auth) throw new UnauthorizedException('Missing token');

    const [type, token] = auth.split(' ');
    if (type !== 'Bearer') throw new UnauthorizedException('Invalid token format');

    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
