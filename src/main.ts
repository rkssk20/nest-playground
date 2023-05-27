import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT) || 3000; // Cloud Runでは自動でPORTが決まる
  app.useGlobalPipes(new ValidationPipe()); // validationする
  await app.listen(port);
}
bootstrap();
