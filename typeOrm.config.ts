import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { ConfigService } from '@nestjs/config';
// process.cwd() instead of __dirname: typeorm-ts-node-commonjs sometimes
// loads this file in an ES module context (Node 24 + this TypeORM CLI
// combination), where __dirname is undefined and migration:run fails with
// "Unable to open file" before ever reaching Postgres. cwd is always the
// repo root here (npm scripts run from there locally; the Docker image's
// WORKDIR is /app), so it's an equivalent, module-system-agnostic base path.
config();
const configService = new ConfigService();
export default new DataSource({
    type: 'postgres',
    host: configService.getOrThrow('DB_HOST'),
    port: configService.getOrThrow('DB_PORT'),
    username: configService.getOrThrow('DB_USER'),
    password: configService.getOrThrow('DB_PASSWORD'),
    database: configService.getOrThrow('DB_SCHEMA'),
    entities: [process.cwd() + '/**/*.entity.{ts,js}'],
    migrations: [process.cwd() + '/migrations/**/*{.ts,.js}']
})
