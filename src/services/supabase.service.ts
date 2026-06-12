import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';

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
      this.supabase = createClient(url, key, {
        auth: {
          persistSession: false,
        },
        realtime: {
          transport: WebSocket as any,
        },
      });
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

  async uploadFile(
    file: Express.Multer.File,
    identifier?: string,
    folderName = 'documents',
  ): Promise<{ url: string; fileName: string; mimeType: string; fileSize: number }> {
    if (!this.supabase) {
      throw new BadRequestException(
        'Supabase chưa được cấu hình hoặc thông tin cấu hình không hợp lệ trong file .env',
      );
    }

    const allowedMimeTypes = [
      'application/pdf',
    ];
    const isImage = file.mimetype.startsWith('image/');

    if (!allowedMimeTypes.includes(file.mimetype) && !isImage) {
      throw new BadRequestException(
        'Định dạng file không hỗ trợ. Chỉ cho phép file PDF hoặc hình ảnh.',
      );
    }

    const fileExt = file.originalname.split('.').pop() || '';
    const randomStr = Math.random().toString(36).substring(2, 9);
    
    // Nếu có identifier (ví dụ taxCode), lưu vào thư mục con của nó
    const targetFolder = identifier ? `${folderName}/${identifier}` : folderName;
    const fileName = `${targetFolder}/doc-${Date.now()}-${randomStr}.${fileExt}`;

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

    return {
      url: publicUrlData.publicUrl,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    if (!this.supabase) {
      throw new BadRequestException(
        'Supabase chưa được cấu hình hoặc thông tin cấu hình không hợp lệ trong file .env',
      );
    }

    let pathInBucket = filePath;
    if (filePath.startsWith('http')) {
      const parts = filePath.split(`/${this.bucketName}/`);
      if (parts.length > 1) {
        pathInBucket = decodeURIComponent(parts[1]);
      }
    }

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove([pathInBucket]);

    if (error) {
      throw new BadRequestException(
        `Xóa file trên Supabase Storage thất bại: ${error.message}`,
      );
    }
  }
}

