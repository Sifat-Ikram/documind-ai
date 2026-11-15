import { Module } from '@nestjs/common';
import { TrashModule } from '../trash/trash.module';
import { CronController } from './cron.controller';

@Module({
  imports: [TrashModule],
  controllers: [CronController],
})
export class CronModule {}
