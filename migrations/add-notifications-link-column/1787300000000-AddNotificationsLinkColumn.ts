import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsLinkColumn1787300000000 implements MigrationInterface {
    name = 'AddNotificationsLinkColumn1787300000000'

    public async up (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD "link" varchar(500)`);
    }

    public async down (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "link"`);
    }
}
