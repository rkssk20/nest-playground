import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Post } from './model/post.model';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.input';
import { UniquePostDto } from './dto/unique-post.input';

@Resolver()
export class PostResolver {
  constructor(private postService: PostService) {}

  // post一覧の取得
  @Query(() => [Post], { nullable: true })
  async posts() {
    return this.postService.findMany();
  }

  // idに一致するpostを取得
  @Query(() => Post, { nullable: true }) // idが一致しない場合のnullを許容する
  async post(@Args('uniquePostDto') uniquePostDto: UniquePostDto) {
    return this.postService.unique(uniquePostDto.id);
  }

  // postの作成
  @Mutation(() => Post)
  // この場合、userId, title, bodyを指定しないとcreateできない。
  // それ以外の指定があってもダメ
  async createPost(@Args('createPostDto') createPostDto: CreatePostDto) {
    const { userId, title, body } = createPostDto;
    return this.postService.create(userId, title, body);
  }
}
