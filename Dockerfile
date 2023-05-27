# ビルド環境
FROM node:18.16.0-alpine3.17 AS builder
WORKDIR /app
COPY package*.json ./
## prisma に必要
COPY prisma ./prisma/
## devDependenciesの@nest/cliもインストール キャッシュクリア
RUN npm ci && npm cache clean --force
COPY . .
RUN npx prisma generate
## @nest/cliがあるのでnpm run buildできる
RUN npm run build

# 実行環境
FROM node:18.16.0 AS production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
USER node
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
## production環境ではdevDependencies以外をインストール
RUN npm ci --only=production
COPY --chown=node:node --from=builder /app/dist ./dist
## Cloud Runにおいて明示的に3000を使用する
EXPOSE 3000
CMD ["node", "dist/main.js" ]
