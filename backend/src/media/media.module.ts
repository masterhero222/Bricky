import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAssetEntity } from './media-asset.entity';
import { MediaService } from './media.service';

@Module({
  imports: [TypeOrmModule.forFeature([MediaAssetEntity])],
  providers: [MediaService],
  exports: [MediaService, TypeOrmModule],
})
export class MediaModule {}
