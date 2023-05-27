# Nest.js + Prisma(GraphQL) on Cloud Run, PlanetScale
もしこの技術選定で作るなら

## 必要なもの

```bash
Nest.jsでGraphQLを使うために必要
npm install @nestjs/graphql @nestjs/apollo @apollo/server graphql

Prismaに必要
npm install prisma @prisma/client
```

<details>
<summary>Prisma + PlanetScale</summary>  

## 1. Prismaで設計しPlanetScaleへpush

```bash
npx prisma init
```

- .envとprisma/schema.prismaが生成される
  - .envのDATABASE_URLをplanetscaleのURLにする
    - **`DATABASE_URL="mysql://root@127.0.0.1:3309/[DB名]"`**
  - schema.prismaにmodelを書いていく

```bash
pscale db create [DB名] --region [リージョン名]
```
- AWSのTokyoリージョンならap-northeast。
  - Googleはベータ版

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

## 2. 開発用のブランチを切り、継続的にpush

> planetscaleではprisma migrateではなく、下記の方法を推奨

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
- 数字はリクエストした時に生成されたもの

```bash
npx prisma generate
```

- 変更されたスキーマを@prisma/clientに反映する
</details>

<details>
<summary>Nest.js + Prisma</summary>  

## Nest.jsでprismaを使う

```tsx
import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
```
- お決まりのファイルを作成(公式ドキュメント参照)

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
~~~

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

~~~
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
</details>

<details>
<summary>Nest.js on Cloud Run</summary>  

## 1. 必要なファイルを作成

- .dockerignoreと.gcloudignoreを作成
  - [Node.js on Cloud Runのテンプレート](https://github.com/GoogleCloudPlatform/cloud-run-microservice-template-nodejs)にサンプルがある

```
# ビルド環境
## 軽量版もいいけど動作が保証できない
FROM node:18.16.0 AS builder
## 作業ディレクトリを/appにする
WORKDIR /app
## package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./
## prisma に必要
COPY prisma ./prisma/
## npm ciはpackage-lock.jsonの更新を行わないので、本番はこれでいい
## --only=procductionをつけないので、devDependenciesの@nest/cliもインストールする
## キャッシュクリアする
RUN npm ci && npm cache clean --force
COPY . .
## prismaを反映?する
RUN npx prisma generate
## バンドルファイル作成
## @nest/cliがあるのでnpm run buildが実行できる
RUN npm run build

# 実行環境
## 軽量版もいいけど動作が保証できない
FROM node:18.16.0 AS production
## production環境に設定
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
## rootユーザーだとなんでもできてしまうので、nodeに変更
USER node
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
## devDependenciesが必要なものはbuilder環境で行っているため、--only=productionでdependenciesのみインストール
RUN npm ci --only=production
## builder環境のnpm run buildの結果をnodeの権限でコピー
COPY --chown=node:node --from=builder /app/dist ./dist
## Cloud Runにおいて明示的に3000を使用する
EXPOSE 3000
CMD ["node", "dist/main.js" ]
```
- Dockerfileを作成
- 改善点は色々ありそう

ローカルで動作確認する場合は、
```bach
docker build -t [イメージ名] .
docker run -e DATABASE_URL="[PlanetScaleのURL]" -p 3000:3000 [イメージ名]
```
- PlanetScaleのURLはDBのページのConnectから取得する
- コマンドの最後にに:などがあると動作しないので、-eと-pの後にイメージ名を指定する
- http:localhost:3000/graphqlにアクセスしても、CORSエラーでGraphQLのエディタは開けない
  - それ以外のエンドポイントで動作確認できる

</details>
