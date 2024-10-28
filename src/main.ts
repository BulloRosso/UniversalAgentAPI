// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { Logger } from '@nestjs/common';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });

  // WebSocket setup
  app.useWebSocketAdapter(new WsAdapter(app));

  // Apply global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // CORS setup
  app.enableCors({
    origin: 'https://3ab8a01e-8805-433c-922d-ada11e3795b3-00-wkkibyqnwmao.picard.replit.dev',
    methods: ['GET', 'POST'],
    allowedHeaders: ['content-type'],
  });

  // Configure to listen on 0.0.0.0 for Replit
  const port = process.env.PORT || 3000;
  const host = '0.0.0.0'; // This is important for Replit

  await app.listen(port, host);

  const serverUrl = await app.getUrl();
  logger.log(`Server running on: ${serverUrl}`);
  logger.log(`HTTP endpoint available at: ${serverUrl}/api/lecture/OCR-101`);
  logger.log(`WebSocket endpoint available at: ws://${host}:${port}/socket`);
}

bootstrap().catch(err => {
  console.error('Failed to start application:', err);
  process.exit(1);
});