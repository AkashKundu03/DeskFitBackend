import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Bind to 0.0.0.0 so the API is reachable inside Docker / from the LAN,
  // not just loopback. Port comes from the environment (defaults to 3000).
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
