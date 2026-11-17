import { Module } from '@nestjs/common';
import { ConverterModule } from '../converter/converter.module';
import { TrashModule } from '../trash/trash.module';
import { CronController } from './cron.controller';

@Module({
  imports: [TrashModule, ConverterModule],
  controllers: [CronController],
})
export class CronModule {}
