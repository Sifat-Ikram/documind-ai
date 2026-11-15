import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { TrashController } from './trash.controller';
import { TrashService } from './trash.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [TrashController],
  providers: [TrashService],
  exports: [TrashService],
})
export class TrashModule {}
