import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // in the "bootstrap" function
  const app = await NestFactory.create(AppModule, {
    rawBody: true, //enable raw body comme to express js
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, //filtrer tous les donnée qui nous interesse
      transform: true,
    }),
  );
  await app.listen(8000);
}
bootstrap();
