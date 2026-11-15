import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { DocumentsModule } from '../documents/documents.module';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';

@Module({
  imports: [DocumentsModule, CloudinaryModule],
  controllers: [VersionsController],
  providers: [VersionsService],
})
export class VersionsModule {}
