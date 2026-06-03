import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Antigravity Auth NestJS Backend is healthy!';
  }
}
