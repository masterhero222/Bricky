import { OmitType } from '@nestjs/mapped-types';
import { RegisterUserDto } from './register-user.dto';

export class CompatibleRegisterUserDto extends OmitType(RegisterUserDto, [
  'role',
] as const) {}
