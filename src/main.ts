import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { CorsMiddleware } from './common/middlewares/cors.middlewares';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap () {
    const app = await NestFactory.create(AppModule);
    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.GRPC,
        options: {
            package: 'livekit',
            protoPath: join(process.cwd(), "proto/live-kit.proto"),
            url: app.get(ConfigService).get('LIVE_KIT_SERVER')
        },
    })
    const isProduction = app.get(ConfigService).get('MODE') === 'PROD';
    app.use(new CorsMiddleware().use);
    app.setGlobalPrefix('/api/v' + app.get(ConfigService).get('API_VERSION')); // Setting base path
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalInterceptors(new TimeoutInterceptor());

    if (!isProduction) {
        const options = new DocumentBuilder()
            .setTitle('Tslen API Documentation')
            .setVersion('1.0')
            .build();
        const document = SwaggerModule.createDocument(app, options);
        SwaggerModule.setup('/api', app, document);
    }
    await app.startAllMicroservices();
    await app.listen(app.get(ConfigService).get('APP_PORT'));
}
bootstrap();
