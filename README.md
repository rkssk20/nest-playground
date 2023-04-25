# Nest.js(GraphQL) + Prisma + PlanetScaleのテンプレート

以下の手順に従い、Nest.jsでGraphQLサーバーを構築し、PlanetScaleと接続したもの
## 必要なもの

```bash
// Nest.jsでGraphQLを使うために必要
npm i @nestjs/graphql @nestjs/apollo @apollo/server graphql

// Prismに必要
npm install prisma @prisma/client
```

## schema.prismaを作成してPlanetScaleにpush

```bash
npx prisma init
```

- これでprisma/schema.prismaが生成されるので、modelを書いていく
- .envのDATABASE_URLをplanetscaleのURLにする
    - **`DATABASE_URL="mysql://root@127.0.0.1:3309/[DB名]"`**

```bash
pscale db create [DB名] --region ap-northeast
```

- ap-northeastはAWSのTokyoリージョン。(Googleはベータ版)

```bash
pscale connect [DB名] main --port 3309
```

- 接続

```bash
// 別のターミナルで、
npx prisma db push
```

- schemaをpush

```bash
pscale branch promote [DB名] main
pscale branch safe-migrations enable [DB名] main
```

- 初期スキーマが追加されたので、mainブランチを運用ステータスに昇格
    - 本番用になり、削除できなくなるなど保護される

## 開発用のブランチを切り、継続的にpush

(planetscaleではprisma migrateではなく、下記の方法を推奨)

```bash
pscale branch create [DB名] [ブランチ名]
```

- mainブランチとは別に新しいブランチを作成する

```bash
// mainブランチとの接続を切り、作成したブランチに接続する
// (ブランチを作成してから接続できるまで時間がかかる)
pscale connect [DB名] [ブランチ名] --port 3309
```

- mainブランチとの接続を切り、作成したブランチに接続する
    
    ※ ブランチを作成してから接続できるまで時間がかかる
    

```bash
npx prisma db push
```

- 変更をpush

```bash
pscale deploy-request create [DB名] [ブランチ名]
```

- デプロイリクエストを作成

```bash
pscale deploy-request deploy [DB名] [数字？]
```

- デプロイする
- 数字のところはリクエストした時に生成された数字っぽい

```bash
prisma generate
```

- 変更されたスキーマを@prisma/clientに反映する

## Nest.jsでprismaを使う

```tsx
// post.model.ts
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Post {
  @Field(() => ID)
  id: string;

	@Field()
	createdAt: Date;

	...
```

- post/mode/post.model.tsの作成
    - schemaがPostで@@map(”posts”)の場合、classやファイル名はpost？posts？
- 型はgraphqlっぽくて独特
- @map(”created_at”)としていても、createdAtで定義しないと取得できない

```bash
next g resolver post
```

- resolverを作成

```tsx
// post.resolver.ts
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
  async createPost(@Args('title') title: string, @Args('body') body: string) {
    return this.prisma.post.create({ data: { title, body } });
  }
}
```

- PrismaServiceを初期化
- graphqlのデコレータquery, mutationを使う

```tsx
// app.module.ts
...

	@Module({
	  imports: [
	    GraphQLModule.forRoot<ApolloDriverConfig>({
	      driver: ApolloDriver, // v10から必須に
	      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
	      sortSchema: true, // モジュールで定義されている並び
	    }),
	    CatsModule,
	  ],
	  controllers: [...],
	  providers: [AppService, PrismaService, ...], // PrismaServiceを追加?
	})

...
```

- Graphqlを使うために必要なものをimport
- providersにPrismaServiceを追加する必要がある？
    - 公式ドキュメントとは少し違う
    - 多くの記事では追加されている
    

```bash
npm run start:dev
```

- コードをもとにschema.gqlが生成される
    - コードを変更すればschema.gqlも変わる
    - 手動では変更しない