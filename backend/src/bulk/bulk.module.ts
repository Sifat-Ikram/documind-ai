import { Module } from '@nestjs/common';
import { TagsModule } from '../tags/tags.module';
import { TrashModule } from '../trash/trash.module';
import { BulkController } from './bulk.controller';
import { BulkService } from './bulk.service';

@Module({
  imports: [TrashModule, TagsModule],
  controllers: [BulkController],
  providers: [BulkService],
})
export class BulkModule {}
