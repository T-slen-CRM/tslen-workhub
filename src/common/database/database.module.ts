import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
                type: 'postgres',
                // host: configService.getOrThrow('DB_HOST'),
                // port: configService.getOrThrow('DB_PORT'),
                // username: configService.getOrThrow('DB_USER'),
                // password: configService.getOrThrow('DB_PASSWORD'),
                // database: configService.getOrThrow('DB_SCHEMA'),
                // url: 'postgres://user:password@host:port/db?sslmode=require'
                url:`postgres://${configService.getOrThrow('DB_USER')}:${configService.getOrThrow('DB_PASSWORD')}@${configService.getOrThrow('DB_HOST')}/${configService.getOrThrow('DB_SCHEMA')}`,
                autoLoadEntities: true,
                synchronize: configService.get('MODE') === 'DEV',
                // logging: true,
                // ssl: {
                //     rejectUnauthorized: false,
                // },
                // extra: {
                //     ssl: {
                //         rejectUnauthorized: false,
                //     },
                // }
            }),
            inject: [ConfigService],
        }),
    ],
})
export class DatabaseModule {}