import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {} // prisma初期化

  findMany() {
    return this.prisma.post.findMany();
  }

  unique(id: string) {
    return this.prisma.post.findUnique({ where: { id } });
  }

  create(userId: string, title: string, body: string) {
    return this.prisma.post.create({ data: { userId, title, body } });
  }
}
