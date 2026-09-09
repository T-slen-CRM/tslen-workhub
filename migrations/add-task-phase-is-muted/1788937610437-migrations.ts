import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1788937610437 implements MigrationInterface {
    name = 'Migrations1788937610437'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "taskPhase" ADD "isMuted" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "taskPhase" DROP COLUMN "isMuted"`);
    }

}
