import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { join } from 'path';
import { CatsModule } from './cats/cats.module';
import { PrismaService } from './prisma.service';
import { PostResolver } from './post/post.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver, // v10から必須に
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: false, // モジュールで定義されている並び
    }),
    CatsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, PostResolver], // PrismaServiceを追加?
})
export class AppModule {}
