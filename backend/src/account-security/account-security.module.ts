import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountTokenEntity } from './account-token.entity';
import { EmailDeliveryLogEntity } from './email-delivery-log.entity';
import { AccountSecurityService } from './account-security.service';

@Module({
  imports: [TypeOrmModule.forFeature([AccountTokenEntity, EmailDeliveryLogEntity])],
  providers: [AccountSecurityService],
  exports: [AccountSecurityService, TypeOrmModule],
})
export class AccountSecurityModule {}
