import { Controller, Get } from '@nestjs/common';

@Controller('test-env')
export class TestEnvController {
  @Get()
  getEnv() {
    return { secret: process.env.JWT_SECRET };
  }
}
