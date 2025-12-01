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

    const header = req.headers.authorization || req.headers.Authorization;

    if (!header || typeof header !== 'string') {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const parts = header.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid Authorization format');
    }

    const token = parts[1];
    const secret = process.env.JWT_SECRET || 'supersecretkey';

    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
      return true;
    } catch (err) {
      console.error('JWT verify error:', err);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
