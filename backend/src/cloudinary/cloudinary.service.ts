import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import type { Env } from '../config/env';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(config: ConfigService<Env, true>) {
    this.cloudName = config.get('CLOUDINARY_CLOUD_NAME', { infer: true });
    this.apiKey = config.get('CLOUDINARY_API_KEY', { infer: true });
    this.apiSecret = config.get('CLOUDINARY_API_SECRET', { infer: true });
    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
    });
  }

  createUploadSignature(userId: string, extension: string) {
    const publicId = `documind/${userId}/${randomUUID()}.${extension}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { public_id: publicId, timestamp },
      this.apiSecret,
    );
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/raw/upload`,
      apiKey: this.apiKey,
      timestamp,
      signature,
      publicId,
    };
  }

  buildUrl(publicId: string): string {
    return cloudinary.url(publicId, { resource_type: 'raw', secure: true });
  }

  async download(publicId: string, maxBytes: number): Promise<Buffer> {
    const res = await fetch(this.buildUrl(publicId));

    if (!res.ok) {
      if (res.status === 404) {
        throw new BadRequestException(
          'File was not found in storage. Upload it first.',
        );
      }
      if (res.status === 401 || res.status === 403) {
        throw new BadRequestException(
          'Storage refused to deliver the file. For PDFs, enable "PDF and ZIP files delivery" in Cloudinary (Settings → Security).',
        );
      }
      throw new BadRequestException('Could not read the uploaded file.');
    }

    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > maxBytes) {
      throw new BadRequestException('File must be 5 MB or smaller');
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > maxBytes) {
      throw new BadRequestException('File must be 5 MB or smaller');
    }
    return buffer;
  }

  async delete(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw',
        invalidate: true,
      });
    } catch (err) {
      this.logger.warn(
        `Could not delete ${publicId} from Cloudinary: ${String(err)}`,
      );
    }
  }
}
