import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeArticle, KnowledgeRubric } from './knowledge.entity';
import { KnowledgeController, KnowledgeAdminController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeAdminGuard } from './knowledge-admin.guard';
import { UserEntity } from '../users/user.entity';
import { RepairCategoryEntity } from '../catalog/repair-category.entity';
import { AdminAuditLogEntity } from '../admin/admin-audit-log.entity';

@Module({ imports: [TypeOrmModule.forFeature([KnowledgeArticle, KnowledgeRubric, UserEntity, RepairCategoryEntity, AdminAuditLogEntity])], controllers: [KnowledgeController, KnowledgeAdminController], providers: [KnowledgeService, KnowledgeAdminGuard] })
export class KnowledgeModule {}
