import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient | null = null;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      this.configService.get<string>('SUPABASE_ANON_KEY');
    this.bucketName =
      this.configService.get<string>('SUPABASE_BUCKET_NAME') || 'avatars';

    if (url && key && url !== 'https://your-supabase-project.supabase.co') {
      this.supabase = createClient(url, key);
    }
  }

  async uploadAvatar(file: Express.Multer.File): Promise<string> {
    if (!this.supabase) {
      throw new BadRequestException(
        'Supabase chưa được cấu hình hoặc thông tin cấu hình không hợp lệ trong file .env',
      );
    }

    const fileExt = file.originalname.split('.').pop() || 'png';
    const randomStr = Math.random().toString(36).substring(2, 9);
    const fileName = `avatars/avatar-${Date.now()}-${randomStr}.${fileExt}`;

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new BadRequestException(
        `Tải file lên Supabase Storage thất bại: ${error.message}`,
      );
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  }
}
