import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

let server: express.Express;
async function bootstrap() {
  if (!server) {
    const expressApp = express();
    const nestApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );

    nestApp.enableCors();

    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await nestApp.init();
    server = expressApp;
  }
  return server;
}

export default async (req: express.Request, res: express.Response) => {
  const server = await bootstrap();
  server(req, res);
};
