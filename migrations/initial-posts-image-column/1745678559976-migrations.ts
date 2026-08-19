import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1745678559976 implements MigrationInterface {
    name = 'Migrations1745678559976'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "image"`);
        await queryRunner.query(`ALTER TABLE "posts" ADD "image" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "image"`);
        await queryRunner.query(`ALTER TABLE "posts" ADD "image" character varying(250)`);
    }

}
