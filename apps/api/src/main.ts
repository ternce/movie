import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as path from 'path';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SanitizePipe } from './common/pipes/sanitize.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust nginx reverse proxy so @Ip() reads X-Forwarded-For instead of Docker internal IP
  app.set('trust proxy', true);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());

  // CORS
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  const origins = corsOrigins.split(',').map(o => o.trim());
  if (origins.includes('*') && configService.get('NODE_ENV') === 'production') {
    throw new Error('Wildcard CORS origins are not allowed in production');
  }
  app.enableCors({
    origin: origins,
    credentials: true,
  });

  // Serve uploaded files (images, videos)
  const uploadDir = configService.get<string>('UPLOAD_DIR', './uploads');
  app.useStaticAssets(path.resolve(uploadDir), { prefix: '/uploads/' });

  // API versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global pipes (SanitizePipe runs first to strip HTML/XSS before validation)
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger documentation
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('MoviePlatform API')
      .setDescription('Video streaming platform API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('content', 'Content management')
      .addTag('subscriptions', 'Subscription management')
      .addTag('payments', 'Payment processing')
      .addTag('partners', 'Partner program')
      .addTag('bonuses', 'Bonus system')
      .addTag('store', 'Store and orders')
      .addTag('notifications', 'Notifications')
      .addTag('documents', 'Legal documents')
      .addTag('admin', 'Admin panel')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Start server
  const port = configService.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
