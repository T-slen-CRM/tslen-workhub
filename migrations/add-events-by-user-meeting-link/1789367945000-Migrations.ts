import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1789367945000 implements MigrationInterface {
    name = 'Migrations1789367945000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "eventsByUser" ADD "meetingLinkId" integer`);
        await queryRunner.query(`CREATE INDEX "eventsByUser_meetingLinkId_fk" ON "eventsByUser" ("meetingLinkId") `);
        await queryRunner.query(`ALTER TABLE "eventsByUser" ADD CONSTRAINT "FK_eventsByUser_meetingLinkId" FOREIGN KEY ("meetingLinkId") REFERENCES "meetingLinks"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "eventsByUser" DROP CONSTRAINT "FK_eventsByUser_meetingLinkId"`);
        await queryRunner.query(`DROP INDEX "public"."eventsByUser_meetingLinkId_fk"`);
        await queryRunner.query(`ALTER TABLE "eventsByUser" DROP COLUMN "meetingLinkId"`);
    }

}
