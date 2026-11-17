import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { DocumentsModule } from '../documents/documents.module';
import { ConverterController } from './converter.controller';
import { ConverterService } from './converter.service';

@Module({
  imports: [CloudinaryModule, DocumentsModule],
  controllers: [ConverterController],
  providers: [ConverterService],
  exports: [ConverterService],
})
export class ConverterModule {}
