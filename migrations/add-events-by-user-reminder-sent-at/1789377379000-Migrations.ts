import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1789377379000 implements MigrationInterface {
    name = 'Migrations1789377379000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "eventsByUser" ADD "reminderSentAt" timestamp`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "eventsByUser" DROP COLUMN "reminderSentAt"`);
    }

}
