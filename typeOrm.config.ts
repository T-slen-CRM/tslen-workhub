import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { ConfigService } from '@nestjs/config';
config();
const configService = new ConfigService();
export default new DataSource({
    type: 'postgres',
    host: configService.getOrThrow('DB_HOST'),
    port: configService.getOrThrow('DB_PORT'),
    username: configService.getOrThrow('DB_USER'),
    password: configService.getOrThrow('DB_PASSWORD'),
    database: configService.getOrThrow('DB_SCHEMA'),
    entities: [__dirname + '/**/*.entity.{ts,js}'],
    migrations: [__dirname + '/migrations/**/*{.ts,.js}']
    // entities: [__dirname + '/**/**/**/*.entity{.ts,.js}'], // or [User, Post]
    // migrations: [__dirname + '/migrations/*{.ts,.js}'],
})
