import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PrismaService } from 'src/prisma.service';
import { Post } from './model/post.model';

@Resolver()
export class PostResolver {
  constructor(private prisma: PrismaService) {} // prisma初期化

  // post一覧の取得
  @Query(() => [Post])
  async posts() {
    return this.prisma.post.findMany();
  }

  // postの作成
  @Mutation(() => Post)
  // この場合、titleとbodyを指定しないとcreateできない。
  // titleとbody以外の指定があってもダメ
  async createPost(@Args('title') title: string, @Args('body') body: string) {
    return this.prisma.post.create({ data: { title, body } });
  }
}
